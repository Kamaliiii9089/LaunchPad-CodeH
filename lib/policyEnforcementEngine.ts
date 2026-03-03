import { connectDB } from './mongodb';
import Policy, { IPolicy, IPolicyEnforcement } from '../models/Policy';
import PolicyVersion, { IPolicyVersion } from '../models/PolicyVersion';
import PolicyAcknowledgment, { IPolicyAcknowledgment } from '../models/PolicyAcknowledgment';
import PolicyTemplate from '../models/PolicyTemplate';

export class PolicyEnforcementEngine {
  /**
   * Check if a user action complies with active policies
   */
  static async checkCompliance(
    userId: string,
    action: string,
    context: Record<string, any>
  ): Promise<{
    allowed: boolean;
    violations: { policyId: string; policyTitle: string; rule: string; severity: string }[];
    warnings: string[];
  }> {
    await connectDB();

    const violations: { policyId: string; policyTitle: string; rule: string; severity: string }[] = [];
    const warnings: string[] = [];

    // Get all active policies
    const activePolicies = await Policy.find({ status: 'active' });

    for (const policy of activePolicies) {
      // Check if policy applies to user's role
      if (policy.applicableRoles.length > 0) {
        const userRole = context.userRole || 'user';
        if (!policy.applicableRoles.includes(userRole)) {
          continue; // Skip this policy
        }
      }

      // Check if user is exempt
      if (policy.exemptRoles.length > 0) {
        const userRole = context.userRole || 'user';
        if (policy.exemptRoles.includes(userRole)) {
          continue; // User is exempt
        }
      }

      // Check enforcement rules
      for (const rule of policy.enforcementRules) {
        if (this.matchesTrigger(rule, action, context)) {
          const conditionMet = this.evaluateConditions(rule.conditions, context);

          if (conditionMet) {
            if (rule.severity === 'block') {
              violations.push({
                policyId: policy._id.toString(),
                policyTitle: policy.title,
                rule: rule.action,
                severity: rule.severity,
              });
            } else if (rule.severity === 'warn') {
              warnings.push(`Policy "${policy.title}": ${rule.action}`);
            }

            // Log the enforcement
            await this.logEnforcement(policy._id.toString(), userId, action, rule.severity, conditionMet);

            // Increment violation count if blocked
            if (rule.severity === 'block') {
              await Policy.findByIdAndUpdate(policy._id, {
                $inc: { violationCount: 1 },
              });
            }
          }
        }
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Check if an enforcement rule trigger matches the action
   */
  private static matchesTrigger(
    rule: IPolicyEnforcement,
    action: string,
    context: Record<string, any>
  ): boolean {
    // Support wildcard matching
    const triggerPattern = rule.trigger.replace(/\*/g, '.*');
    const regex = new RegExp(`^${triggerPattern}$`);
    return regex.test(action);
  }

  /**
   * Evaluate policy conditions
   */
  private static evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (key === '$and') {
        // All conditions must match
        return (value as any[]).every((cond) => this.evaluateConditions(cond, context));
      } else if (key === '$or') {
        // At least one condition must match
        return (value as any[]).some((cond) => this.evaluateConditions(cond, context));
      } else if (key === '$not') {
        // Condition must not match
        return !this.evaluateConditions(value, context);
      } else {
        // Simple equality check
        if (context[key] !== value) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Log policy enforcement action
   */
  private static async logEnforcement(
    policyId: string,
    userId: string,
    action: string,
    severity: string,
    blocked: boolean
  ): Promise<void> {
    // In a real system, you'd log to a dedicated enforcement log collection
    console.log(`Policy Enforcement: ${policyId} - User: ${userId} - Action: ${action} - Severity: ${severity} - Blocked: ${blocked}`);
  }

  /**
   * Create a new policy version
   */
  static async createVersion(
    policyId: string,
    userId: string,
    changes: {
      title?: string;
      description?: string;
      sections?: any[];
      enforcementRules?: any[];
      changeType: 'major' | 'minor' | 'patch';
      changeSummary: string;
      changesDetail: { added: string[]; modified: string[]; removed: string[] };
      impactLevel: 'high' | 'medium' | 'low';
      requiresReacknowledgment: boolean;
    }
  ): Promise<IPolicyVersion> {
    await connectDB();

    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    const newVersion = policy.version + 1;

    // Create snapshot of current policy state
    const snapshot = {
      title: changes.title || policy.title,
      description: changes.description || policy.description,
      sections: changes.sections || policy.sections,
      enforcementRules: changes.enforcementRules || policy.enforcementRules,
      applicableRoles: policy.applicableRoles,
      requiresAcknowledgment: policy.requiresAcknowledgment,
    };

    // Create version record
    const policyVersion = await PolicyVersion.create({
      policyId: policy._id,
      version: newVersion,
      title: snapshot.title,
      description: snapshot.description,
      sections: snapshot.sections,
      enforcementRules: snapshot.enforcementRules,
      status: policy.status,
      changeType: changes.changeType,
      changeSummary: changes.changeSummary,
      changesDetail: changes.changesDetail,
      impactLevel: changes.impactLevel,
      requiresReacknowledgment: changes.requiresReacknowledgment,
      previousVersion: policy.version,
      snapshot,
      createdBy: userId,
    });

    // Update policy
    await Policy.findByIdAndUpdate(policyId, {
      version: newVersion,
      title: snapshot.title,
      description: snapshot.description,
      sections: snapshot.sections,
      enforcementRules: snapshot.enforcementRules,
      $push: {
        changeLog: {
          version: newVersion,
          changes: changes.changeSummary,
          changedBy: userId,
          changedAt: new Date(),
        },
      },
    });

    // If requires reacknowledgment, create new acknowledgment requests
    if (changes.requiresReacknowledgment) {
      await this.requestReacknowledgment(policyId, newVersion);
    }

    return policyVersion;
  }

  /**
   * Request policy acknowledgment from users
   */
  static async requestAcknowledgment(
    policyId: string,
    userIds: string[],
    expiresInDays?: number
  ): Promise<number> {
    await connectDB();

    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    if (!policy.requiresAcknowledgment) {
      return 0;
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : policy.acknowledgmentDeadline
      ? new Date(Date.now() + policy.acknowledgmentDeadline * 24 * 60 * 60 * 1000)
      : undefined;

    let count = 0;

    for (const userId of userIds) {
      // Check if acknowledgment already exists
      const existing = await PolicyAcknowledgment.findOne({
        policyId: policy._id,
        userId,
        policyVersion: policy.version,
      });

      if (!existing) {
        await PolicyAcknowledgment.create({
          policyId: policy._id,
          policyVersion: policy.version,
          userId,
          status: 'pending',
          expiresAt,
        });
        count++;
      }
    }

    return count;
  }

  /**
   * Request reacknowledgment for new policy version
   */
  static async requestReacknowledgment(
    policyId: string,
    newVersion: number
  ): Promise<number> {
    await connectDB();

    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    // Get all users who acknowledged previous version
    const previousAcknowledgments = await PolicyAcknowledgment.find({
      policyId: policy._id,
      policyVersion: newVersion - 1,
      status: 'acknowledged',
    });

    const userIds = previousAcknowledgments.map((ack) => ack.userId.toString());

    return await this.requestAcknowledgment(policyId, userIds);
  }

  /**
   * Record policy acknowledgment
   */
  static async acknowledge(
    acknowledgmentId: string,
    userId: string,
    data: {
      signature?: string;
      signatureMethod?: 'typed' | 'drawn' | 'certificate' | 'biometric';
      readTime?: number;
      scrollPercentage?: number;
      questionsAnswered?: { question: string; answer: string; correct: boolean }[];
      quizScore?: number;
      ipAddress?: string;
      userAgent?: string;
      deviceFingerprint?: string;
    }
  ): Promise<IPolicyAcknowledgment> {
    await connectDB();

    const acknowledgment = await PolicyAcknowledgment.findById(acknowledgmentId);
    if (!acknowledgment) {
      throw new Error('Acknowledgment not found');
    }

    if (acknowledgment.userId.toString() !== userId) {
      throw new Error('Unauthorized to acknowledge this policy');
    }

    if (acknowledgment.status !== 'pending') {
      throw new Error('Policy already acknowledged or expired');
    }

    // Update acknowledgment
    acknowledgment.status = 'acknowledged';
    acknowledgment.acknowledgedAt = new Date();
    acknowledgment.signature = data.signature;
    acknowledgment.signatureMethod = data.signatureMethod;
    acknowledgment.readTime = data.readTime;
    acknowledgment.scrollPercentage = data.scrollPercentage;
    acknowledgment.questionsAnswered = data.questionsAnswered;
    acknowledgment.quizScore = data.quizScore;
    acknowledgment.ipAddress = data.ipAddress;
    acknowledgment.userAgent = data.userAgent;
    acknowledgment.deviceFingerprint = data.deviceFingerprint;

    await acknowledgment.save();

    // Update policy acknowledgment rate
    await this.updateAcknowledgmentRate(acknowledgment.policyId.toString());

    return acknowledgment;
  }

  /**
   * Update policy acknowledgment rate
   */
  static async updateAcknowledgmentRate(policyId: string): Promise<void> {
    await connectDB();

    const total = await PolicyAcknowledgment.countDocuments({ policyId });
    const acknowledged = await PolicyAcknowledgment.countDocuments({
      policyId,
      status: 'acknowledged',
    });

    const rate = total > 0 ? (acknowledged / total) * 100 : 0;

    await Policy.findByIdAndUpdate(policyId, {
      acknowledgmentRate: Math.round(rate * 100) / 100,
    });
  }

  /**
   * Check user's pending policy acknowledgments
   */
  static async getPendingAcknowledgments(userId: string): Promise<IPolicyAcknowledgment[]> {
    await connectDB();

    return (await PolicyAcknowledgment.find({
      userId,
      status: 'pending',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    })
      .populate('policyId')
      .sort({ createdAt: -1 })) as IPolicyAcknowledgment[];
  }

  /**
   * Enforce policy on workflow
   */
  static async enforceOnWorkflow(
    workflowType: string,
    workflowData: Record<string, any>,
    userId: string,
    userRole: string
  ): Promise<{ allowed: boolean; blockedBy?: string[]; warnings?: string[] }> {
    const result = await this.checkCompliance(userId, `workflow:${workflowType}`, {
      ...workflowData,
      userRole,
    });

    if (!result.allowed) {
      return {
        allowed: false,
        blockedBy: result.violations.map((v) => v.policyTitle),
        warnings: result.warnings,
      };
    }

    return {
      allowed: true,
      warnings: result.warnings,
    };
  }

  /**
   * Calculate policy compliance score
   */
  static async calculateComplianceScore(policyId: string): Promise<number> {
    await connectDB();

    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    let score = 100;

    // Factor 1: Acknowledgment rate (50% weight)
    const acknowledgmentPenalty = (100 - policy.acknowledgmentRate) * 0.5;
    score -= acknowledgmentPenalty;

    // Factor 2: Violation count (30% weight)
    const violationPenalty = Math.min(policy.violationCount * 2, 30);
    score -= violationPenalty;

    // Factor 3: Overdue reviews (20% weight)
    if (policy.nextReviewDate && policy.nextReviewDate < new Date()) {
      const daysOverdue = Math.floor(
        (Date.now() - policy.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const reviewPenalty = Math.min(daysOverdue * 0.5, 20);
      score -= reviewPenalty;
    }

    score = Math.max(0, Math.min(100, score));

    // Update policy compliance score
    await Policy.findByIdAndUpdate(policyId, {
      complianceScore: Math.round(score * 100) / 100,
    });

    return score;
  }

  /**
   * Send reminder for pending acknowledgments
   */
  static async sendReminders(): Promise<number> {
    await connectDB();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pendingAcknowledgments = await PolicyAcknowledgment.find({
      status: 'pending',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    }).then((acks) => 
      acks.filter((ack) => 
        !ack.lastReminderAt || ack.lastReminderAt < sevenDaysAgo
      )
    );

    let count = 0;
    for (const ack of pendingAcknowledgments) {
      // In a real system, send email/notification here
      await PolicyAcknowledgment.findByIdAndUpdate(ack._id, {
        $inc: { remindersSent: 1 },
        lastReminderAt: new Date(),
      });
      count++;
    }

    return count;
  }

  /**
   * Expire overdue acknowledgments
   */
  static async expireOverdueAcknowledgments(): Promise<number> {
    await connectDB();

    const result = await PolicyAcknowledgment.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: 'expired' },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get policy statistics
   */
  static async getPolicyStats(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    draftPolicies: number;
    policiesNeedingReview: number;
    totalAcknowledgments: number;
    pendingAcknowledgments: number;
    averageComplianceScore: number;
    totalViolations: number;
  }> {
    await connectDB();

    const [
      totalPolicies,
      activePolicies,
      draftPolicies,
      policiesNeedingReview,
      totalAcknowledgments,
      pendingAcknowledgments,
      policies,
    ] = await Promise.all([
      Policy.countDocuments(),
      Policy.countDocuments({ status: 'active' }),
      Policy.countDocuments({ status: 'draft' }),
      Policy.countDocuments({
        nextReviewDate: { $lt: new Date() },
        status: 'active',
      }),
      PolicyAcknowledgment.countDocuments(),
      PolicyAcknowledgment.countDocuments({ status: 'pending' }),
      Policy.find({}, { complianceScore: 1, violationCount: 1 }),
    ]);

    const averageComplianceScore =
      policies.length > 0
        ? policies.reduce((sum, p) => sum + p.complianceScore, 0) / policies.length
        : 100;

    const totalViolations = policies.reduce((sum, p) => sum + p.violationCount, 0);

    return {
      totalPolicies,
      activePolicies,
      draftPolicies,
      policiesNeedingReview,
      totalAcknowledgments,
      pendingAcknowledgments,
      averageComplianceScore: Math.round(averageComplianceScore * 100) / 100,
      totalViolations,
    };
  }
}
