// src/lib/encryption.ts
import * as crypto from 'crypto';

export interface EncryptedData {
  encrypted: string;
  iv: string; // hex-encoded IV used during encryption
  tag: string; // hex-encoded auth tag (GCM)
  algorithm: string; // e.g. 'aes-256-gcm'
}

/**
 * Secure encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits (bytes)
  private ivLength = 12; // 96 bits recommended for GCM

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
    if (keyBuffer.length !== this.keyLength) {
      throw new Error('Invalid key length for AES-256-GCM');
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv) as crypto.CipherGCM;

    const encryptedBuffer = Buffer.concat([
      cipher.update(Buffer.from(data, 'utf8')),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted: encryptedBuffer.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: this.algorithm,
    };
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(encryptedData: EncryptedData, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== this.keyLength) {
      throw new Error('Invalid key length for AES-256-GCM');
    }

    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const encrypted = Buffer.from(encryptedData.encrypted, 'hex');

    const decipher = crypto.createDecipheriv(
      (encryptedData.algorithm || this.algorithm) as crypto.CipherGCMTypes,
      keyBuffer,
      iv
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    const decryptedBuffer = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decryptedBuffer.toString('utf8');
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
    // HKDF-like derivation using HMAC-SHA256 to create a 32-byte key
    const hmac = crypto.createHmac('sha256', Buffer.from(masterKey, 'hex'));
    hmac.update(`${userId}:${context}`);
    const digest = hmac.digest();
    // Ensure 32 bytes (256 bits)
    const key = digest.length >= this.keyLength ? digest.subarray(0, this.keyLength) : Buffer.concat([digest, Buffer.alloc(this.keyLength - digest.length)]);
    return key.toString('hex');
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
