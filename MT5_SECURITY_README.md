# MT5 Secure Credential Storage & Management

This document explains the secure credential storage system implemented for Tradia's MT5 integration.

## 🔐 Security Overview

The system uses **AES-256-GCM authenticated encryption** to securely store MT5 credentials:

- **Encryption**: AES-256-GCM with unique initialization vectors
- **Key Derivation**: PBKDF2 with user-specific salts
- **Storage**: Encrypted JSON blobs in database
- **Access**: Runtime decryption only when needed
- **Audit**: Comprehensive security logging

## 🛠️ Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Required: Master encryption key (generate securely)
MT5_ENCRYPTION_KEY=your-64-character-hex-key-here

# Optional: Key rotation settings
MT5_KEY_ROTATION_DAYS=90
MT5_MAX_CREDENTIALS_PER_USER=10
```

**Generate a secure encryption key:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### 2. Database Setup

Run the database migration script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of scripts/setup-mt5-database.sql
```

This creates:
- `mt5_credentials` - Encrypted credential storage
- `mt5_connection_history` - Connection audit logs
- `mt5_sync_sessions` - Sync session tracking
- `mt5_connection_monitoring` - Real-time monitoring
- `mt5_security_audit` - Security event logging

### 3. API Endpoints

The system provides these secure endpoints:

#### Store Credentials
```http
POST /api/mt5/credentials
Content-Type: application/json

{
  "server": "ICMarketsSC-MT5",
  "login": "12345678",
  "investorPassword": "your-password",
  "name": "Live Account"
}
```

#### Retrieve Credentials (without password)
```http
GET /api/mt5/credentials
```

#### Update Credentials
```http
PUT /api/mt5/credentials/{id}
Content-Type: application/json

{
  "name": "Updated Account Name",
  "investorPassword": "new-password"  // Optional
}
```

#### Delete Credentials
```http
DELETE /api/mt5/credentials/{id}
```

## 🔑 Key Management

### Master Key Security
- **Never** store the master key in code or version control
- Use environment variables or secure key management service
- Rotate keys periodically (recommended: every 90 days)
- Use different keys for different environments

### User-Specific Keys
- Each user gets a unique encryption key derived from the master key
- Key derivation uses: `HMAC-SHA256(masterKey, userId + context)`
- Prevents cross-user credential access
- Enables individual key rotation

### Key Rotation
```typescript
// Rotate keys for a specific user
await credentialStorage.rotateKeys(userId);

// This will:
// 1. Re-encrypt all credentials with new user key
// 2. Update rotation_required flags
// 3. Log security audit events
```

## 🛡️ Security Features

### Password Validation
- **Strength Assessment**: Checks length, complexity, patterns
- **Security Scoring**: 0-100 scale with recommendations
- **Common Pattern Detection**: Flags weak passwords
- **Broker-Specific Validation**: Recognizes common servers

### Access Control
- **User Isolation**: Users can only access their own credentials
- **Audit Logging**: All credential operations are logged
- **Session Validation**: Requires active authentication
- **Rate Limiting**: Prevents brute force attacks

### Data Protection
- **Memory Wiping**: Sensitive data cleared from memory
- **Encrypted Storage**: AES-256-GCM authenticated encryption
- **Secure Transmission**: HTTPS required for all API calls
- **Backup Security**: Encrypted backups with separate keys

## 📊 Monitoring & Audit

### Security Audit Logs
```sql
-- View recent security events
SELECT * FROM mt5_security_audit
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 50;
```

### Connection History
```sql
-- View connection attempts
SELECT * FROM mt5_connection_history
WHERE user_id = 'your-user-id'
ORDER BY started_at DESC;
```

### Monitoring Dashboard
```sql
-- Check connection health
SELECT
  credential_id,
  status,
  response_time_ms,
  uptime_percentage,
  consecutive_failures
FROM mt5_connection_monitoring
WHERE user_id = 'your-user-id';
```

## 🚨 Security Best Practices

### For Developers
1. **Never log passwords** - Even in debug mode
2. **Use HTTPS only** - All credential operations must be encrypted
3. **Validate inputs** - Server-side validation for all data
4. **Monitor access** - Log all credential operations
5. **Regular audits** - Review security logs periodically

### For Users
1. **Use strong passwords** - Follow the strength recommendations
2. **Enable 2FA** - When available on your MT5 account
3. **Regular rotation** - Change passwords periodically
4. **Monitor activity** - Check connection history regularly
5. **Secure devices** - Use trusted devices for credential management

## 🔧 Troubleshooting

### Common Issues

**"MT5_ENCRYPTION_KEY not set"**
- Ensure the environment variable is properly set
- Check that it's a valid 64-character hex string
- Restart your application after setting the variable

**"Failed to decrypt credentials"**
- The master key may have changed
- Check if key rotation was performed
- Verify the credential wasn't corrupted

**"Invalid credentials format"**
- Check that server and login are properly formatted
- Ensure password meets minimum requirements
- Verify server name is spelled correctly

### Recovery Procedures

**Lost Master Key:**
1. This is unrecoverable - all encrypted credentials are lost
2. Users must re-enter their MT5 credentials
3. Implement proper key backup procedures going forward

**Corrupted Credential:**
1. Delete the corrupted credential
2. Have user re-enter the MT5 credentials
3. The system will re-encrypt with current keys

**Key Rotation Issues:**
1. Check the security audit logs for rotation events
2. Verify all credentials were successfully re-encrypted
3. Rollback to previous key if rotation failed

## 📈 Performance Considerations

### Encryption Overhead
- AES-256-GCM: ~1-2ms per encryption/decryption
- Key derivation: ~0.5ms per operation
- Database queries: Standard Supabase performance

### Scalability
- Supports thousands of users and credentials
- Efficient indexing on frequently queried columns
- Connection pooling for database operations

### Monitoring
- Response time tracking for all operations
- Error rate monitoring and alerting
- Performance metrics collection

## 🔄 Migration Guide

### From Insecure Storage
If you're migrating from plaintext credential storage:

1. **Backup existing data** (if any)
2. **Run database migration** to create new tables
3. **Set up encryption keys** in environment
4. **Update application code** to use new APIs
5. **Migrate existing credentials** (if applicable)
6. **Test thoroughly** before going live

### Code Migration
```typescript
// Old insecure approach
const credentials = {
  server: "ICMarketsSC-MT5",
  login: "12345678",
  password: "plaintext-password"  // ❌ INSECURE
};

// New secure approach
import { credentialStorage } from '@/lib/credential-storage';

const storedCredential = await credentialStorage.storeCredentials(userId, {
  server: "ICMarketsSC-MT5",
  login: "12345678",
  investorPassword: "secure-password",  // ✅ ENCRYPTED
  name: "Live Account"
});
```

## 📞 Support

For security-related issues or questions:
- Check the security audit logs first
- Review connection history for patterns
- Contact the development team with specific error details
- Never share encryption keys or passwords in support requests

---

**Remember**: Security is everyone's responsibility. Always follow the principle of least privilege and regularly review your security practices.