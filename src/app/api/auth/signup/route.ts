// app/api/auth/signup/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    // 2. Check if a user already exists (Google or manual)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If the existing account has no password (Google sign-in), add one
      if (!existingUser.password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { email },
          data: { password: hashedPassword, name },
        });
        return NextResponse.json(
          { message: "Password set successfully. You can now log in with credentials." },
          { status: 200 }
        );
      }

      // If account already has password, prevent duplicate signup
      return NextResponse.json(
        {
          error:
            "Email is already registered. Please log in directly or use Google sign-in.",
        },
        { status: 400 }
      );
    }

    // 3. Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // 5. Return safe response
    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
