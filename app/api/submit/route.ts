import { NextResponse } from "next/server";
import { submitProblemSolution } from "@/lib/contest-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      participantId,
      participantName,
      contestCode,
      problemId,
      language,
      code,
      tabSwitchCount,
      tabSwitchPenalty,
    } = body;

    if (!participantId || !code || !problemId || !language) {
      return NextResponse.json({ error: "Missing required submission fields" }, { status: 400 });
    }

    const submission = await submitProblemSolution({
      participantId,
      participantName: participantName || "Anonymous Coder",
      contestCode: contestCode || "BLIND2026",
      problemId,
      language,
      code,
      tabSwitchCount: Number(tabSwitchCount || 0),
      tabSwitchPenalty: Number(tabSwitchPenalty || 0),
    });

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Submission error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
