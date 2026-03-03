import IncidentPlaybook, { IIncidentPlaybook, IPlaybookStep } from '../models/IncidentPlaybook';
import IncidentResponse, { IIncidentResponse, IResponseAction } from '../models/IncidentResponse';
import BlockedIP from '../models/BlockedIP';
import ExternalIntegration from '../models/ExternalIntegration';
import { connectDB } from './mongodb';

interface SecurityIncident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIP?: string;
  targetSystem?: string;
  description?: string;
  metadata?: any;
}

export class IncidentResponseEngine {
  /**
   * Find matching playbooks for an incident
   */
  static async findMatchingPlaybooks(incident: SecurityIncident): Promise<IIncidentPlaybook[]> {
    await connectDB();

    const query: any = {
      enabled: true,
      $or: [
        { threatTypes: incident.type },
        { 'triggerConditions.threatType': incident.type },
        { 'triggerConditions.severity': incident.severity },
      ],
    };

    const playbooks = await IncidentPlaybook.find(query)
      .sort({ severity: -1, executionCount: -1 })
      .limit(10);

    return playbooks;
  }

  /**
   * Automatically trigger playbook execution for an incident
   */
  static async autoTriggerResponse(incident: SecurityIncident): Promise<IIncidentResponse | null> {
    await connectDB();

    // Find auto-trigger playbooks matching this incident
    const playbooks = await IncidentPlaybook.find({
      enabled: true,
      autoTrigger: true,
      $or: [
        { threatTypes: incident.type },
        { 'triggerConditions.threatType': incident.type },
      ],
    }).sort({ severity: -1 });

    if (playbooks.length === 0) {
      console.log(`No auto-trigger playbook found for incident type: ${incident.type}`);
      return null;
    }

    // Use the first matching playbook
    const playbook = playbooks[0];

    // Check if approval is required
    if (playbook.requiresApproval) {
      // Create response in awaiting_approval state
      const response = await this.createResponseRecord(incident, playbook, 'awaiting_approval', 'auto');
      return response;
    }

    // Execute immediately
    return await this.executePlaybook(incident, playbook, 'auto');
  }

  /**
   * Execute a playbook for an incident
   */
  static async executePlaybook(
    incident: SecurityIncident,
    playbook: IIncidentPlaybook,
    triggeredBy: 'auto' | 'manual' | 'scheduled',
    userId?: string,
    triggerReason?: string
  ): Promise<IIncidentResponse> {
    await connectDB();

    const startTime = new Date();

    // Create incident response record
    const response = await this.createResponseRecord(
      incident,
      playbook,
      'running',
      triggeredBy,
      userId,
      triggerReason
    );

    try {
      // Execute each step in the playbook
      let currentStepId: string | undefined = playbook.steps[0]?.id;
      const executedSteps = new Set<string>();
      const context: any = {
        incident,
        response,
        variables: {},
      };

      while (currentStepId && executedSteps.size < 100) {
        if (executedSteps.has(currentStepId)) {
          throw new Error(`Circular reference detected at step: ${currentStepId}`);
        }

        const step = playbook.steps.find((s) => s.id === currentStepId);
        if (!step) {
          throw new Error(`Step not found: ${currentStepId}`);
        }

        executedSteps.add(currentStepId);

        // Check step condition
        if (step.condition && !this.evaluateCondition(step.condition, context)) {
          // Skip this step
          await this.updateStepStatus(response, step, 'skipped');
          currentStepId = step.nextStep;
          continue;
        }

        // Execute the step
        const stepResult = await this.executeStep(step, context, response);

        // Determine next step based on result
        if (stepResult.status === 'success' && step.onSuccess) {
          currentStepId = step.onSuccess;
        } else if (stepResult.status === 'failed' && step.onFailure) {
          currentStepId = step.onFailure;
        } else {
          currentStepId = step.nextStep;
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update response as completed
      response.status = 'completed';
      response.endTime = endTime;
      response.duration = duration;
      await response.save();

      // Update playbook statistics
      await IncidentPlaybook.findByIdAndUpdate(playbook._id, {
        $inc: {
          executionCount: 1,
          successCount: 1,
        },
        $set: {
          lastExecuted: new Date(),
          averageDuration: ((playbook.averageDuration * playbook.executionCount) + duration) / (playbook.executionCount + 1),
        },
      });

      return response;
    } catch (error: any) {
      // Update response as failed
      response.status = 'failed';
      response.endTime = new Date();
      response.duration = new Date().getTime() - startTime.getTime();
      response.errorLog.push({
        step: response.currentStep || 'unknown',
        error: error.message,
        timestamp: new Date(),
      });
      await response.save();

      // Update playbook statistics
      await IncidentPlaybook.findByIdAndUpdate(playbook._id, {
        $inc: {
          executionCount: 1,
          failureCount: 1,
        },
      });

      throw error;
    }
  }

  /**
   * Execute a single playbook step
   */
  private static async executeStep(
    step: IPlaybookStep,
    context: any,
    response: IIncidentResponse
  ): Promise<IResponseAction> {
    const startTime = new Date();

    await this.updateStepStatus(response, step, 'running', { startTime });

    try {
      let result: any = {};

      switch (step.type) {
        case 'block_ip':
          result = await this.executeBlockIP(step, context);
          break;

        case 'quarantine':
          result = await this.executeQuarantine(step, context);
          break;

        case 'notify':
          result = await this.executeNotify(step, context);
          break;

        case 'escalate':
          result = await this.executeEscalate(step, context);
          break;

        case 'isolate_system':
          result = await this.executeIsolateSystem(step, context);
          break;

        case 'collect_evidence':
          result = await this.executeCollectEvidence(step, context);
          break;

        case 'create_ticket':
          result = await this.executeCreateTicket(step, context);
          break;

        case 'investigate':
          result = await this.executeInvestigate(step, context);
          break;

        case 'update_status':
          result = await this.executeUpdateStatus(step, context);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const action: IResponseAction = {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        status: 'success',
        startTime,
        endTime,
        duration,
        result,
        retryAttempt: 0,
      };

      await this.updateStepStatus(response, step, 'success', { endTime, duration, result });

      // Update context with result
      context.variables[step.id] = result;

      return action;
    } catch (error: any) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      response.errorLog.push({
        step: step.name,
        error: error.message,
        timestamp: new Date(),
      });
      await response.save();

      await this.updateStepStatus(response, step, 'failed', {
        endTime,
        duration,
        error: error.message,
      });

      // Check if we should retry
      const maxRetries = step.config.retryAttempts || 0;
      const currentRetry = response.actions.filter(
        (a) => a.stepId === step.id && a.status === 'failed'
      ).length;

      if (currentRetry < maxRetries) {
        // Retry the step
        console.log(`Retrying step ${step.name} (attempt ${currentRetry + 1}/${maxRetries})`);
        return await this.executeStep(step, context, response);
      }

      throw error;
    }
  }

  /**
   * Block IP address
   */
  private static async executeBlockIP(step: IPlaybookStep, context: any): Promise<any> {
    const incident = context.incident;
    const ipAddress = incident.sourceIP || step.config.ipAddress;

    if (!ipAddress) {
      throw new Error('No IP address specified for blocking');
    }

    const blockedIP = await BlockedIP.create({
      ipAddress,
      reason: step.config.reason || incident.description || step.description,
      threatType: incident.type,
      severity: incident.severity,
      blockType: step.config.blockType || 'firewall',
      isTemporary: (step.config.duration || 0) > 0,
      duration: step.config.duration,
      blockedBy: 'playbook',
      playbookId: context.response.playbookId,
      incidentResponseId: context.response._id,
      status: 'active',
      isActive: true,
    });

    // Update response statistics
    context.response.ipsBlocked += 1;
    await context.response.save();

    return {
      ipAddress,
      blockType: blockedIP.blockType,
      expiresAt: blockedIP.expiresAt,
      blockId: blockedIP._id,
    };
  }

  /**
   * Quarantine target (file, user, device, network)
   */
  private static async executeQuarantine(step: IPlaybookStep, context: any): Promise<any> {
    const { quarantineTarget, quarantineDuration } = step.config;

    // In a real implementation, this would interface with security tools
    // For now, we'll simulate the action

    context.response.systemsQuarantined += 1;
    await context.response.save();

    return {
      target: quarantineTarget,
      duration: quarantineDuration,
      quarantinedAt: new Date(),
      expiresAt: quarantineDuration ? new Date(Date.now() + quarantineDuration * 60000) : null,
    };
  }

  /**
   * Send notifications
   */
  private static async executeNotify(step: IPlaybookStep, context: any): Promise<any> {
    const { notificationChannels, recipients, message } = step.config;
    const incident = context.incident;

    // Find notification integrations
    const integrations = await ExternalIntegration.find({
      type: 'notification',
      enabled: true,
      status: 'connected',
    });

    const notifications: any[] = [];

    for (const channel of notificationChannels || ['email']) {
      // In a real implementation, send actual notifications via integrations
      notifications.push({
        channel,
        recipients: recipients || ['security-team@example.com'],
        message: message || `Security incident detected: ${incident.type}`,
        sentAt: new Date(),
      });
    }

    context.response.notificationsSent += notifications.length;
    await context.response.save();

    return { notifications, count: notifications.length };
  }

  /**
   * Escalate to team member or manager
   */
  private static async executeEscalate(step: IPlaybookStep, context: any): Promise<any> {
    const { escalateTo, priority } = step.config;

    return {
      escalatedTo: escalateTo,
      priority: priority || context.incident.severity,
      escalatedAt: new Date(),
    };
  }

  /**
   * Isolate system from network
   */
  private static async executeIsolateSystem(step: IPlaybookStep, context: any): Promise<any> {
    const { isolationType } = step.config;

    return {
      isolationType: isolationType || 'network',
      system: context.incident.targetSystem,
      isolatedAt: new Date(),
    };
  }

  /**
   * Collect forensic evidence
   */
  private static async executeCollectEvidence(step: IPlaybookStep, context: any): Promise<any> {
    const { evidenceTypes } = step.config;

    const evidence = (evidenceTypes || ['logs']).map((type: string) => ({
      type,
      location: `/evidence/${context.incident.id}/${type}`,
      size: Math.floor(Math.random() * 1000000), // Simulated size
      collectedAt: new Date(),
    }));

    context.response.evidenceCollected.push(...evidence);
    await context.response.save();

    return { evidence, count: evidence.length };
  }

  /**
   * Create ticket in external system
   */
  private static async executeCreateTicket(step: IPlaybookStep, context: any): Promise<any> {
    const { ticketSystem, ticketDetails } = step.config;

    // Find ticketing integration
    const integration = await ExternalIntegration.findOne({
      type: 'ticketing',
      enabled: true,
      status: 'connected',
    });

    const ticketId = `TICKET-${Date.now()}`;

    context.response.ticketsCreated += 1;
    await context.response.save();

    return {
      ticketSystem: ticketSystem || 'internal',
      ticketId,
      details: ticketDetails,
      createdAt: new Date(),
    };
  }

  /**
   * Investigate incident
   */
  private static async executeInvestigate(step: IPlaybookStep, context: any): Promise<any> {
    return {
      investigationStarted: new Date(),
      investigator: 'automated',
      status: 'in_progress',
    };
  }

  /**
   * Update incident status
   */
  private static async executeUpdateStatus(step: IPlaybookStep, context: any): Promise<any> {
    const newStatus = step.config.status || 'investigating';

    return {
      previousStatus: context.incident.status,
      newStatus,
      updatedAt: new Date(),
    };
  }

  /**
   * Evaluate step condition
   */
  private static evaluateCondition(condition: any, context: any): boolean {
    const { field, operator, value } = condition;

    // Get field value from context
    const fieldValue = this.getNestedValue(context, field);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Create incident response record
   */
  private static async createResponseRecord(
    incident: SecurityIncident,
    playbook: IIncidentPlaybook,
    status: string,
    triggeredBy: 'auto' | 'manual' | 'scheduled',
    userId?: string,
    triggerReason?: string
  ): Promise<IIncidentResponse> {
    const response = await IncidentResponse.create({
      incidentId: incident.id,
      incidentType: incident.type,
      severity: incident.severity,
      playbookId: playbook._id,
      playbookName: playbook.name,
      playbookVersion: playbook.version,
      status,
      startTime: status === 'running' ? new Date() : undefined,
      actions: [],
      requiresApproval: playbook.requiresApproval,
      approvalStatus: playbook.requiresApproval ? 'pending' : undefined,
      triggeredBy,
      triggeredByUser: userId as any,
      triggerReason,
      threatsBlocked: 0,
      systemsQuarantined: 0,
      ipsBlocked: 0,
      notificationsSent: 0,
      ticketsCreated: 0,
      evidenceCollected: [],
      errorLog: [],
    });

    return response;
  }

  /**
   * Update step status in response
   */
  private static async updateStepStatus(
    response: IIncidentResponse,
    step: IPlaybookStep,
    status: string,
    updates: any = {}
  ): Promise<void> {
    const actionIndex = response.actions.findIndex((a) => a.stepId === step.id);

    if (actionIndex >= 0) {
      // Update existing action
      response.actions[actionIndex].status = status as any;
      Object.assign(response.actions[actionIndex], updates);
    } else {
      // Create new action
      response.actions.push({
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        status: status as any,
        retryAttempt: 0,
        ...updates,
      });
    }

    response.currentStep = step.name;
    await response.save();
  }

  /**
   * Approve a pending response
   */
  static async approveResponse(
    responseId: string,
    approverId: string,
    notes?: string
  ): Promise<IIncidentResponse> {
    await connectDB();

    const response = await IncidentResponse.findById(responseId);
    if (!response) {
      throw new Error('Response not found');
    }

    if (response.status !== 'awaiting_approval') {
      throw new Error('Response is not awaiting approval');
    }

    response.approvalStatus = 'approved';
    response.approvedBy = approverId as any;
    response.approvalTime = new Date();
    response.approvalNotes = notes;
    await response.save();

    // Get playbook and execute
    const playbook = await IncidentPlaybook.findById(response.playbookId);
    if (!playbook) {
      throw new Error('Playbook not found');
    }

    const incident: SecurityIncident = {
      id: response.incidentId,
      type: response.incidentType,
      severity: response.severity,
    };

    return await this.executePlaybook(incident, playbook, response.triggeredBy, approverId, 'Approved and executed');
  }

  /**
   * Reject a pending response
   */
  static async rejectResponse(
    responseId: string,
    approverId: string,
    notes?: string
  ): Promise<IIncidentResponse> {
    await connectDB();

    const response = await IncidentResponse.findById(responseId);
    if (!response) {
      throw new Error('Response not found');
    }

    if (response.status !== 'awaiting_approval') {
      throw new Error('Response is not awaiting approval');
    }

    response.status = 'cancelled';
    response.approvalStatus = 'rejected';
    response.approvedBy = approverId as any;
    response.approvalTime = new Date();
    response.approvalNotes = notes;
    response.endTime = new Date();
    await response.save();

    return response;
  }
}
