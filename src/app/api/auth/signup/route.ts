// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createAdminSupabase } from "@/utils/supabase/admin";
import { sendVerificationEmail } from "@/lib/mailer";

type Body = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  image?: string;
  role?: string;
  trading_style?: string;
  trading_experience?: string;
  country?: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields required." }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createAdminSupabase();
    } catch (e: unknown) {
      console.error("Supabase admin client creation failed:", e);
      return NextResponse.json({ error: "Server misconfiguration: missing Supabase admin key." }, { status: 500 });
    }

    // check existing
    const { data: existing, error: selErr } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      console.error("Select error:", selErr);
      return NextResponse.json({ error: "Database error.", details: selErr.message ?? selErr }, { status: 500 });
    }

    if (existing && existing.email_verified) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString("hex");

    if (existing && !existing.email_verified) {
      // update existing (overwrite password + token)
      const { error: updErr } = await supabase
        .from("users")
        .update({
          name,
          password: hashed,
          verification_token: token,
          updated_at: new Date().toISOString(),
          phone: body.phone || null,
          image: body.image || null,
          role: body.role || "trader",
          trading_style: body.trading_style || null,
          trading_experience: body.trading_experience || null,
          country: body.country || null,
        })
        .eq("email", email);

      if (updErr) {
        console.error("Update error:", updErr);
        const raw = JSON.stringify(updErr, Object.getOwnPropertyNames(updErr));
        return NextResponse.json({ error: "Failed to update user.", details: updErr.message ?? updErr, raw }, { status: 500 });
      }
    } else {
      // create new
      const { error: insErr } = await supabase.from("users").insert({
        name,
        email,
        password: hashed,
        verification_token: token,
        phone: body.phone || null,
        image: body.image || null,
        role: body.role || "trader",
        trading_style: body.trading_style || null,
        trading_experience: body.trading_experience || null,
        country: body.country || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insErr) {
        console.error("Insert error:", insErr);
        // expose raw supabase error for debugging (temporary)
        const raw = JSON.stringify(insErr, Object.getOwnPropertyNames(insErr));
        const msg = (insErr as any)?.message ?? String(insErr);
        if ((insErr as any).code === "23505" || /unique/i.test(msg)) {
          return NextResponse.json({ error: "Email already registered.", details: msg, raw }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create user.", details: msg, raw }, { status: 500 });
      }
    }

    // send verification email (non-blocking but we will wait and report errors)
    try {
      await sendVerificationEmail(email, token);
    } catch (mailErr) {
      console.error("Mail send failed:", mailErr);
      return NextResponse.json(
        { error: "Account created but failed to send verification email. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Account created. Check your email for a verification link." }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
