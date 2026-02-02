export type PolicyDecision = {
  allowed: boolean;
  reason: string;
};

export type LeKiwiHealthStatus = 'READY' | 'DEGRADED' | 'UNKNOWN';

export type LeKiwiDomain = 'base' | 'arm';

const policyDeniedTotals: Record<string, number> = {};

export const recordPolicyDenied = (policy: string, taskType: string) => {
  const key = `${policy}:${taskType}`;
  policyDeniedTotals[key] = (policyDeniedTotals[key] ?? 0) + 1;
};

export const getPolicyDeniedTotals = () => ({ ...policyDeniedTotals });

export const getTaskDomain = (taskType: string): LeKiwiDomain | null => {
  if (taskType.startsWith('lekiwi.')) {
    return 'base';
  }
  if (taskType === 'so101.move_pose_sequence') {
    return 'arm';
  }
  return null;
};

export const evaluateLeKiwiPolicy = (params: {
  taskType: string;
  healthStatus: LeKiwiHealthStatus;
  baseBusy: boolean;
  armBusy: boolean;
}): PolicyDecision => {
  const { taskType, healthStatus, baseBusy, armBusy } = params;
  if (healthStatus !== 'READY') {
    const reason = 'POLICY_DENIED: endpoint health degraded';
    recordPolicyDenied('health_gating', taskType);
    return { allowed: false, reason };
  }

  const domain = getTaskDomain(taskType);
  if (domain === 'base' && armBusy) {
    const reason = 'POLICY_DENIED: arm busy';
    recordPolicyDenied('mutual_exclusion', taskType);
    return { allowed: false, reason };
  }
  if (domain === 'arm' && baseBusy) {
    const reason = 'POLICY_DENIED: base busy';
    recordPolicyDenied('mutual_exclusion', taskType);
    return { allowed: false, reason };
  }

  return { allowed: true, reason: 'POLICY_OK' };
};

