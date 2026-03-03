'use client';

import React, { useState, useEffect } from 'react';

interface AutomationRule {
  _id?: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  executionCount?: number;
  successCount?: number;
  failureCount?: number;
  trigger: {
    type: 'event' | 'threshold' | 'time' | 'manual';
    eventType?: string;
    severity?: string;
  };
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];
  actionType: 'simple';
  actions: {
    id: string;
    type: string;
    config: any;
    requiresApproval: boolean;
  }[];
  requiresGlobalApproval: boolean;
}

interface AutomationRulesProps {
  toast: any;
}

export default function AutomationRules({ toast }: AutomationRulesProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Form state
  const [formData, setFormData] = useState<AutomationRule>({
    name: '',
    description: '',
    enabled: true,
    priority: 0,
    tags: [],
    trigger: {
      type: 'event',
      eventType: '',
      severity: ''
    },
    conditions: [],
    actionType: 'simple',
    actions: [],
    requiresGlobalApproval: false
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/automation/rules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load automation rules');
      }

      const data = await response.json();
      setRules(data.rules);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create rule');
      }

      toast.success('Automation rule created successfully');
      setShowCreateModal(false);
      resetForm();
      loadRules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create rule');
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle rule');
      }

      toast.success(`Rule ${!enabled ? 'enabled' : 'disabled'}`);
      loadRules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      toast.success('Rule deleted successfully');
      loadRules();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete rule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      enabled: true,
      priority: 0,
      tags: [],
      trigger: {
        type: 'event',
        eventType: '',
        severity: ''
      },
      conditions: [],
      actionType: 'simple',
      actions: [],
      requiresGlobalApproval: false
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        {
          id: `action_${Date.now()}`,
          type: 'notify',
          config: {},
          requiresApproval: false
        }
      ]
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = { ...updatedActions[index], [field]: value };
    setFormData({ ...formData, actions: updatedActions });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Automation Rules</h3>
          <p className="text-sm text-gray-600 mt-1">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} configured •{' '}
            {rules.filter(r => r.enabled).length} active
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-500 mb-4">No automation rules configured</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Rule
            </button>
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule._id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      rule.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </span>
                    {rule.priority > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        Priority: {rule.priority}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{rule.description}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Trigger: {rule.trigger.type}</span>
                    <span>•</span>
                    <span>{rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}</span>
                    {rule.executionCount !== undefined && (
                      <>
                        <span>•</span>
                        <span>Executed {rule.executionCount} times</span>
                      </>
                    )}
                  </div>

                  {rule.tags && rule.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {rule.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-4 flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule._id!, rule.enabled)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <button
                    onClick={() => handleDeleteRule(rule._id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete rule"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Automation Rule</h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Basic Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Block Critical Threats"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  rows={2}
                  placeholder="Describe what this rule does..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority (0-100)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trigger Type
                  </label>
                  <select
                    value={formData.trigger.type}
                    onChange={(e) => setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, type: e.target.value as any }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="event">Event</option>
                    <option value="threshold">Threshold</option>
                    <option value="time">Time-based</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>

              {formData.trigger.type === 'event' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Type
                    </label>
                    <select
                      value={formData.trigger.eventType}
                      onChange={(e) => setFormData({
                        ...formData,
                        trigger: { ...formData.trigger, eventType: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Any Event</option>
                      <option value="Brute Force Attack">Brute Force Attack</option>
                      <option value="Malware Detected">Malware Detected</option>
                      <option value="SQL Injection Attempt">SQL Injection</option>
                      <option value="DDoS Attack">DDoS Attack</option>
                      <option value="Unauthorized Access">Unauthorized Access</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Severity
                    </label>
                    <select
                      value={formData.trigger.severity}
                      onChange={(e) => setFormData({
                        ...formData,
                        trigger: { ...formData.trigger, severity: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Any Severity</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Actions
                  </label>
                  <button
                    onClick={addAction}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Action
                  </button>
                </div>

                {formData.actions.map((action, index) => (
                  <div key={action.id} className="mb-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={action.type}
                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      >
                        <option value="notify">Send Notification</option>
                        <option value="block_ip">Block IP Address</option>
                        <option value="create_investigation">Create Investigation</option>
                        <option value="update_status">Update Status</option>
                        <option value="email">Send Email</option>
                        <option value="quarantine">Quarantine</option>
                      </select>
                      <button
                        onClick={() => removeAction(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={action.requiresApproval}
                          onChange={(e) => updateAction(index, 'requiresApproval', e.target.checked)}
                          className="mr-1"
                        />
                        Requires Approval
                      </label>
                    </div>
                  </div>
                ))}

                {formData.actions.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No actions configured. Click "Add Action" to get started.
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">
                  Enable this rule immediately
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleCreateRule}
                disabled={!formData.name || !formData.description || formData.actions.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Rule
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
