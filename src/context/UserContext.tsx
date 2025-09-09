"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabaseClient";

export type PlanType = "free" | "plus" | "pro" | "elite";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  plan: PlanType;
  country?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface UserContextType {
  user: UserData | null;
  plan: PlanType;
  setPlan: (plan: PlanType) => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [plan, setPlanState] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    if (!session?.user?.email) {
      setUser(null);
      setPlanState("free");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch user data from Supabase
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, name, email, plan, country, email_verified, created_at, last_login')
        .eq('email', session.user.email)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        // Fallback to session data
        setUser({
          id: session.user.id || '',
          name: session.user.name || null,
          email: session.user.email,
          plan: "free",
          emailVerified: false,
          createdAt: new Date().toISOString(),
        });
        // Admin override even if DB lookup failed
        if (session.user.email === 'abdulmuizproject@gmail.com') {
          setPlanState('elite');
        } else {
          setPlanState("free");
        }
      } else {
        const userInfo: UserData = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          plan: userData.plan || "free",
          country: userData.country,
          emailVerified: userData.email_verified || false,
          createdAt: userData.created_at,
          lastLogin: userData.last_login,
        };

        // Admin hard-elevation: ensure admin is always Elite in state and DB
        if (userInfo.email === 'abdulmuizproject@gmail.com') {
          setUser({ ...userInfo, plan: 'elite' });
          setPlanState('elite');
          // Best-effort DB sync (non-blocking)
          try {
            if (userInfo.plan !== 'elite') {
              await supabase.from('users').update({ plan: 'elite', role: 'admin' }).eq('id', userInfo.id);
            }
          } catch (e) {
            console.warn('Admin plan sync skipped:', e);
          }
        } else {
          setUser(userInfo);
          setPlanState(userInfo.plan);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setUser(null);
      // Admin override even on exception
      if (session.user.email === 'abdulmuizproject@gmail.com') {
        setPlanState('elite');
      } else {
        setPlanState("free");
      }
    } finally {
      setLoading(false);
    }
  };

  const setPlan = async (newPlan: PlanType) => {
    if (!user?.id) {
      // If no user data, just update local state
      setPlanState(newPlan);
      return;
    }

    try {
      // Update plan in database
      const { error } = await supabase
        .from('users')
        .update({ plan: newPlan })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating plan:', error);
        return;
      }

      // Update local state
      setPlanState(newPlan);
      setUser(prev => prev ? { ...prev, plan: newPlan } : null);
    } catch (error) {
      console.error('Error in setPlan:', error);
    }
  };

  const refreshUser = async () => {
    await fetchUserData();
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserData();
    } else if (status === 'unauthenticated') {
      setUser(null);
      setPlanState("free");
      setLoading(false);
    }
  }, [session, status]);

  return (
    <UserContext.Provider value={{
      user,
      plan,
      setPlan,
      loading,
      refreshUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

// (add inside UserProvider or export near useUser)
export const isProLike = (plan: PlanType) => plan === "pro" || plan === "plus" || plan === "elite";
