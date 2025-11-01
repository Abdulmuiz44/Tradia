import { NextResponse } from 'next/server';

export async function GET() {
  const trialInfo = {
    isGrandfathered: false,
    isPaid: true, // Assuming the user is paid to hide the banner
    signupAt: null,
    trialEndsAt: null,
    daysLeft: null,
    expired: false,
  };

  return NextResponse.json({ info: trialInfo });
}