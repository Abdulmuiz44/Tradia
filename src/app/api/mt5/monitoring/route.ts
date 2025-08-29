// src/app/api/mt5/monitoring/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectionMonitor } from "@/lib/connection-monitor";
import { createClient } from "@/utils/supabase/server";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * GET /api/mt5/monitoring
 * Get monitoring status for all user credentials
 */
export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userEmail = asString(session?.user?.email);
    if (!userEmail) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get user from database
    const supabase = createClient();
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    // Get monitoring statistics
    const stats = connectionMonitor.getMonitoringStats(user.id);
    const healthStatuses = connectionMonitor.getAllHealthStatuses(user.id);

    return NextResponse.json({
      success: true,
      monitoring: {
        isActive: true, // Assume monitoring is active if endpoint is called
        stats,
        credentials: healthStatuses.map(health => ({
          credentialId: health.credentialId,
          status: health.status,
          responseTime: health.responseTime,
          lastChecked: health.lastChecked,
          consecutiveFailures: health.consecutiveFailures,
          uptimePercentage: health.uptimePercentage,
          errorMessage: health.errorMessage
        }))
      }
    });

  } catch (err) {
    console.error("MT5 monitoring GET error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mt5/monitoring
 * Control monitoring (start/stop/force check)
 */
export async function POST(req: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userEmail = asString(session?.user?.email);
    if (!userEmail) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get user from database
    const supabase = createClient();
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json() as {
      action: 'start' | 'stop' | 'force_check' | 'get_status';
      credentialId?: string;
      config?: {
        checkInterval?: number;
        timeout?: number;
        maxConsecutiveFailures?: number;
        enableRealTimeUpdates?: boolean;
      };
    };

    const { action, credentialId, config } = body;

    switch (action) {
      case 'start':
        await connectionMonitor.startMonitoring(user.id, config);
        return NextResponse.json({
          success: true,
          message: "Connection monitoring started",
          config
        });

      case 'stop':
        connectionMonitor.stopMonitoring(user.id);
        return NextResponse.json({
          success: true,
          message: "Connection monitoring stopped"
        });

      case 'force_check':
        if (!credentialId) {
          return NextResponse.json(
            { error: "MISSING_CREDENTIAL_ID", message: "credentialId is required for force_check" },
            { status: 400 }
          );
        }

        const health = await connectionMonitor.forceHealthCheck(user.id, credentialId);
        if (!health) {
          return NextResponse.json(
            { error: "CREDENTIAL_NOT_FOUND", message: "Credential not found or not being monitored" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Health check completed",
          health: {
            credentialId: health.credentialId,
            status: health.status,
            responseTime: health.responseTime,
            lastChecked: health.lastChecked,
            consecutiveFailures: health.consecutiveFailures,
            uptimePercentage: health.uptimePercentage,
            errorMessage: health.errorMessage
          }
        });

      case 'get_status':
        const stats = connectionMonitor.getMonitoringStats(user.id);
        const healthStatuses = connectionMonitor.getAllHealthStatuses(user.id);

        return NextResponse.json({
          success: true,
          monitoring: {
            isActive: true,
            stats,
            credentials: healthStatuses.map(health => ({
              credentialId: health.credentialId,
              status: health.status,
              responseTime: health.responseTime,
              lastChecked: health.lastChecked,
              consecutiveFailures: health.consecutiveFailures,
              uptimePercentage: health.uptimePercentage,
              errorMessage: health.errorMessage
            }))
          }
        });

      default:
        return NextResponse.json(
          { error: "INVALID_ACTION", message: "Invalid action. Must be: start, stop, force_check, or get_status" },
          { status: 400 }
        );
    }

  } catch (err) {
    console.error("MT5 monitoring POST error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Internal server error" },
      { status: 500 }
    );
  }
}