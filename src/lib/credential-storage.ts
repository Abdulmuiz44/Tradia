// src/lib/credential-storage.ts
import { MT5Credentials, ConnectionError } from '@/types/mt5';
import { encryptionService, EncryptedData } from '@/lib/encryption';
import { createClient } from '@/utils/supabase/server';

export interface StoredCredential {
  id: string;
  userId: string;
  name: string;
  server: string;
  login: string;
  encryptedPassword: EncryptedData;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  rotationRequired: boolean;
  securityLevel: string;
}

export interface CredentialValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityScore: number; // 0-100
}

interface DatabaseCredentialRecord {
  id: string;
  user_id: string;
  name: string;
  server: string;
  login: string;
  encrypted_password: any;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  rotation_required: boolean;
  security_level: string;
}

export class CredentialStorageService {
  private static instance: CredentialStorageService;
  private masterKey: string;

  private constructor() {
    // Get master encryption key from environment
    this.masterKey = process.env.MT5_ENCRYPTION_KEY || '';
    if (!this.masterKey) {
      throw new Error('MT5_ENCRYPTION_KEY environment variable is required');
    }
    if (!encryptionService.isValidKey(this.masterKey)) {
      throw new Error('Invalid MT5_ENCRYPTION_KEY format');
    }
  }

  static getInstance(): CredentialStorageService {
    if (!CredentialStorageService.instance) {
      CredentialStorageService.instance = new CredentialStorageService();
    }
    return CredentialStorageService.instance;
  }

  /**
   * Store MT5 credentials securely
   */
  async storeCredentials(
    userId: string,
    credentials: MT5Credentials
  ): Promise<StoredCredential> {
    const supabase = createClient();

    // Validate credentials before storing
    const validation = await this.validateCredentials(credentials);
    if (!validation.isValid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
    }

    // Derive user-specific encryption key
    const userKey = encryptionService.deriveKey(this.masterKey, userId);

    // Encrypt the password
    const encryptedPassword = encryptionService.encrypt(credentials.investorPassword, userKey);

    // Check for existing credential with same server/login
    const { data: existing } = await supabase
      .from('mt5_credentials')
      .select('id')
      .eq('user_id', userId)
      .eq('server', credentials.server)
      .eq('login', credentials.login)
      .maybeSingle();

    const credentialData = {
      user_id: userId,
      name: (credentials.name || `MT5 ${credentials.login}`).trim(),
      server: credentials.server,
      login: credentials.login,
      encrypted_password: encryptedPassword,
      is_active: true,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rotation_required: false,
      security_level: this.calculateSecurityLevel(credentials, validation) as string
    };

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('mt5_credentials')
        .update(credentialData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return this.transformStoredCredential(data);
    } else {
      // Create new
      const { data, error } = await supabase
        .from('mt5_credentials')
        .insert({
          ...credentialData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformStoredCredential(data);
    }
  }

  /**
   * Retrieve and decrypt MT5 credentials
   */
  async getCredentials(
    userId: string,
    credentialId: string
  ): Promise<MT5Credentials | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('mt5_credentials')
      .select('*')
      .eq('id', credentialId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;

    // Derive user-specific decryption key
    const userKey = encryptionService.deriveKey(this.masterKey, userId);

    try {
      // Decrypt the password
      const decryptedPassword = encryptionService.decrypt(
        data.encrypted_password as EncryptedData,
        userKey
      );

      // Update last used timestamp
      await supabase
        .from('mt5_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', credentialId);

      return {
        server: data.server,
        login: data.login,
        password: decryptedPassword,
        name: data.name || undefined
      };
    } catch (decryptError) {
      console.error('Failed to decrypt credentials:', decryptError);
      throw new Error('Failed to retrieve credentials');
    }
  }

  /**
   * Get all active credentials for a user
   */
  async getUserCredentials(userId: string): Promise<StoredCredential[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('mt5_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false });

    if (error) throw error;

    return data.map((item: DatabaseCredentialRecord) => this.transformStoredCredential(item));
  }

  /**
   * Delete credentials securely
   */
  async deleteCredentials(userId: string, credentialId: string): Promise<void> {
    const supabase = createClient();

    // Instead of hard delete, mark as inactive for audit trail
    const { error } = await supabase
      .from('mt5_credentials')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', credentialId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Mark credentials for rotation (security requirement)
   */
  async markForRotation(userId: string, credentialId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('mt5_credentials')
      .update({
        rotation_required: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', credentialId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Validate credential strength and format
   */
  async validateCredentials(credentials: MT5Credentials): Promise<CredentialValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore = 100;

    // Server validation
    if (!credentials.server || credentials.server.length < 3) {
      errors.push('Server name is required and must be at least 3 characters');
      securityScore -= 30;
    }

    // Login validation
    if (!credentials.login || !/^\d+$/.test(credentials.login)) {
      errors.push('Login must be a valid number');
      securityScore -= 20;
    } else if (credentials.login.length < 5) {
      warnings.push('Login number seems short, please verify');
      securityScore -= 10;
    }

    // Password validation
    if (!credentials.investorPassword) {
      errors.push('Password is required');
      securityScore -= 40;
    } else {
      const passwordStrength = this.assessPasswordStrength(credentials.investorPassword);
      securityScore -= (100 - passwordStrength.score);

      if (passwordStrength.warnings.length > 0) {
        warnings.push(...passwordStrength.warnings);
      }
    }

    // Check for common server names
    const commonServers = ['icmarkets', 'pepperstone', 'fxpro', 'oanda'];
    const serverLower = credentials.server.toLowerCase();
    const isCommonServer = commonServers.some(server => serverLower.includes(server));

    if (!isCommonServer && credentials.server) {
      warnings.push('Unrecognized server name, please verify spelling');
      securityScore -= 5;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityScore: Math.max(0, Math.min(100, securityScore))
    };
  }

  /**
   * Assess password strength
   */
  private assessPasswordStrength(password: string): { score: number; warnings: string[] } {
    let score = 0;
    const warnings: string[] = [];

    if (password.length >= 8) score += 25;
    else warnings.push('Password should be at least 8 characters');

    if (/[A-Z]/.test(password)) score += 20;
    else warnings.push('Include uppercase letters');

    if (/[a-z]/.test(password)) score += 20;
    else warnings.push('Include lowercase letters');

    if (/\d/.test(password)) score += 15;
    else warnings.push('Include numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;
    else warnings.push('Include special characters');

    // Bonus for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 15;
      warnings.push('Avoid repeated characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 20;
      warnings.push('Avoid common sequences');
    }

    return { score: Math.max(0, Math.min(100, score)), warnings };
  }

  /**
   * Calculate security level based on validation results
   */
  private calculateSecurityLevel(
    credentials: MT5Credentials,
    validation: CredentialValidationResult
  ): 'high' | 'medium' | 'low' {
    if (validation.securityScore >= 80) return 'high';
    if (validation.securityScore >= 60) return 'medium';
    return 'low';
  }

  /**
   * Transform database record to StoredCredential
   */
  private transformStoredCredential(data: DatabaseCredentialRecord): StoredCredential {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      server: data.server,
      login: data.login,
      encryptedPassword: data.encrypted_password,
      isActive: data.is_active,
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      rotationRequired: data.rotation_required,
      securityLevel: data.security_level
    };
  }

  /**
   * Rotate encryption keys for all user credentials (maintenance operation)
   */
  async rotateKeys(userId: string): Promise<void> {
    const supabase = createClient();

    const credentials = await this.getUserCredentials(userId);
    const newUserKey = encryptionService.deriveKey(this.masterKey, userId, `rotated-${Date.now()}`);

    for (const credential of credentials) {
      const plainPassword = await this.getCredentials(userId, credential.id);
      if (!plainPassword || !plainPassword.investorPassword) continue;

      const newEncryptedPassword = encryptionService.encrypt(plainPassword.investorPassword, newUserKey);

      await supabase
        .from('mt5_credentials')
        .update({
          encrypted_password: newEncryptedPassword,
          rotation_required: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', credential.id);
    }
  }
}

// Export singleton instance
export const credentialStorage = CredentialStorageService.getInstance();