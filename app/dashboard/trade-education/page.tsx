"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import Spinner from "@/components/ui/spinner";
import TraderEducation from "@/components/dashboard/TraderEducation";
import MobileBackButton from "@/components/ui/MobileBackButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, RefreshCw } from "lucide-react";
import { signOut } from "next-auth/react";
import AnimatedDropdown from "@/components/ui/AnimatedDropdown";
import { Button } from "@/components/ui/button";

function TradeEducationContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userInitial, setUserInitial] = useState("U");

  React.useEffect(() => {
    if (session?.user?.email) {
      setUserInitial(session.user.email.trim()[0].toUpperCase());
    } else if (session?.user?.name) {
      setUserInitial(session.user.name.trim()[0].toUpperCase());
    }
  }, [session]);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return <Spinner />;
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#2a2f3a] bg-[#0D1117]">
            <div className="flex items-center gap-3">
               <MobileBackButton className="mr-2" />
               {/* User Avatar - visible on desktop */}
               <div className="hidden lg:block">
                <AnimatedDropdown
                  title="Account"
                  panelClassName="w-[95%] max-w-sm"
                  positionClassName="left-4 top-16"
                  trigger={
                    <button
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
                      aria-label="Open account menu"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={session?.user?.image ?? ""}
                          alt={session?.user?.name ?? session?.user?.email ?? "Profile"}
                        />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                          {userInitial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-white text-sm font-medium truncate">
                          {session?.user?.name || session?.user?.email?.split("@")[0] || "User"}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {session?.user?.email || ""}
                        </p>
                      </div>
                    </button>
                  }
                >
                  <div className="p-2">
                    <button
                      onClick={() => router.push("/dashboard/profile")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => router.push("/dashboard/settings")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left text-red-400 hover:text-red-300"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </AnimatedDropdown>
              </div>

              <div>
                <h1 className="text-lg md:text-xl font-bold text-white">Trade Education</h1>
                <p className="text-white text-xs sm:text-sm hidden sm:block">
                  Learn trading strategies, tips, and best practices
                </p>
              </div>
            </div>

            {/* Mobile avatar - visible on mobile only */}
            <div className="lg:hidden">
              <AnimatedDropdown
                title="Account"
                panelClassName="w-[95%] max-w-sm"
                trigger={
                  <button
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    aria-label="Open account menu"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={
                          session?.user?.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            session?.user?.name || session?.user?.email?.split("@")[0] || "User"
                          )}&background=3b82f6&color=fff&size=32`
                        }
                        alt={
                          session?.user?.name ||
                          session?.user?.email?.split("@")[0] ||
                          "Profile"
                        }
                      />
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                }
              >
                <div className="p-2">
                  <button
                    onClick={() => router.push("/dashboard/profile")}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/settings")}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left text-red-400 hover:text-red-300"
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              </AnimatedDropdown>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <TraderEducation />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradeEducationPage() {
  return (
    <LayoutClient>
      <UserProvider>
        <TradeEducationContent />
      </UserProvider>
    </LayoutClient>
  );
}
