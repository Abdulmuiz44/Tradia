// src/lib/connection-monitor.ts
import { MT5Credentials, ConnectionStatus } from '@/types/mt5';
import { getCredentialStorage } from '@/lib/credential-storage';
import { mt5ConnectionManager } from '@/lib/mt5-connection-manager';
import { createClient } from '@/utils/supabase/server';

export interface ConnectionHealth {
  credentialId: string;
  status: ConnectionStatus;
  responseTime: number;
  lastChecked: Date;
  consecutiveFailures: number;
  uptimePercentage: number;
  // allow explicit null when clearing errors coming from validation results
  errorMessage?: string | null;
  metadata?: Record<string, any>;
}

export interface MonitoringConfig {
  checkInterval: number; // milliseconds
  timeout: number; // milliseconds
  maxConsecutiveFailures: number;
  // use boolean (remove non-existent `bool` alias)
  enableRealTimeUpdates: boolean;
  alertThresholds: {
    responseTime: number; // ms
    uptimePercentage: number; // %
  };
}

export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private monitoringConfigs: Map<string, MonitoringConfig> = new Map();
  private healthStatus: Map<string, ConnectionHealth> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, ((health: ConnectionHealth) => void)[]> = new Map();
  private isMonitoring = false;

  private defaultConfig: MonitoringConfig = {
    checkInterval: 5 * 60 * 1000, // 5 minutes
    timeout: 30000, // 30 seconds
    maxConsecutiveFailures: 3,
    enableRealTimeUpdates: true,
    alertThresholds: {
      responseTime: 5000, // 5 seconds
      uptimePercentage: 95 // 95%
    }
  };

  private constructor() {}

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  /**
   * Start monitoring for a user's credentials
   */
  async startMonitoring(userId: string, config?: Partial<MonitoringConfig>): Promise<void> {
    if (this.isMonitoring) {
      return; // Already monitoring (simple guard)
    }

    const monitoringConfig = { ...this.defaultConfig, ...config } as MonitoringConfig;
    this.monitoringConfigs.set(userId, monitoringConfig);

    // Load existing credentials
    const storage = getCredentialStorage();
    const credentials = await storage.getUserCredentials(userId);

    // Initialize health status for each credential
    for (const credential of credentials) {
      await this.initializeHealthStatus(userId, credential.id);
    }

    // Start periodic health checks
    this.startHealthChecks(userId, monitoringConfig);

    this.isMonitoring = true;
    console.log(`Started connection monitoring for user ${userId}`);
  }

  /**
   * Stop monitoring for a user
   */
  stopMonitoring(userId: string): void {
    const interval = this.checkIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(userId);
    }

    // Clean up health status
    for (const [key] of this.healthStatus.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.healthStatus.delete(key);
      }
    }

    this.monitoringConfigs.delete(userId);
    this.isMonitoring = false;
    console.log(`Stopped connection monitoring for user ${userId}`);
  }

  /**
   * Get current health status for a credential
   */
  getHealthStatus(userId: string, credentialId: string): ConnectionHealth | null {
    const key = `${userId}:${credentialId}`;
    return this.healthStatus.get(key) || null;
  }

  /**
   * Get all health statuses for a user
   */
  getAllHealthStatuses(userId: string): ConnectionHealth[] {
    const statuses: ConnectionHealth[] = [];
    for (const [key, health] of this.healthStatus.entries()) {
      if (key.startsWith(`${userId}:`)) {
        statuses.push(health);
      }
    }
    return statuses;
  }

  /**
   * Subscribe to health status updates
   */
  subscribeToUpdates(
    userId: string,
    callback: (health: ConnectionHealth) => void
  ): () => void {
    const listeners = this.eventListeners.get(userId) || [];
    listeners.push(callback);
    this.eventListeners.set(userId, listeners);

    // Return unsubscribe function
    return () => {
      const currentListeners = this.eventListeners.get(userId) || [];
      const filtered = currentListeners.filter(listener => listener !== callback);
      if (filtered.length === 0) {
        this.eventListeners.delete(userId);
      } else {
        this.eventListeners.set(userId, filtered);
      }
    };
  }

  /**
   * Initialize health status from database or create new
   */
  private async initializeHealthStatus(userId: string, credentialId: string): Promise<void> {
    const supabase = createClient();

    // Try to load existing monitoring data
    const { data: existing } = await supabase
      .from('mt5_connection_monitoring')
      .select('*')
      .eq('user_id', userId)
      .eq('credential_id', credentialId)
      .maybeSingle();

    const key = `${userId}:${credentialId}`;

    if (existing) {
      // Load existing status (defensive read)
      this.healthStatus.set(key, {
        credentialId,
        status: (existing.status as ConnectionStatus) ?? 'unknown',
        responseTime: existing.response_time_ms ?? 0,
        lastChecked: existing.last_check_at ? new Date(existing.last_check_at) : new Date(),
        consecutiveFailures: existing.consecutive_failures ?? 0,
        uptimePercentage: parseFloat((existing.uptime_percentage ?? 100).toString()),
        errorMessage: existing.error_message ?? null,
        metadata: existing.metadata ?? {}
      });
    } else {
      // Create initial status
      const initialHealth: ConnectionHealth = {
        credentialId,
        status: 'unknown',
        responseTime: 0,
        lastChecked: new Date(),
        consecutiveFailures: 0,
        uptimePercentage: 100,
        metadata: {}
      };

      this.healthStatus.set(key, initialHealth);

      // Save to database
      await supabase.from('mt5_connection_monitoring').insert({
        user_id: userId,
        credential_id: credentialId,
        status: initialHealth.status,
        response_time_ms: initialHealth.responseTime,
        last_check_at: initialHealth.lastChecked.toISOString(),
        consecutive_failures: initialHealth.consecutiveFailures,
        uptime_percentage: initialHealth.uptimePercentage,
        total_checks: 0
      });
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(userId: string, config: MonitoringConfig): void {
    const interval = setInterval(async () => {
      await this.performHealthCheck(userId);
    }, config.checkInterval);

    this.checkIntervals.set(userId, interval);

    // Perform initial check shortly after starting
    setTimeout(() => this.performHealthCheck(userId), 1000);
  }

  /**
   * Perform health check for all user credentials
   */
  private async performHealthCheck(userId: string): Promise<void> {
    const storage = getCredentialStorage();
    const credentials = await storage.getUserCredentials(userId);
    const config = this.monitoringConfigs.get(userId);

    if (!config) return;

    for (const credential of credentials) {
      await this.checkCredentialHealth(userId, credential.id, config);
    }
  }

  /**
   * Check health of a specific credential
   */
  private async checkCredentialHealth(
    userId: string,
    credentialId: string,
    config: MonitoringConfig
  ): Promise<void> {
    const key = `${userId}:${credentialId}`;
    const startTime = Date.now();

    try {
      // Get credentials for health check
      const storage = getCredentialStorage();
      const credentials: MT5Credentials | null = await storage.getCredentials(userId, credentialId);
      if (!credentials) {
        await this.updateHealthStatus(userId, credentialId, {
          status: 'error',
          responseTime: 0,
          errorMessage: 'Credentials not found'
        });
        return;
      }

      // Perform connection test (single attempt monitoring)
      const result = await mt5ConnectionManager.validateConnection(credentials, {
        maxAttempts: 1, // Single attempt for monitoring
        initialDelay: 0,
        maxDelay: config.timeout,
        backoffMultiplier: 1
      });

      const responseTime = Date.now() - startTime;

      if (result.isValid) {
        await this.updateHealthStatus(userId, credentialId, {
          status: 'connected',
          responseTime,
          consecutiveFailures: 0,
          // clear error explicitly
          errorMessage: null
        });
      } else {
        const currentHealth = this.healthStatus.get(key);
        const newConsecutiveFailures = (currentHealth?.consecutiveFailures ?? 0) + 1;

        const status: ConnectionStatus =
          newConsecutiveFailures >= config.maxConsecutiveFailures ? 'error' : 'degraded';

        await this.updateHealthStatus(userId, credentialId, {
          status,
          responseTime,
          consecutiveFailures: newConsecutiveFailures,
          // allow value to be string | null | undefined from validation result
          errorMessage: (result as any).errorMessage ?? null
        });
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const currentHealth = this.healthStatus.get(key);
      const newConsecutiveFailures = (currentHealth?.consecutiveFailures ?? 0) + 1;

      await this.updateHealthStatus(userId, credentialId, {
        status: newConsecutiveFailures >= config.maxConsecutiveFailures ? 'error' : 'degraded',
        responseTime,
        consecutiveFailures: newConsecutiveFailures,
        errorMessage: error instanceof Error ? error.message : 'Health check failed'
      });
    }
  }

  /**
   * Update health status and persist to database
   */
  private async updateHealthStatus(
    userId: string,
    credentialId: string,
    updates: Partial<ConnectionHealth>
  ): Promise<void> {
    const key = `${userId}:${credentialId}`;
    const currentHealth = this.healthStatus.get(key);

    if (!currentHealth) return;

    // Calculate new uptime percentage
    const totalChecks = (currentHealth.metadata?.totalChecks ?? 0) + 1;
    const successfulChecks = totalChecks - (updates.consecutiveFailures ?? currentHealth.consecutiveFailures ?? 0);
    const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

    const newHealth: ConnectionHealth = {
      ...currentHealth,
      ...updates,
      lastChecked: new Date(),
      uptimePercentage: Math.max(0, Math.min(100, uptimePercentage)),
      metadata: {
        ...currentHealth.metadata,
        totalChecks,
        lastResponseTime: updates.responseTime ?? currentHealth.responseTime
      }
    };

    // Update in-memory status
    this.healthStatus.set(key, newHealth);

    // Persist to database
    const supabase = createClient();
    await supabase
      .from('mt5_connection_monitoring')
      .upsert({
        user_id: userId,
        credential_id: credentialId,
        status: newHealth.status,
        response_time_ms: newHealth.responseTime,
        last_check_at: newHealth.lastChecked.toISOString(),
        consecutive_failures: newHealth.consecutiveFailures,
        uptime_percentage: newHealth.uptimePercentage,
        // store null explicitly where appropriate
        error_message: newHealth.errorMessage ?? null,
        metadata: newHealth.metadata ?? {},
        total_checks: totalChecks
      });

    // Notify listeners
    const config = this.monitoringConfigs.get(userId);
    if (config?.enableRealTimeUpdates) {
      this.notifyListeners(userId, newHealth);
    }

    // Check for alerts
    await this.checkAlerts(userId, newHealth);
  }

  /**
   * Notify event listeners of health status changes
   */
  private notifyListeners(userId: string, health: ConnectionHealth): void {
    const listeners = this.eventListeners.get(userId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(health);
        } catch (error) {
          console.error('Error in health status listener:', error);
        }
      });
    }
  }

  /**
   * Check for alert conditions and trigger notifications
   */
  private async checkAlerts(userId: string, health: ConnectionHealth): Promise<void> {
    const config = this.monitoringConfigs.get(userId);
    if (!config) return;

    const alerts: string[] = [];

    // Response time alert
    if (health.responseTime > config.alertThresholds.responseTime) {
      alerts.push(`High response time: ${health.responseTime}ms`);
    }

    // Uptime alert
    if (health.uptimePercentage < config.alertThresholds.uptimePercentage) {
      alerts.push(`Low uptime: ${health.uptimePercentage.toFixed(1)}%`);
    }

    // Connection failure alert
    if (health.status === 'error' && health.consecutiveFailures >= config.maxConsecutiveFailures) {
      alerts.push(`Connection failed ${health.consecutiveFailures} times consecutively`);
    }

    // Log alerts to database
    if (alerts.length > 0) {
      const supabase = createClient();
      await supabase.from('mt5_security_audit').insert({
        user_id: userId,
        credential_id: health.credentialId,
        action: 'connection_alert',
        severity: health.status === 'error' ? 'high' : 'medium',
        metadata: {
          alerts,
          health_status: health.status,
          response_time: health.responseTime,
          uptime_percentage: health.uptimePercentage,
          consecutive_failures: health.consecutiveFailures
        }
      });
    }
  }

  /**
   * Force immediate health check for a credential
   */
  async forceHealthCheck(userId: string, credentialId: string): Promise<ConnectionHealth | null> {
    const config = this.monitoringConfigs.get(userId);
    if (!config) return null;

    await this.checkCredentialHealth(userId, credentialId, config);
    return this.getHealthStatus(userId, credentialId);
  }

  /**
   * Get monitoring statistics for a user
   */
  getMonitoringStats(userId: string): {
    totalCredentials: number;
    healthyConnections: number;
    degradedConnections: number;
    failedConnections: number;
    averageResponseTime: number;
    averageUptime: number;
  } {
    const healthStatuses = this.getAllHealthStatuses(userId);

    const stats = {
      totalCredentials: healthStatuses.length,
      healthyConnections: healthStatuses.filter(h => h.status === 'connected').length,
      degradedConnections: healthStatuses.filter(h => h.status === 'degraded').length,
      failedConnections: healthStatuses.filter(h => h.status === 'error').length,
      averageResponseTime: 0,
      averageUptime: 0
    };

    if (healthStatuses.length > 0) {
      stats.averageResponseTime = healthStatuses.reduce((sum, h) => sum + h.responseTime, 0) / healthStatuses.length;
      stats.averageUptime = healthStatuses.reduce((sum, h) => sum + h.uptimePercentage, 0) / healthStatuses.length;
    }

    return stats;
  }
}

// Export singleton instance
export const connectionMonitor = ConnectionMonitor.getInstance();
