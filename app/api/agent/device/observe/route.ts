import { NextResponse } from "next/server";
import { authenticateDeviceRequest } from "@/lib/supabase/bearer-client";

interface ScreenElement {
  text?: string | null;
  contentDescription?: string | null;
  className?: string | null;
  viewId?: string | null;
  editable: boolean;
  clickable: boolean;
  visible: boolean;
}

interface ObservationRequestBody {
  packageName?: string | null;
  elements?: ScreenElement[];
}

export async function POST(request: Request) {
  const auth = await authenticateDeviceRequest(request);

  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing device auth token." },
      { status: 401 }
    );
  }

  let body: ObservationRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const packageName = body.packageName ?? null;
  const elements = Array.isArray(body.elements) ? body.elements : [];

  return NextResponse.json({
    ok: true,
    observation: {
      packageName,
      elementCount: elements.length,
      elements,
    },
  });
}
