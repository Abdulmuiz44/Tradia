import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // ❌ Redirect unauthenticated users to the sign-in page
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="bg-[#0D1117] min-h-screen w-full">
    <Navbar />  
      <header className="mb-6">
        <h1 className="text-1xl font-bold">Welcome, {session.user?.email}</h1>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
    
  );

}
