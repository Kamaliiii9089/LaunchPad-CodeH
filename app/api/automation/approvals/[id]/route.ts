import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import ApprovalRequest from '@/models/ApprovalRequest';
import { AutomationEngine } from '@/lib/automationEngine';
import AutomationRule from '@/models/AutomationRule';
import Workflow from '@/models/Workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { decision, notes } = await request.json();

    if (!['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const approval = await ApprovalRequest.findOne({
      _id: params.id,
      approvers: decoded.id,
      status: 'pending'
    });

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval request not found or already processed' },
        { status: 404 }
      );
    }

    // Update approval status
    approval.status = decision;
    approval.reviewedBy = decoded.id as any;
    approval.reviewedAt = new Date();
    approval.reviewNotes = notes;
    await approval.save();

    // If approved, execute the action
    if (decision === 'approved') {
      const context = {
        executionId: approval._id.toString(),
        event: approval.triggerEvent,
        variables: new Map(),
        userId: decoded.id
      };

      const action = {
        id: approval._id.toString(),
        type: approval.actionType as any,
        config: Object.fromEntries(approval.actionConfig),
        requiresApproval: false, // Already approved
        retryOnFailure: true,
        maxRetries: 3
      };

      const result = await AutomationEngine.executeAction(
        action,
        context,
        approval.ruleId?.toString(),
        approval.workflowId?.toString(),
        decoded.id
      );

      approval.executedAt = new Date();
      approval.executionStatus = result.success ? 'success' : 'failure';
      approval.executionError = result.error;
      approval.executionResult = result.result ? new Map(Object.entries(result.result)) : undefined;
      await approval.save();

      return NextResponse.json({
        success: true,
        message: 'Approval processed and action executed',
        execution: result
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Approval request rejected'
    });
  } catch (error: any) {
    console.error('Error processing approval:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
