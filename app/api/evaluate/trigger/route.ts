import { NextResponse } from "next/server";
import { evaluateAllPendingSubmissions } from "@/lib/contest-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const problemId = body?.problemId;
    const { evaluatedCount } = await evaluateAllPendingSubmissions(problemId);
    return NextResponse.json({ success: true, evaluatedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Trigger evaluation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
