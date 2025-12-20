"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";

export type PlanType = "starter" | "plus" | "pro" | "elite";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  plan: PlanType;
  country?: string;
  emailVerified: boolean;
  createdAt: string;
}

interface UserContextType {
  user: UserData | null;
  plan: PlanType;
  setPlan: (plan: PlanType) => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

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
  const [plan, setPlanState] = useState<PlanType>("starter");
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!session?.user?.email) {
      setUser(null);
      setPlanState("starter");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user data from server-side API (NextAuth session is already validated)
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();

      if (userData) {
        const userInfo: UserData = {
          id: userData.id || session.user.id || '',
          name: userData.name || session.user.name || null,
          email: userData.email || session.user.email || '',
          plan: userData.plan || "starter",
          country: userData.country,
          emailVerified: userData.emailVerified || userData.email_verified || false,
          createdAt: userData.createdAt || userData.created_at || '',
        };

        // Admin hard-elevation: ensure admin is always Elite in state
        if (userInfo.email === 'abdulmuizproject@gmail.com') {
          setUser({ ...userInfo, plan: 'elite' });
          setPlanState('elite');
        } else {
          setUser(userInfo);
          setPlanState(userInfo.plan);
        }
      } else {
        // Fallback to session data if API fails
        setUser({
           id: session.user.id || '',
           name: session.user.name || null,
           email: session.user.email || '',
           plan: 'starter',
           emailVerified: false,
           createdAt: '',
         });
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      // Fallback to session data on error
      setUser({
        id: session.user.id || '',
        name: session.user.name || null,
        email: session.user.email || '',
        plan: session.user.email === 'abdulmuizproject@gmail.com' ? 'elite' : 'starter',
        emailVerified: false,
        createdAt: '',
      });
      if (session.user.email === 'abdulmuizproject@gmail.com') {
        setPlanState('elite');
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  const setPlan = async (newPlan: PlanType) => {
    if (!user?.id) {
      setPlanState(newPlan);
      return;
    }

    try {
      // Update plan via server-side API
      const response = await fetch('/api/user/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (!response.ok) {
        throw new Error('Failed to update plan');
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
      setPlanState("starter");
      setLoading(false);
    }
  }, [status, fetchUserData]);

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
