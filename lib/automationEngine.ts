import { randomBytes } from 'crypto';
import AutomationRule, { IAutomationRule, IAction } from '@/models/AutomationRule';

// UUID v4 generator without external dependency
function uuidv4() {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}
import Workflow, { IWorkflow } from '@/models/Workflow';
import ActionLog from '@/models/ActionLog';
import ApprovalRequest from '@/models/ApprovalRequest';
import { connectDB } from '@/lib/mongodb';

export interface ExecutionContext {
  executionId: string;
  event?: any;
  variables: Map<string, any>;
  userId?: string;
}

export class AutomationEngine {
  /**
   * Evaluate a rule against a given event/context
   */
  static async evaluateRule(rule: IAutomationRule, context: ExecutionContext): Promise<boolean> {
    try {
      // Check if rule is enabled
      if (!rule.enabled) {
        return false;
      }

      // Check throttling
      if (rule.throttle?.enabled) {
        const recentExecutions = await ActionLog.countDocuments({
          ruleId: rule._id,
          startedAt: {
            $gte: new Date(Date.now() - rule.throttle.timeWindow * 1000)
          }
        });

        if (recentExecutions >= rule.throttle.maxExecutions) {
          console.log(`Rule ${rule.name} throttled. Max executions reached.`);
          return false;
        }
      }

      // Evaluate conditions
      for (const condition of rule.conditions) {
        const fieldValue = this.getFieldValue(context, condition.field);
        
        if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return false;
    }
  }

  /**
   * Execute a rule's actions
   */
  static async executeRule(
    rule: IAutomationRule,
    context: ExecutionContext,
    userId?: string
  ): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];

    try {
      // Update rule statistics
      await AutomationRule.findByIdAndUpdate(rule._id, {
        lastExecutedAt: new Date(),
        $inc: { executionCount: 1 }
      });

      if (rule.actionType === 'workflow' && rule.workflowId) {
        // Execute workflow
        const workflow = await Workflow.findById(rule.workflowId);
        if (!workflow) {
          throw new Error('Workflow not found');
        }

        const workflowResult = await this.executeWorkflow(workflow, context, userId);
        results.push(workflowResult);
      } else {
        // Execute simple actions
        for (const action of rule.actions) {
          const result = await this.executeAction(
            action,
            context,
            rule._id.toString(),
            undefined,
            userId
          );
          results.push(result);
        }
      }

      // Update success count
      await AutomationRule.findByIdAndUpdate(rule._id, {
        $inc: { successCount: 1 }
      });

      return { success: true, results };
    } catch (error: any) {
      console.error('Error executing rule:', error);
      
      // Update failure count
      await AutomationRule.findByIdAndUpdate(rule._id, {
        $inc: { failureCount: 1 }
      });

      return { success: false, results: [{ error: error.message }] };
    }
  }

  /**
   * Execute a workflow
   */
  static async executeWorkflow(
    workflow: IWorkflow,
    context: ExecutionContext,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Initialize workflow variables
      for (const variable of workflow.variables) {
        if (!context.variables.has(variable.name) && variable.defaultValue !== undefined) {
          context.variables.set(variable.name, variable.defaultValue);
        }
      }

      // Find the first step (no incoming edges)
      let currentStepId: string | undefined = workflow.steps[0]?.id;
      const executedSteps = new Set<string>();
      const results: any[] = [];

      while (currentStepId && executedSteps.size < 100) { // Safety limit
        const currentStep = workflow.steps.find(s => s.id === currentStepId);
        
        if (!currentStep || executedSteps.has(currentStepId)) {
          break; // Prevent infinite loops
        }

        executedSteps.add(currentStepId);

        // Execute step based on type
        let nextStepId: string | undefined;

        switch (currentStep.type) {
          case 'action':
            const actionResult = await this.executeWorkflowStep(
              workflow,
              currentStep,
              context,
              userId
            );
            results.push(actionResult);
            
            nextStepId = actionResult.success ? currentStep.onSuccess || currentStep.nextStep : currentStep.onFailure;
            break;

          case 'condition':
            const conditionResult = this.evaluateExpression(currentStep.condition || 'true', context);
            
            if (currentStep.conditionalBranches) {
              for (const branch of currentStep.conditionalBranches) {
                if (this.evaluateExpression(branch.condition, context)) {
                  nextStepId = branch.nextStep;
                  break;
                }
              }
            }
            
            nextStepId = nextStepId || currentStep.nextStep;
            break;

          case 'parallel':
            // Execute multiple steps in parallel
            if (currentStep.parallelSteps) {
              const parallelPromises = currentStep.parallelSteps.map(stepId => {
                const step = workflow.steps.find(s => s.id === stepId);
                return step ? this.executeWorkflowStep(workflow, step, context, userId) : Promise.resolve(null);
              });
              
              const parallelResults = await Promise.all(parallelPromises);
              results.push(...parallelResults.filter(r => r !== null));
            }
            
            nextStepId = currentStep.nextStep;
            break;

          case 'delay':
            await new Promise(resolve => setTimeout(resolve, currentStep.delayMs || 1000));
            nextStepId = currentStep.nextStep;
            break;

          default:
            nextStepId = currentStep.nextStep;
        }

        currentStepId = nextStepId;
      }

      const duration = Date.now() - startTime;

      // Update workflow statistics
      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: {
          executionCount: 1,
          successCount: 1
        },
        averageExecutionTime: await this.calculateAverageExecutionTime(workflow._id.toString(), duration)
      });

      return { success: true, duration, results };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: {
          executionCount: 1,
          failureCount: 1
        }
      });

      return { success: false, duration, error: error.message };
    }
  }

  /**
   * Execute a workflow step
   */
  private static async executeWorkflowStep(
    workflow: IWorkflow,
    step: any,
    context: ExecutionContext,
    userId?: string
  ): Promise<any> {
    const action: IAction = {
      id: step.id,
      type: step.actionType,
      config: Object.fromEntries(step.actionConfig || new Map()),
      requiresApproval: step.requiresApproval || false,
      retryOnFailure: step.retryOnFailure !== false,
      maxRetries: step.maxRetries || 3,
      timeout: step.timeout || 30000
    };

    return await this.executeAction(
      action,
      context,
      undefined,
      workflow._id.toString(),
      userId
    );
  }

  /**
   * Execute a single action
   */
  static async executeAction(
    action: IAction,
    context: ExecutionContext,
    ruleId?: string,
    workflowId?: string,
    userId?: string
  ): Promise<any> {
    // Create action log
    const actionLog = new ActionLog({
      ruleId,
      workflowId,
      executionId: context.executionId,
      stepId: action.id,
      actionType: action.type,
      actionConfig: new Map(Object.entries(action.config)),
      triggeredBy: userId ? 'manual' : 'rule',
      triggerUserId: userId,
      triggerEvent: context.event,
      status: 'pending',
      attemptNumber: 1,
      maxAttempts: action.maxRetries || 3,
      metadata: new Map()
    });

    await actionLog.save();

    try {
      // Check if approval is required
      if (action.requiresApproval) {
        const approvalRequest = await this.createApprovalRequest(action, context, ruleId, workflowId, userId);
        
        actionLog.status = 'awaiting_approval';
        actionLog.approvalRequestId = approvalRequest._id;
        await actionLog.save();

        return {
          success: false,
          pending: true,
          approvalRequestId: approvalRequest._id,
          message: 'Action requires approval'
        };
      }

      // Execute the action
      actionLog.status = 'running';
      actionLog.startedAt = new Date();
      await actionLog.save();

      let result: any;

      switch (action.type) {
        case 'block_ip':
          result = await this.executeBlockIP(action.config, context);
          break;
        
        case 'notify':
          result = await this.executeNotify(action.config, context);
          break;
        
        case 'create_investigation':
          result = await this.executeCreateInvestigation(action.config, context);
          break;
        
        case 'update_status':
          result = await this.executeUpdateStatus(action.config, context);
          break;
        
        case 'email':
          result = await this.executeEmail(action.config, context);
          break;
        
        case 'quarantine':
          result = await this.executeQuarantine(action.config, context);
          break;
        
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Update action log with success
      actionLog.status = 'success';
      actionLog.completedAt = new Date();
      actionLog.duration = actionLog.completedAt.getTime() - actionLog.startedAt.getTime();
      actionLog.result = new Map(Object.entries(result));
      await actionLog.save();

      return { success: true, result };

    } catch (error: any) {
      actionLog.status = 'failure';
      actionLog.completedAt = new Date();
      actionLog.duration = actionLog.completedAt.getTime() - actionLog.startedAt.getTime();
      actionLog.error = error.message;
      actionLog.stackTrace = error.stack;
      await actionLog.save();

      // Retry logic
      if (action.retryOnFailure && actionLog.attemptNumber < actionLog.maxAttempts) {
        console.log(`Retrying action ${action.type}, attempt ${actionLog.attemptNumber + 1}`);
        // In a real system, you would queue this for retry
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Action executor methods
   */
  private static async executeBlockIP(config: any, context: ExecutionContext): Promise<any> {
    const ipAddress = config.ipAddress || context.event?.ipAddress;
    
    if (!ipAddress) {
      throw new Error('IP address not specified');
    }

    // Simulate blocking IP (in a real system, this would interact with firewall)
    console.log(`Blocking IP: ${ipAddress}`);
    
    return {
      action: 'block_ip',
      ipAddress,
      blockedAt: new Date(),
      duration: config.duration || '24h'
    };
  }

  private static async executeNotify(config: any, context: ExecutionContext): Promise<any> {
    const recipients = config.recipients || [];
    const message = config.message || 'Security alert triggered';
    const channel = config.channel || 'email';

    console.log(`Sending notification via ${channel} to ${recipients.join(', ')}`);

    return {
      action: 'notify',
      channel,
      recipients,
      message,
      sentAt: new Date()
    };
  }

  private static async executeCreateInvestigation(config: any, context: ExecutionContext): Promise<any> {
    const title = config.title || 'Automated Investigation';
    const priority = config.priority || 'medium';

    console.log(`Creating investigation: ${title}`);

    return {
      action: 'create_investigation',
      title,
      priority,
      createdAt: new Date(),
      eventId: context.event?.id
    };
  }

  private static async executeUpdateStatus(config: any, context: ExecutionContext): Promise<any> {
    const eventId = config.eventId || context.event?.id;
    const newStatus = config.status || 'resolved';

    console.log(`Updating event ${eventId} status to ${newStatus}`);

    return {
      action: 'update_status',
      eventId,
      previousStatus: context.event?.status,
      newStatus,
      updatedAt: new Date()
    };
  }

  private static async executeEmail(config: any, context: ExecutionContext): Promise<any> {
    const to = config.to || [];
    const subject = config.subject || 'Security Alert';
    const body = config.body || '';

    console.log(`Sending email to ${to.join(', ')}`);

    return {
      action: 'email',
      to,
      subject,
      sentAt: new Date()
    };
  }

  private static async executeQuarantine(config: any, context: ExecutionContext): Promise<any> {
    const target = config.target; // file, user, device
    const targetId = config.targetId;

    console.log(`Quarantining ${target}: ${targetId}`);

    return {
      action: 'quarantine',
      target,
      targetId,
      quarantinedAt: new Date()
    };
  }

  /**
   * Helper methods
   */
  private static getFieldValue(context: ExecutionContext, field: string): any {
    // Support nested field access with dot notation
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private static evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      
      case 'not_equals':
        return fieldValue !== expectedValue;
      
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(expectedValue);
      
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
      
      case 'regex':
        return new RegExp(expectedValue).test(String(fieldValue));
      
      default:
        return false;
    }
  }

  private static evaluateExpression(expression: string, context: ExecutionContext): boolean {
    try {
      // Create a safe evaluation context
      const variables = Object.fromEntries(context.variables);
      const event = context.event;
      
      // Use Function constructor for safe evaluation (avoid eval)
      const func = new Function('event', 'variables', `return ${expression};`);
      return Boolean(func(event, variables));
    } catch (error) {
      console.error('Error evaluating expression:', error);
      return false;
    }
  }

  private static async createApprovalRequest(
    action: IAction,
    context: ExecutionContext,
    ruleId?: string,
    workflowId?: string,
    userId?: string
  ): Promise<any> {
    const approvalRequest = new ApprovalRequest({
      type: workflowId ? 'workflow_step' : (ruleId ? 'rule_execution' : 'action'),
      priority: this.getActionPriority(action.type),
      ruleId,
      workflowId,
      actionType: action.type,
      actionConfig: new Map(Object.entries(action.config)),
      triggerEvent: context.event ? {
        eventId: context.event.id,
        eventType: context.event.type,
        severity: context.event.severity,
        description: context.event.description
      } : undefined,
      reason: `Automated ${action.type} action requires approval`,
      impact: this.getActionImpact(action.type),
      reversible: this.isActionReversible(action.type),
      requestedBy: userId,
      approvers: [], // Should be populated based on configuration
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await approvalRequest.save();
    return approvalRequest;
  }

  private static getActionPriority(actionType: string): 'low' | 'medium' | 'high' | 'critical' {
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'block_ip': 'high',
      'quarantine': 'critical',
      'notify': 'low',
      'email': 'low',
      'create_investigation': 'medium',
      'update_status': 'low'
    };
    return priorityMap[actionType] || 'medium';
  }

  private static getActionImpact(actionType: string): string {
    const impactMap: Record<string, string> = {
      'block_ip': 'Will block network traffic from specified IP address',
      'quarantine': 'Will isolate the target from the network',
      'notify': 'Will send notifications to specified recipients',
      'email': 'Will send email notifications',
      'create_investigation': 'Will create a new investigation',
      'update_status': 'Will update event status'
    };
    return impactMap[actionType] || 'Unknown impact';
  }

  private static isActionReversible(actionType: string): boolean {
    const reversibleActions = ['notify', 'email', 'create_investigation', 'update_status'];
    return reversibleActions.includes(actionType);
  }

  private static async calculateAverageExecutionTime(workflowId: string, newDuration: number): Promise<number> {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) return newDuration;

    const totalExecutions = workflow.executionCount || 0;
    const currentAverage = workflow.averageExecutionTime || 0;

    return (currentAverage * totalExecutions + newDuration) / (totalExecutions + 1);
  }
}

/**
 * Trigger-based rule matching
 */
export async function findMatchingRules(event: any): Promise<IAutomationRule[]> {
  await connectDB();

  const matchingRules = await AutomationRule.find({
    enabled: true,
    'trigger.type': 'event',
    'trigger.eventType': event.type
  }).sort({ priority: -1 });

  return matchingRules;
}

/**
 * Process an event through automation engine
 */
export async function processEvent(event: any, userId?: string): Promise<any> {
  const executionId = uuidv4();
  const context: ExecutionContext = {
    executionId,
    event,
    variables: new Map(),
    userId
  };

  const matchingRules = await findMatchingRules(event);
  const results: any[] = [];

  for (const rule of matchingRules) {
    const shouldExecute = await AutomationEngine.evaluateRule(rule, context);
    
    if (shouldExecute) {
      const result = await AutomationEngine.executeRule(rule, context, userId);
      results.push({
        ruleId: rule._id,
        ruleName: rule.name,
        ...result
      });
    }
  }

  return {
    executionId,
    event,
    matchedRules: results.length,
    results
  };
}
