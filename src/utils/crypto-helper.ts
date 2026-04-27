import crypto from 'crypto';
export function generatePlanId(baseUrl: string, apiKey: string): string {
  const normalized = `${baseUrl.trim()}:${apiKey.trim()}`;
  const hash = crypto.createHash('sha1').update(normalized).digest('hex');
  return `custom_${hash.substring(0, 16)}`;
}
export function isCustomPlanId(planId: string): boolean {
  return planId.startsWith('custom_');
}
export function isValidCustomPlanId(planId: string): boolean {
  return /^custom_[a-f0-9]{16}$/.test(planId);
}
