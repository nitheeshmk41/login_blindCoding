import { NextResponse } from "next/server";
import { getContestState, manualOverrideEvaluation } from "@/lib/contest-store";
import { evaluateSubmissionWithOllama } from "@/lib/ollama";
import { CONTEST_PROBLEMS } from "@/lib/problems";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getContestState();
  return NextResponse.json({
    submissions: state.submissions,
    participants: state.participants,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;
    const state = getContestState();

    if (action === "re_evaluate_ollama") {
      const { submissionId, model, endpoint } = body;
      const sub = state.submissions.find((s) => s.id === submissionId);
      if (!sub) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      const problem = CONTEST_PROBLEMS.find((p) => p.id === sub.problemId) || CONTEST_PROBLEMS[0];

      sub.status = "evaluating";
      const evalResult = await evaluateSubmissionWithOllama({
        code: sub.code,
        language: sub.language,
        problemId: sub.problemId,
        problemTitle: sub.problemTitle,
        problemDescription: problem.description,
        endpoint,
        model,
      });

      sub.evaluation = evalResult;
      sub.status = "completed";

      // Recalculate participant total
      const participant = state.participants.find((p) => p.id === sub.participantId);
      if (participant) {
        const subs = state.submissions.filter((s) => s.participantId === participant.id);
        participant.totalScore = subs.reduce((acc, s) => acc + (s.evaluation?.score || 0), 0);
      }

      return NextResponse.json({ success: true, submission: sub });
    }

    if (action === "manual_override") {
      const { submissionId, score, syntaxErrors, logicErrors, edgeCaseErrors, notes } = body;
      const updated = manualOverrideEvaluation({
        submissionId,
        score,
        syntaxErrors: syntaxErrors || [],
        logicErrors: logicErrors || [],
        edgeCaseErrors: edgeCaseErrors || [],
        notes,
      });

      if (!updated) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, submission: updated });
    }

    return NextResponse.json({ error: "Invalid evaluation action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Evaluation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
