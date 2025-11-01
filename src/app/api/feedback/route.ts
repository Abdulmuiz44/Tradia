// src/app/api/feedback/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
try {
const supabase = createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

const { focus, rating, comment, userAgent, pageUrl, sessionDuration } = await req.json();

if (!focus && !rating && !comment) {
return NextResponse.json({ error: "At least one feedback field is required." }, { status: 400 });
}

// Get additional context from headers
const headers = req.headers;
const actualUserAgent = userAgent || headers.get('user-agent') || '';
const actualPageUrl = pageUrl || headers.get('referer') || '';
const actualSessionDuration = sessionDuration || 0;

const feedbackData = {
  user_id: user.id,
      focus: focus || null,
  rating: rating || null,
comment: comment || null,
user_agent: actualUserAgent,
  page_url: actualPageUrl,
      session_duration: actualSessionDuration,
};

const { error: insertError } = await supabase.from("user_feedback").insert([feedbackData]);

  if (insertError) {
      console.error("Error inserting feedback:", insertError);
      return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Feedback saved successfully. Thank you for helping us improve Tradia!",
      data: {
        focus: feedbackData.focus,
        rating: feedbackData.rating,
        hasComment: !!feedbackData.comment
      }
    });
  } catch (err) {
    console.error("Feedback API error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
