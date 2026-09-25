import { NextResponse } from "next/server";
import { authenticateDeviceRequest } from "@/lib/supabase/bearer-client";
import { parseDeviceCommand } from "@/lib/agent/device-planner";
import { logActivity } from "@/lib/data/activity";
import { recordToolExecution } from "@/lib/data/tool-executions";

interface PlanRequestBody {
  text?: string;
}

const UNRECOGNIZED_REPLY =
  "V0 abhi sirf 'Google par <kuch> search karo' samajhta hai. Try something like: \"Google par AI agent search karo.\"";

export async function POST(request: Request) {
  const auth = await authenticateDeviceRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing device auth token." }, { status: 401 });
  }
  const { userId, supabase } = auth;

  let body: PlanRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text can't be empty." }, { status: 400 });
  }

  const plan = parseDeviceCommand(text);

  if (!plan) {
    await logActivity(supabase, {
      userId,
      action: "Couldn't understand the device command",
      tool: "Android Device Agent",
      status: "failed",
    });
    return NextResponse.json({ error: UNRECOGNIZED_REPLY }, { status: 422 });
  }

  await recordToolExecution(supabase, {
    userId,
    toolId: plan.intent,
    toolName: "Android Device Agent",
    status: "in_progress",
    summary: plan.summary,
  });

  return NextResponse.json({ plan });
}
