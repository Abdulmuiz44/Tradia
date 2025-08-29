// src/lib/sync-progress.ts
import { createClient } from "@/utils/supabase/client";

export interface SyncStep {
  name: string;
  description: string;
  weight: number;
}

export interface SyncProgress {
  id: string;
  userId: string;
  accountId: string;
  status: 'running' | 'completed' | 'failed';
  currentStep: string;
  currentStepIndex: number;
  progress: number;
  totalTrades?: number;
  processedTrades?: number;
  newTrades?: number;
  updatedTrades?: number;
  skippedTrades?: number;
  message?: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface SyncOptions {
  canCancel?: boolean;
  metadata?: Record<string, any>;
}

class SyncProgressTracker {
  private supabase = createClient();

  /**
   * Start a new sync session
   */
  async startSync(
    userId: string,
    accountId: string,
    steps: SyncStep[],
    options: SyncOptions = {}
  ): Promise<string> {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const syncData = {
      id: syncId,
      user_id: userId,
      account_id: accountId,
      status: 'running',
      current_step: steps[0]?.name || 'Starting',
      current_step_index: 0,
      progress: 0,
      steps: steps,
      can_cancel: options.canCancel || false,
      metadata: options.metadata || {},
      started_at: new Date().toISOString()
    };

    try {
      const { error } = await this.supabase
        .from('mt5_sync_sessions')
        .insert(syncData);

      if (error) {
        console.error('Failed to start sync session:', error);
        throw error;
      }
    } catch (error) {
      // Fallback to localStorage if database fails
      console.warn('Database sync tracking failed, using localStorage fallback');
      localStorage.setItem(`sync_${syncId}`, JSON.stringify(syncData));
    }

    return syncId;
  }

  /**
   * Update sync progress
   */
  async updateProgress(
    syncId: string,
    updates: Partial<SyncProgress>
  ): Promise<void> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await this.supabase
        .from('mt5_sync_sessions')
        .update(updateData)
        .eq('id', syncId);

      if (error) {
        console.error('Failed to update sync progress:', error);
        throw error;
      }
    } catch (error) {
      // Fallback to localStorage
      try {
        const existing = localStorage.getItem(`sync_${syncId}`);
        if (existing) {
          const data = JSON.parse(existing);
          const updated = { ...data, ...updateData };
          localStorage.setItem(`sync_${syncId}`, JSON.stringify(updated));
        }
      } catch (localError) {
        console.error('LocalStorage fallback failed:', localError);
      }
    }
  }

  /**
   * Complete sync session
   */
  async completeSync(
    syncId: string,
    results: {
      totalTrades?: number;
      newTrades?: number;
      updatedTrades?: number;
      skippedTrades?: number;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    const updateData = {
      status: results.errorMessage ? 'failed' : 'completed',
      total_trades: results.totalTrades || 0,
      new_trades: results.newTrades || 0,
      updated_trades: results.updatedTrades || 0,
      skipped_trades: results.skippedTrades || 0,
      error_message: results.errorMessage || null,
      completed_at: new Date().toISOString(),
      progress: 100
    };

    try {
      const { error } = await this.supabase
        .from('mt5_sync_sessions')
        .update(updateData)
        .eq('id', syncId);

      if (error) {
        console.error('Failed to complete sync session:', error);
        throw error;
      }
    } catch (error) {
      // Fallback to localStorage
      try {
        const existing = localStorage.getItem(`sync_${syncId}`);
        if (existing) {
          const data = JSON.parse(existing);
          const updated = { ...data, ...updateData };
          localStorage.setItem(`sync_${syncId}`, JSON.stringify(updated));
        }
      } catch (localError) {
        console.error('LocalStorage fallback failed:', localError);
      }
    }
  }

  /**
   * Get sync progress
   */
  async getSyncProgress(syncId: string): Promise<SyncProgress | null> {
    try {
      const { data, error } = await this.supabase
        .from('mt5_sync_sessions')
        .select('*')
        .eq('id', syncId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Try localStorage fallback
          const localData = localStorage.getItem(`sync_${syncId}`);
          return localData ? JSON.parse(localData) : null;
        }
        throw error;
      }

      return data as SyncProgress;
    } catch (error) {
      console.error('Failed to get sync progress:', error);

      // Try localStorage fallback
      try {
        const localData = localStorage.getItem(`sync_${syncId}`);
        return localData ? JSON.parse(localData) : null;
      } catch (localError) {
        console.error('LocalStorage fallback failed:', localError);
        return null;
      }
    }
  }

  /**
   * Cancel sync
   */
  async cancelSync(syncId: string): Promise<void> {
    await this.completeSync(syncId, { errorMessage: 'Cancelled by user' });
  }

  /**
   * Get user's recent sync sessions
   */
  async getUserSyncs(userId: string, limit = 10): Promise<SyncProgress[]> {
    try {
      const { data, error } = await this.supabase
        .from('mt5_sync_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as SyncProgress[];
    } catch (error) {
      console.error('Failed to get user syncs:', error);
      return [];
    }
  }

  /**
   * Clean up old sync sessions
   */
  async cleanupOldSyncs(daysOld = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const { error } = await this.supabase
        .from('mt5_sync_sessions')
        .delete()
        .lt('started_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to cleanup old syncs:', error);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const syncProgressTracker = new SyncProgressTracker();