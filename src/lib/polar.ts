// src/lib/polar.ts
// Polar Payment Integration

export interface PolarConfig {
  accessToken: string;
  server?: string;
}

export interface PolarProduct {
  id: string;
  name: string;
  description?: string;
  prices: PolarPrice[];
  metadata?: Record<string, any>;
}

export interface PolarPrice {
  id: string;
  amount: number;
  currency: string;
  interval?: 'month' | 'year';
  type: 'recurring' | 'one_time';
}

export interface PolarCheckout {
  id: string;
  url: string;
  expiresAt: string;
  customerId?: string;
  customerEmail?: string;
}

export interface PolarSubscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: PolarPrice;
  customerId: string;
}

class PolarClient {
  private config: PolarConfig;
  private baseUrl: string;

  constructor(config: PolarConfig) {
    this.config = config;
    this.baseUrl = config.server || 'https://api.polar.sh';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Polar API Error: ${response.status} - ${error.message}`);
    }

    return response.json();
  }

  // Products
  async listProducts(): Promise<PolarProduct[]> {
    return this.request('/v1/products');
  }

  async getProduct(productId: string): Promise<PolarProduct> {
    return this.request(`/v1/products/${productId}`);
  }

  // Checkouts
  async createCheckout(data: {
    productId: string;
    successUrl: string;
    cancelUrl?: string;
    customerEmail?: string;
    customerId?: string;
    metadata?: Record<string, any>;
  }): Promise<PolarCheckout> {
    return this.request('/v1/checkouts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCheckout(checkoutId: string): Promise<PolarCheckout> {
    return this.request(`/v1/checkouts/${checkoutId}`);
  }

  // Subscriptions
  async listSubscriptions(customerId?: string): Promise<PolarSubscription[]> {
    const params = customerId ? `?customer_id=${customerId}` : '';
    return this.request(`/v1/subscriptions${params}`);
  }

  async getSubscription(subscriptionId: string): Promise<PolarSubscription> {
    return this.request(`/v1/subscriptions/${subscriptionId}`);
  }

  async cancelSubscription(subscriptionId: string): Promise<PolarSubscription> {
    return this.request(`/v1/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });
  }

  async updateSubscription(subscriptionId: string, data: {
    priceId?: string;
    prorationBehavior?: 'create_prorations' | 'none';
  }): Promise<PolarSubscription> {
    return this.request(`/v1/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Customers
  async createCustomer(data: {
    email: string;
    name?: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string; email: string; name?: string }> {
    return this.request('/v1/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomer(customerId: string): Promise<any> {
    return this.request(`/v1/customers/${customerId}`);
  }

  // Webhooks
  async listWebhooks(): Promise<any[]> {
    return this.request('/v1/webhooks');
  }

  async createWebhook(data: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<any> {
    return this.request('/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Initialize Polar client
const polarConfig: PolarConfig = {
  accessToken: process.env.POLAR_ACCESS_TOKEN || '',
  server: process.env.POLAR_SERVER || 'https://api.polar.sh',
};

export const polar = new PolarClient(polarConfig);

// Utility functions for plan management
export const PLAN_PRODUCT_IDS = {
  pro: process.env.POLAR_PRO_PRODUCT_ID || '',
  plus: process.env.POLAR_PLUS_PRODUCT_ID || '',
  elite: process.env.POLAR_ELITE_PRODUCT_ID || '',
};

export async function createCheckoutForPlan(
  planType: 'pro' | 'plus' | 'elite',
  userEmail: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<PolarCheckout> {
  const productId = PLAN_PRODUCT_IDS[planType];

  if (!productId) {
    throw new Error(`Product ID not configured for plan: ${planType}`);
  }

  return polar.createCheckout({
    productId,
    successUrl,
    cancelUrl,
    customerEmail: userEmail,
    metadata: {
      userId,
      planType,
    },
  });
}

export async function getUserSubscriptions(userId: string): Promise<PolarSubscription[]> {
  // In a real implementation, you'd store the Polar customer ID in your database
  // For now, we'll search by email or use a lookup table
  return polar.listSubscriptions();
}

export async function cancelUserSubscription(subscriptionId: string): Promise<PolarSubscription> {
  return polar.cancelSubscription(subscriptionId);
}

export async function updateUserSubscription(
  subscriptionId: string,
  newPlanType: 'pro' | 'plus' | 'elite'
): Promise<PolarSubscription> {
  const newProductId = PLAN_PRODUCT_IDS[newPlanType];

  if (!newProductId) {
    throw new Error(`Product ID not configured for plan: ${newPlanType}`);
  }

  // Get the product to find the appropriate price
  const product = await polar.getProduct(newProductId);
  const monthlyPrice = product.prices.find(p => p.interval === 'month');

  if (!monthlyPrice) {
    throw new Error(`No monthly price found for plan: ${newPlanType}`);
  }

  return polar.updateSubscription(subscriptionId, {
    priceId: monthlyPrice.id,
    prorationBehavior: 'create_prorations',
  });
}