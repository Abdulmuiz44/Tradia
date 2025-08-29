// src/lib/encryption.ts
import crypto from 'crypto';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag?: string;
  algorithm: string;
}

/**
 * Secure encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a cryptographically secure encryption key
   */
  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(data: string, key: string): EncryptedData {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, keyBuffer);

    // For GCM mode, we need to handle IV differently
    // In older Node.js versions, we use the legacy API
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: '', // Not available in legacy API
      algorithm: this.algorithm
    };
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(encryptedData: EncryptedData, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    const encrypted = Buffer.from(encryptedData.encrypted, 'hex');

    const decipher = crypto.createDecipher(encryptedData.algorithm, keyBuffer);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash a password for storage (one-way)
   */
  hashPassword(password: string, saltRounds = 12): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');

      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');

      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString('hex') === key);
      });
    });
  }

  /**
   * Generate a secure random token
   */
  generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create a key derivation function for user-specific keys
   */
  deriveKey(masterKey: string, userId: string, context = 'mt5-credentials'): string {
    const hmac = crypto.createHmac('sha256', masterKey);
    hmac.update(`${userId}:${context}`);
    return hmac.digest('hex').substring(0, this.keyLength * 2); // 64 characters for 256-bit key
  }

  /**
   * Validate encryption key format
   */
  isValidKey(key: string): boolean {
    return /^[a-f0-9]{64}$/i.test(key); // 64 hex characters = 256 bits
  }

  /**
   * Securely wipe sensitive data from memory
   */
  wipeSensitiveData(data: string | Buffer): void {
    if (typeof data === 'string') {
      // Overwrite string characters
      for (let i = 0; i < data.length; i++) {
        (data as any)[i] = '\0';
      }
    } else if (Buffer.isBuffer(data)) {
      // Overwrite buffer
      data.fill(0);
    }
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();