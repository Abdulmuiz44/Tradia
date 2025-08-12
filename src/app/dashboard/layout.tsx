// app/dashboard/layout.tsx

import { ReactNode } from "react";
import Footer from "@/components/Footer";  // Import Footer component

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative bg-[#0D1117] text-white min-h-screen w-full flex flex-col">  
    
      {/* Top spacing */}
      <div className="pt-1  px-1 flex-grow">
        {children}
      </div>

      {/* Fixed Footer */}
      <Footer />

    </div>
  );
}
