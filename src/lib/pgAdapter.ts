// lib/pgAdapter.ts
import { Adapter } from "next-auth/adapters";
import { createClient } from "@/utils/supabase/server";

export const PostgresAdapter = (): Adapter => {
  return {
    // Users
  async createUser(user: any) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .insert({
          name: user.name ?? null,
          email: user.email ?? null,
          password: user.password ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },

  async getUser(id: string) {
      const supabase = createClient();
      const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },

  async getUserByEmail(email: string) {
      const supabase = createClient();
      const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
      if (error) throw error;
      return data as any;
    },

  async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      const supabase = createClient();
      const { data: acc, error: accErr } = await supabase
        .from("accounts")
        .select("user_id")
        .eq("provider", provider)
        .eq("provider_account_id", providerAccountId)
        .maybeSingle();
      if (accErr) throw accErr;
      if (!acc || !(acc as any).user_id) return null;
      const uid = (acc as any).user_id as string;
      const { data: user, error: userErr } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
      if (userErr) throw userErr;
      return user as any;
    },

  async updateUser(user: any) {
      const supabase = createClient();
      const updateRow: Record<string, unknown> = {};
      if ("name" in user) updateRow.name = user.name;
      if ("email" in user) updateRow.email = user.email;
      if ("password" in user) updateRow.password = user.password ?? null;
      updateRow.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from("users").update(updateRow).eq("id", user.id).select().maybeSingle();
      if (error) throw error;
      return data as any;
    },

  async deleteUser(id: string) {
      const supabase = createClient();
      await supabase.from("users").delete().eq("id", id);
    },

    // Accounts
  async linkAccount(account: any) {
      const supabase = createClient();
      const row = {
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        access_token: account.access_token ?? account.accessToken ?? null,
        token_type: account.token_type ?? account.tokenType ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? account.idToken ?? null,
        session_state: account.session_state ?? account.sessionState ?? null,
        expires_at: account.expires_at ?? account.expiresAt ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>;
      const { error } = await supabase.from("accounts").insert(row);
      if (error) throw error;
    },

  async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      const supabase = createClient();
      await supabase.from("accounts").delete().eq("provider", provider).eq("provider_account_id", providerAccountId);
    },

    // Sessions
  async createSession(session: any) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          session_token: session.sessionToken,
          user_id: session.userId,
          expires: session.expires,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },

  async getSessionAndUser(sessionToken: string) {
      const supabase = createClient();
      const { data: sess, error: sessErr } = await supabase.from("sessions").select("*").eq("session_token", sessionToken).maybeSingle();
      if (sessErr) throw sessErr;
      if (!sess) return null;
      const uid = (sess as any).user_id as string;
      const { data: user, error: userErr } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
      if (userErr) throw userErr;
      const { id, session_token, user_id, expires, created_at, updated_at } = sess as any;
      return {
        session: { id, sessionToken: session_token, userId: user_id, expires, createdAt: created_at, updatedAt: updated_at },
        user: user as any,
      };
    },

  async updateSession(session: any) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sessions")
        .update({ expires: session.expires, updated_at: new Date().toISOString() })
        .eq("session_token", session.sessionToken)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },

  async deleteSession(sessionToken: string) {
      const supabase = createClient();
      await supabase.from("sessions").delete().eq("session_token", sessionToken);
    },

    // Verification Tokens
  async createVerificationToken(token: any) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("verification_tokens")
        .insert({ identifier: token.identifier, token: token.token, expires: token.expires, created_at: new Date().toISOString() })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },

  async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("verification_tokens")
        .delete()
        .eq("identifier", identifier)
        .eq("token", token)
        .select()
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  };
};
