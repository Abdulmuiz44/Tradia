import type { BillingAction } from './types.js'
import { PRICING } from './types.js'

export class TradiaBillingError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message)
    this.name = 'TradiaBillingError'
  }
}

export interface BillingResult {
  charged: boolean
  credits: number
  action: string
  remaining?: number
}

export async function chargeCredits(action: BillingAction): Promise<BillingResult> {
  const apiKey = process.env.TALOCODE_API_KEY
  const baseUrl = process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'

  if (!apiKey) {
    if (process.env.TRADIA_ALLOW_LOCAL_UNAUTH === 'true') {
      return { charged: false, credits: 0, action }
    }
    throw new TradiaBillingError('TALOCODE_API_KEY is required for hosted billing', 401, 'auth_error')
  }

  const credits = PRICING[action] || 0

  try {
    const response = await fetch(`${baseUrl}/api/v1/cloud/usage/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        product: 'tradia',
        action,
        credits,
      }),
    })

    if (response.status === 401) {
      throw new TradiaBillingError('Invalid or missing API key', 401, 'auth_error')
    }

    if (response.status === 402) {
      let body: Record<string, unknown> = {}
      try { body = await response.json() as Record<string, unknown> } catch {}
      const errBody = body.error as Record<string, unknown> | undefined
      throw new TradiaBillingError(
        (errBody?.message as string) || 'Insufficient credits',
        402,
        'insufficient_credits',
      )
    }

    if (!response.ok) {
      throw new TradiaBillingError('Billing service unavailable', 502, 'billing_unavailable')
    }

      const body: Record<string, unknown> = await response.json() as Record<string, unknown>
      return {
        charged: body?.charged === true,
        credits,
        action,
        remaining: typeof body?.remaining === 'number' ? body.remaining : undefined,
      }
  } catch (err) {
    if (err instanceof TradiaBillingError) throw err
    throw new TradiaBillingError('Billing service unavailable', 502, 'billing_unavailable')
  }
}
