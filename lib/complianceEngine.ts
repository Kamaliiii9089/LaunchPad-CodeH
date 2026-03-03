import { connectDB } from './mongodb';
import ComplianceFramework, { IComplianceFramework } from '@/models/ComplianceFramework';
import ComplianceRequirement, { IComplianceRequirement } from '@/models/ComplianceRequirement';
import ComplianceControl, { IComplianceControl } from '@/models/ComplianceControl';
import ComplianceAuditLog, { IComplianceAuditLog } from '@/models/ComplianceAuditLog';
import ComplianceReport, { IComplianceReport } from '@/models/ComplianceReport';

export class ComplianceMonitoringEngine {
  
  /**
   * Calculate overall compliance score for a framework
   */
  async calculateFrameworkCompliance(frameworkId: string): Promise<{
    score: number;
    requirementsMet: number;
    requirementsPending: number;
    requirementsFailed: number;
    details: any;
  }> {
    await connectDB();
    
    const requirements = await ComplianceRequirement.find({
      frameworkId,
      isActive: true,
    });
    
    if (requirements.length === 0) {
      return {
        score: 0,
        requirementsMet: 0,
        requirementsPending: 0,
        requirementsFailed: 0,
        details: {},
      };
    }
    
    let totalScore = 0;
    let requirementsMet = 0;
    let requirementsPending = 0;
    let requirementsFailed = 0;
    
    for (const req of requirements) {
      totalScore += req.compliancePercentage;
      
      if (req.status === 'compliant') {
        requirementsMet++;
      } else if (req.status === 'in_progress' || req.status === 'partial') {
        requirementsPending++;
      } else if (req.status === 'non_compliant') {
        requirementsFailed++;
      }
    }
    
    const overallScore = Math.round(totalScore / requirements.length);
    
    // Update framework
    await ComplianceFramework.findByIdAndUpdate(frameworkId, {
      overallComplianceScore: overallScore,
      requirementsMet,
      requirementsPending,
      requirementsFailed,
      lastAssessmentDate: new Date(),
    });
    
    return {
      score: overallScore,
      requirementsMet,
      requirementsPending,
      requirementsFailed,
      details: {
        total: requirements.length,
        byCategory: await this.getComplianceByCategory(frameworkId),
      },
    };
  }
  
  /**
   * Get compliance breakdown by category
   */
  async getComplianceByCategory(frameworkId: string) {
    await connectDB();
    
    const requirements = await ComplianceRequirement.find({
      frameworkId,
      isActive: true,
    });
    
    const categories: any = {};
    
    for (const req of requirements) {
      if (!categories[req.category]) {
        categories[req.category] = {
          total: 0,
          compliant: 0,
          pending: 0,
          failed: 0,
          score: 0,
        };
      }
      
      categories[req.category].total++;
      categories[req.category].score += req.compliancePercentage;
      
      if (req.status === 'compliant') {
        categories[req.category].compliant++;
      } else if (req.status === 'in_progress' || req.status === 'partial') {
        categories[req.category].pending++;
      } else if (req.status === 'non_compliant') {
        categories[req.category].failed++;
      }
    }
    
    // Calculate average score for each category
    Object.keys(categories).forEach(cat => {
      categories[cat].averageScore = Math.round(
        categories[cat].score / categories[cat].total
      );
    });
    
    return categories;
  }
  
  /**
   * Assess a specific requirement
   */
  async assessRequirement(
    requirementId: string,
    assessor: { userId: string; email: string; role: string },
    assessment: {
      status: 'compliant' | 'partial' | 'non_compliant';
      compliancePercentage: number;
      findings: string;
      recommendations: string[];
      evidence?: any[];
    },
    ipAddress: string,
    userAgent: string
  ): Promise<IComplianceRequirement> {
    await connectDB();
    
    const requirement = await ComplianceRequirement.findById(requirementId);
    if (!requirement) {
      throw new Error('Requirement not found');
    }
    
    // Add to compliance history
    requirement.complianceHistory.push({
      date: new Date(),
      status: assessment.status,
      score: assessment.compliancePercentage,
      assessor: assessor.userId as any,
      findings: assessment.findings,
      recommendations: assessment.recommendations,
    });
    
    // Update current status
    requirement.status = assessment.status;
    requirement.compliancePercentage = assessment.compliancePercentage;
    requirement.lastAssessmentDate = new Date();
    
    // Add evidence if provided
    if (assessment.evidence) {
      requirement.evidence.push(...assessment.evidence);
    }
    
    await requirement.save();
    
    // Log the assessment
    await this.logAuditEvent({
      eventType: 'assessment',
      action: `Assessed requirement ${requirement.requirementId}`,
      description: `Status: ${assessment.status}, Score: ${assessment.compliancePercentage}%`,
      userId: assessor.userId as any,
      userEmail: assessor.email,
      userRole: assessor.role,
      ipAddress,
      userAgent,
      frameworkId: requirement.frameworkId as any,
      requirementId: requirementId as any,
      complianceImpact: {
        affected: true,
        impactLevel: assessment.status === 'non_compliant' ? 'high' : 'medium',
        requirementsAffected: [requirement.requirementId],
      },
      status: 'success',
    });
    
    // Recalculate framework compliance
    await this.calculateFrameworkCompliance(requirement.frameworkId.toString());
    
    return requirement;
  }
  
  /**
   * Test a control's effectiveness
   */
  async testControl(
    controlId: string,
    tester: { userId: string; email: string; role: string },
    testResult: {
      result: 'passed' | 'failed' | 'partial';
      findings: string;
      evidence: string[];
      recommendations: string[];
    },
    ipAddress: string,
    userAgent: string
  ): Promise<IComplianceControl> {
    await connectDB();
    
    const control = await ComplianceControl.findById(controlId);
    if (!control) {
      throw new Error('Control not found');
    }
    
    // Add test result
    control.testResults.push({
      date: new Date(),
      tester: tester.userId as any,
      result: testResult.result,
      findings: testResult.findings,
      evidence: testResult.evidence,
      recommendations: testResult.recommendations,
    });
    
    // Update effectiveness
    control.lastTestDate = new Date();
    if (testResult.result === 'passed') {
      control.effectiveness = 'effective';
      control.effectivenessScore = 100;
    } else if (testResult.result === 'partial') {
      control.effectiveness = 'partially_effective';
      control.effectivenessScore = 60;
    } else {
      control.effectiveness = 'ineffective';
      control.effectivenessScore = 0;
    }
    
    await control.save();
    
    // Log the test
    await this.logAuditEvent({
      eventType: 'control_test',
      action: `Tested control ${control.controlId}`,
      description: `Result: ${testResult.result}, Findings: ${testResult.findings}`,
      userId: tester.userId as any,
      userEmail: tester.email,
      userRole: tester.role,
      ipAddress,
      userAgent,
      controlId: controlId as any,
      complianceImpact: {
        affected: testResult.result !== 'passed',
        impactLevel: testResult.result === 'failed' ? 'high' : 'medium',
      },
      status: 'success',
    });
    
    // Update related requirements
    await this.updateRequirementControlStatus(control);
    
    return control;
  }
  
  /**
   * Update requirement status based on control effectiveness
   */
  async updateRequirementControlStatus(control: IComplianceControl) {
    await connectDB();
    
    for (const framework of control.frameworks) {
      for (const reqId of framework.requirementIds) {
        const requirement = await ComplianceRequirement.findById(reqId);
        if (!requirement) continue;
        
        // Calculate implemented control percentage
        const totalControls = requirement.controlCount;
        const implementedControls = await ComplianceControl.countDocuments({
          _id: { $in: requirement.controls },
          status: 'implemented',
          effectiveness: { $in: ['effective', 'partially_effective'] },
        });
        
        requirement.implementedControlCount = implementedControls;
        
        // Update compliance percentage based on control implementation
        if (totalControls > 0) {
          const controlImplementationPercentage = (implementedControls / totalControls) * 100;
          requirement.compliancePercentage = Math.round(controlImplementationPercentage);
          
          if (controlImplementationPercentage >= 100) {
            requirement.status = 'compliant';
          } else if (controlImplementationPercentage >= 50) {
            requirement.status = 'partial';
          } else if (controlImplementationPercentage > 0) {
            requirement.status = 'in_progress';
          } else {
            requirement.status = 'non_compliant';
          }
        }
        
        await requirement.save();
        await this.calculateFrameworkCompliance(requirement.frameworkId.toString());
      }
    }
  }
  
  /**
   * Identify compliance gaps
   */
  async identifyGaps(frameworkId: string): Promise<{
    critical: any[];
    high: any[];
    medium: any[];
    low: any[];
    summary: any;
  }> {
    await connectDB();
    
    const requirements = await ComplianceRequirement.find({
      frameworkId,
      isActive: true,
      status: { $in: ['non_compliant', 'partial', 'in_progress'] },
    }).populate('owner assignedTo');
    
    const gaps = {
      critical: [] as any[],
      high: [] as any[],
      medium: [] as any[],
      low: [] as any[],
    };
    
    for (const req of requirements) {
      const gap = {
        requirementId: req._id,
        requirementTitle: req.title,
        category: req.category,
        status: req.status,
        compliancePercentage: req.compliancePercentage,
        riskLevel: req.riskLevel,
        impactOfNonCompliance: req.impactOfNonCompliance,
        missingControls: req.controlCount - req.implementedControlCount,
        assignedTo: req.assignedTo,
        nextAssessmentDue: req.nextAssessmentDue,
      };
      
      if (req.priority === 'critical' || req.riskLevel === 'critical') {
        gaps.critical.push(gap);
      } else if (req.priority === 'high' || req.riskLevel === 'high') {
        gaps.high.push(gap);
      } else if (req.priority === 'medium' || req.riskLevel === 'medium') {
        gaps.medium.push(gap);
      } else {
        gaps.low.push(gap);
      }
    }
    
    return {
      ...gaps,
      summary: {
        totalGaps: requirements.length,
        criticalCount: gaps.critical.length,
        highCount: gaps.high.length,
        mediumCount: gaps.medium.length,
        lowCount: gaps.low.length,
      },
    };
  }
  
  /**
   * Generate compliance report
   */
  async generateReport(
    reportType: string,
    frameworkIds: string[],
    startDate: Date,
    endDate: Date,
    generatedBy: { userId: string; email: string; role: string },
    ipAddress: string,
    userAgent: string
  ): Promise<IComplianceReport> {
    await connectDB();
    
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Gather framework analysis
    const frameworkAnalysis = [];
    for (const frameworkId of frameworkIds) {
      const framework = await ComplianceFramework.findById(frameworkId);
      if (!framework) continue;
      
      const complianceData = await this.calculateFrameworkCompliance(frameworkId);
      const gaps = await this.identifyGaps(frameworkId);
      
      frameworkAnalysis.push({
        frameworkId: framework._id,
        frameworkCode: framework.code,
        complianceScore: complianceData.score,
        requirementsTotal: complianceData.details.total,
        requirementsMet: complianceData.requirementsMet,
        requirementsPending: complianceData.requirementsPending,
        requirementsFailed: complianceData.requirementsFailed,
        criticalGaps: gaps.summary.criticalCount,
        highRiskGaps: gaps.summary.highCount,
        status: complianceData.score >= 90 ? 'compliant' : 
                complianceData.score >= 70 ? 'partial' : 'non_compliant',
        details: JSON.stringify(complianceData.details),
      });
    }
    
    // Calculate overall metrics
    const avgScore = frameworkAnalysis.reduce((sum, f) => sum + f.complianceScore, 0) / frameworkAnalysis.length;
    const totalCriticalIssues = frameworkAnalysis.reduce((sum, f) => sum + f.criticalGaps + f.highRiskGaps, 0);
    
    // Get control effectiveness
    const allControls = await ComplianceControl.find({
      'frameworks.frameworkId': { $in: frameworkIds },
      isActive: true,
    });
    
    const controlEffectiveness = {
      total: allControls.length,
      effective: allControls.filter(c => c.effectiveness === 'effective').length,
      partiallyEffective: allControls.filter(c => c.effectiveness === 'partially_effective').length,
      ineffective: allControls.filter(c => c.effectiveness === 'ineffective').length,
      notTested: allControls.filter(c => c.effectiveness === 'not_tested').length,
      averageScore: allControls.reduce((sum, c) => sum + c.effectivenessScore, 0) / allControls.length,
    };
    
    // Gather all gaps
    const allGaps = [];
    for (const frameworkId of frameworkIds) {
      const gaps = await this.identifyGaps(frameworkId);
      allGaps.push(...gaps.critical, ...gaps.high, ...gaps.medium, ...gaps.low);
    }
    
    // Create report
    const report = new ComplianceReport({
      reportId,
      title: `${reportType} Report - ${new Date().toLocaleDateString()}`,
      description: `Compliance report covering ${frameworkAnalysis.length} framework(s)`,
      reportType,
      frameworks: frameworkAnalysis.map(f => ({
        frameworkId: f.frameworkId,
        frameworkCode: f.frameworkCode,
        included: true,
      })),
      startDate,
      endDate,
      generatedAt: new Date(),
      executiveSummary: {
        overallScore: Math.round(avgScore),
        complianceLevel: avgScore >= 90 ? 'excellent' :
                        avgScore >= 75 ? 'good' :
                        avgScore >= 60 ? 'needs_improvement' : 'critical',
        keyFindings: [
          `Overall compliance score: ${Math.round(avgScore)}%`,
          `${totalCriticalIssues} critical/high-priority gaps identified`,
          `${controlEffectiveness.effective} of ${controlEffectiveness.total} controls are effective`,
        ],
        criticalIssues: totalCriticalIssues,
        recommendations: this.generateRecommendations(frameworkAnalysis, allGaps),
      },
      frameworkAnalysis,
      controlEffectiveness,
      gaps: allGaps.slice(0, 50).map((g: any) => ({
        requirementId: g.requirementId,
        requirementTitle: g.requirementTitle,
        severity: g.riskLevel,
        description: `${g.category}: ${g.status} (${g.compliancePercentage}% complete)`,
        impact: g.impactOfNonCompliance || 'Not specified',
        recommendation: 'Implement missing controls and complete assessment',
        estimatedEffort: g.missingControls > 5 ? 'High' : g.missingControls > 2 ? 'Medium' : 'Low',
        priority: g.missingControls,
      })),
      generatedBy: generatedBy.userId as any,
      status: 'draft',
      tags: frameworkAnalysis.map(f => f.frameworkCode),
      version: 1,
    });
    
    await report.save();
    
    // Log report generation
    await this.logAuditEvent({
      eventType: 'report_generated',
      action: `Generated ${reportType} report`,
      description: `Report ID: ${reportId}, Frameworks: ${frameworkAnalysis.map(f => f.frameworkCode).join(', ')}`,
      userId: generatedBy.userId as any,
      userEmail: generatedBy.email,
      userRole: generatedBy.role,
      ipAddress,
      userAgent,
      resourceType: 'report',
      resourceId: report._id.toString(),
      complianceImpact: {
        affected: false,
      },
      status: 'success',
    });
    
    return report;
  }
  
  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(frameworkAnalysis: any[], gaps: any[]): string[] {
    const recommendations = [];
    
    // Framework-specific recommendations
    for (const analysis of frameworkAnalysis) {
      if (analysis.complianceScore < 70) {
        recommendations.push(`Focus on improving ${analysis.frameworkCode} compliance (current: ${analysis.complianceScore}%)`);
      }
      if (analysis.criticalGaps > 0) {
        recommendations.push(`Address ${analysis.criticalGaps} critical gaps in ${analysis.frameworkCode} immediately`);
      }
    }
    
    // Gap-based recommendations
    if (gaps.length > 10) {
      recommendations.push('Prioritize remediation of high-risk compliance gaps');
    }
    
    // Generic recommendations
    recommendations.push('Conduct regular compliance assessments');
    recommendations.push('Maintain up-to-date evidence documentation');
    recommendations.push('Schedule quarterly compliance reviews with stakeholders');
    
    return recommendations.slice(0, 5);
  }
  
  /**
   * Log audit event
   */
  async logAuditEvent(event: Partial<IComplianceAuditLog>): Promise<IComplianceAuditLog> {
    await connectDB();
    
    const log = new ComplianceAuditLog({
      ...event,
      timestamp: new Date(),
      verified: false,
    });
    
    await log.save();
    return log;
  }
  
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(frameworkIds?: string[]): Promise<any> {
    await connectDB();
    
    const query = frameworkIds && frameworkIds.length > 0
      ? { _id: { $in: frameworkIds }, isActive: true }
      : { isActive: true };
    
    const frameworks = await ComplianceFramework.find(query);
    
    const stats = {
      frameworks: {
        total: frameworks.length,
        compliant: frameworks.filter(f => f.overallComplianceScore >= 90).length,
        partial: frameworks.filter(f => f.overallComplianceScore >= 70 && f.overallComplianceScore < 90).length,
        critical: frameworks.filter(f => f.overallComplianceScore < 70).length,
        averageScore: frameworks.reduce((sum, f) => sum + f.overallComplianceScore, 0) / frameworks.length || 0,
      },
      requirements: {
        total: 0,
        compliant: 0,
        pending: 0,
        failed: 0,
      },
      controls: {
        total: 0,
        implemented: 0,
        effective: 0,
        needsAttention: 0,
      },
      recentActivity: {
        assessments: 0,
        controlTests: 0,
        gapsIdentified: 0,
        reportsGenerated: 0,
      },
    };
    
    for (const framework of frameworks) {
      stats.requirements.total += framework.requirements.total;
      stats.requirements.compliant += framework.requirementsMet;
      stats.requirements.pending += framework.requirementsPending;
      stats.requirements.failed += framework.requirementsFailed;
    }
    
    const allControls = await ComplianceControl.find({
      'frameworks.frameworkId': { $in: frameworks.map(f => f._id) },
      isActive: true,
    });
    
    stats.controls.total = allControls.length;
    stats.controls.implemented = allControls.filter(c => c.status === 'implemented').length;
    stats.controls.effective = allControls.filter(c => c.effectiveness === 'effective').length;
    stats.controls.needsAttention = allControls.filter(c => 
      c.effectiveness === 'ineffective' || c.effectiveness === 'not_tested'
    ).length;
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    stats.recentActivity.assessments = await ComplianceAuditLog.countDocuments({
      eventType: 'assessment',
      timestamp: { $gte: thirtyDaysAgo },
    });
    
    stats.recentActivity.controlTests = await ComplianceAuditLog.countDocuments({
      eventType: 'control_test',
      timestamp: { $gte: thirtyDaysAgo },
    });
    
    stats.recentActivity.gapsIdentified = await ComplianceAuditLog.countDocuments({
      eventType: 'gap_identified',
      timestamp: { $gte: thirtyDaysAgo },
    });
    
    stats.recentActivity.reportsGenerated = await ComplianceAuditLog.countDocuments({
      eventType: 'report_generated',
      timestamp: { $gte: thirtyDaysAgo },
    });
    
    return stats;
  }
  
  /**
   * Get HIPAA-specific audit logs
   */
  async getHIPAAAuditLogs(startDate: Date, endDate: Date, limit: number = 100): Promise<IComplianceAuditLog[]> {
    await connectDB();
    
    const hipaaFramework = await ComplianceFramework.findOne({ code: 'HIPAA' });
    if (!hipaaFramework) {
      return [];
    }
    
    const logs = await ComplianceAuditLog.find({
      frameworkId: hipaaFramework._id,
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .lean();
    
    return logs as IComplianceAuditLog[];
  }
}

export const complianceEngine = new ComplianceMonitoringEngine();
