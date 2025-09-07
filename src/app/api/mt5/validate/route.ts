import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { validateAccount } from "@/lib/mtapi";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { server, login, investorPassword } = await req.json();
    if (!server || !login || !investorPassword) {
      return NextResponse.json(
        { error: "Server, login, and password are required" },
        { status: 400 }
      );
    }

    const { account_info } = await validateAccount({
      server,
      login,
      password: investorPassword,
    });

    return NextResponse.json({
      success: true,
      accountInfo: account_info,
      message: "MT5 connection validated successfully",
    });
  } catch (err) {
    console.error("Validate API error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
