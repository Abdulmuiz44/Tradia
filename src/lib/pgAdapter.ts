// lib/pgAdapter.ts
import { Adapter } from "next-auth/adapters";
import { pool } from "./db";

export const PostgresAdapter = (): Adapter => {
  return {
    // Users
  async createUser(user: any) {
      const result = await pool.query(
        `INSERT INTO users (name, email, password, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
        [user.name, user.email, user.password ?? null]
      );
      return result.rows[0];
    },

  async getUser(id: string) {
      const result = await pool.query(`SELECT * FROM users WHERE id=$1`, [id]);
      return result.rows[0];
    },

  async getUserByEmail(email: string) {
      const result = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
      return result.rows[0];
    },

  async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      const result = await pool.query(
        `SELECT u.* FROM users u
         JOIN accounts a ON u.id = a.user_id
         WHERE a.provider=$1 AND a.provider_account_id=$2`,
        [provider, providerAccountId]
      );
      return result.rows[0];
    },

  async updateUser(user: any) {
      const result = await pool.query(
        `UPDATE users
         SET name=$1, email=$2, password=$3, updated_at=NOW()
         WHERE id=$4 RETURNING *`,
        [user.name, user.email, user.password ?? null, user.id]
      );
      return result.rows[0];
    },

  async deleteUser(id: string) {
      await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
    },

    // Accounts
  async linkAccount(account: any) {
      await pool.query(
        `INSERT INTO accounts
         (user_id, type, provider, provider_account_id, access_token, token_type, scope, id_token, session_state, expires_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.access_token ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
          account.expires_at ?? null,
        ]
      );
    },

  async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      await pool.query(
        `DELETE FROM accounts WHERE provider=$1 AND provider_account_id=$2`,
        [provider, providerAccountId]
      );
    },

    // Sessions
  async createSession(session: any) {
      const result = await pool.query(
        `INSERT INTO sessions
         (session_token, user_id, expires, created_at, updated_at)
         VALUES ($1,$2,$3,NOW(),NOW()) RETURNING *`,
        [session.sessionToken, session.userId, session.expires]
      );
      return result.rows[0];
    },

  async getSessionAndUser(sessionToken: string) {
      const result = await pool.query(
        `SELECT s.*, u.* FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token=$1`,
        [sessionToken]
      );
      if (!result.rows[0]) return null;

      const { id, session_token, user_id, expires, created_at, updated_at, ...userFields } = result.rows[0];

      return {
        session: { id, sessionToken: session_token, userId: user_id, expires, createdAt: created_at, updatedAt: updated_at },
        user: userFields,
      };
    },

  async updateSession(session: any) {
      const result = await pool.query(
        `UPDATE sessions SET expires=$1, updated_at=NOW() WHERE session_token=$2 RETURNING *`,
        [session.expires, session.sessionToken]
      );
      return result.rows[0];
    },

  async deleteSession(sessionToken: string) {
      await pool.query(`DELETE FROM sessions WHERE session_token=$1`, [sessionToken]);
    },

    // Verification Tokens
  async createVerificationToken(token: any) {
      const result = await pool.query(
        `INSERT INTO verification_tokens
         (identifier, token, expires, created_at)
         VALUES ($1,$2,$3,NOW()) RETURNING *`,
        [token.identifier, token.token, token.expires]
      );
      return result.rows[0];
    },

  async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const result = await pool.query(
        `DELETE FROM verification_tokens
         WHERE identifier=$1 AND token=$2 RETURNING *`,
        [identifier, token]
      );
      return result.rows[0] ?? null;
    },
  };
};
