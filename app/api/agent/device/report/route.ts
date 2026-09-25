import { NextResponse } from "next/server";
import { authenticateDeviceRequest } from "@/lib/supabase/bearer-client";
import { logActivity } from "@/lib/data/activity";
import { recordToolExecution } from "@/lib/data/tool-executions";
import type { ActivityStatus } from "@/lib/types";

interface ReportRequestBody {
  intent?: string;
  summary?: string;
  /** "completed" only if the device genuinely verified the outcome —
   *  the Android app must never send this unless verify_contains (or
   *  equivalent) actually passed. Anything else, including a step
   *  failing partway through, must be "failed". */
  status?: ActivityStatus;
  detail?: string;
}

export async function POST(request: Request) {
  const auth = await authenticateDeviceRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing device auth token." }, { status: 401 });
  }
  const { userId, supabase } = auth;

  let body: ReportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const intent = (body.intent ?? "").trim();
  const summary = (body.summary ?? "").trim();
  const status = body.status;
  if (!intent || !summary || (status !== "completed" && status !== "failed")) {
    return NextResponse.json(
      { error: "Missing or invalid intent/summary/status (status must be completed or failed)." },
      { status: 400 }
    );
  }

  const action = body.detail ? `${summary} — ${body.detail}` : summary;

  await logActivity(supabase, {
    userId,
    action,
    tool: "Android Device Agent",
    status,
  });
  await recordToolExecution(supabase, {
    userId,
    toolId: intent,
    toolName: "Android Device Agent",
    status,
    summary: action,
    completed: true,
  });

  return NextResponse.json({ ok: true });
}
