import { PLANS } from './constants.js';
import { logger } from '../utils/logger.js';

interface CredentialCheckResult {
  valid: boolean;
  error?: 'invalid_api_key' | 'network_error' | 'unknown';
  message?: string;
}

export async function checkCredential(apiKey: string, planId: string): Promise<CredentialCheckResult> {
  const plan = PLANS[planId];
  if (!plan) {
    return {
      valid: false,
      error: 'unknown',
      message: `Unknown plan: ${planId}`
    };
  }

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      error: 'invalid_api_key',
      message: 'API Key is empty'
    };
  }

  try {
    const response = await fetch(`${plan.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        error: 'invalid_api_key',
        message: 'Invalid API Key'
      };
    }

    if (response.ok) {
      return { valid: true };
    }

    const errorText = await response.text();
    logger.error('AuthChecker', `Credential check failed: ${response.status}`, errorText);

    return {
      valid: false,
      error: 'unknown',
      message: `API returned status ${response.status}`
    };
  } catch (error) {
    logger.logError('AuthChecker', error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        valid: false,
        error: 'network_error',
        message: 'Network error, unable to connect to API'
      };
    }

    return {
      valid: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
