import { NextResponse } from "next/server";
import {
  getContestState,
  joinLobby,
  startContest,
  startRound2,
  endContest,
  closeContest,
  resetContest,
  updateContestCode,
  toggleBackgroundMusic,
} from "@/lib/contest-store";
import { CONTEST_PROBLEMS } from "@/lib/problems";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getContestState();
  return NextResponse.json({
    contest: {
      code: state.code,
      name: state.name,
      status: state.status,
      currentRound: state.currentRound || 1,
      round2Unlocked: Boolean(state.round2Unlocked),
      backgroundMusicEnabled: state.backgroundMusicEnabled ?? true,
      round1DurationMinutes: state.round1DurationMinutes || 10,
      round2DurationMinutes: state.round2DurationMinutes || 35,
      round1StartedAt: state.round1StartedAt,
      round2StartedAt: state.round2StartedAt,
      startedAt: state.startedAt,
      durationMinutes: state.durationMinutes,
      participantCount: state.participants.length,
      participants: state.participants.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        currentProblemIndex: p.currentProblemIndex,
        completed: p.completed,
        totalScore: p.totalScore,
      })),
      submissionsCount: state.submissions.length,
    },
    problems: CONTEST_PROBLEMS.map((p) => ({
      id: p.id,
      order: p.order,
      title: p.title,
      topic: p.topic,
      difficulty: p.difficulty,
      baseScore: p.baseScore,
      timeLimitMinutes: p.timeLimitMinutes,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "join") {
      const { name, email, phone, code } = body;
      if (!name) {
        return NextResponse.json({ error: "Participant name is required" }, { status: 400 });
      }
      const participant = joinLobby({
        name,
        email: email || "",
        phone: phone || "",
        contestCode: code || "BLIND2026",
      });
      const state = getContestState();
      return NextResponse.json({
        participant,
        contestStatus: state.status,
        currentRound: state.currentRound,
        round2Unlocked: state.round2Unlocked,
        backgroundMusicEnabled: state.backgroundMusicEnabled ?? true,
      });
    }

    if (action === "start") {
      const state = startContest();
      return NextResponse.json({ message: "Contest Round 1 started (10 mins)", state });
    }

    if (action === "start_round_2") {
      const state = startRound2();
      return NextResponse.json({ message: "Contest Round 2 started (35 mins)", state });
    }

    if (action === "toggle_music") {
      const state = toggleBackgroundMusic(body.enabled);
      return NextResponse.json({
        message: `Background music ${state.backgroundMusicEnabled ? "enabled" : "disabled"}`,
        state,
      });
    }

    if (action === "update_code") {
      const { code } = body;
      if (!code || !code.trim()) {
        return NextResponse.json({ error: "Access code cannot be empty" }, { status: 400 });
      }
      const state = updateContestCode(code);
      return NextResponse.json({ message: `Contest access code updated to ${state.code}`, state });
    }

    if (action === "end") {
      const state = endContest();
      return NextResponse.json({ message: "Contest finalized", state });
    }

    if (action === "close") {
      const state = closeContest();
      return NextResponse.json({ message: "Contest closed", state });
    }

    if (action === "reset") {
      const state = resetContest();
      return NextResponse.json({ message: "Contest reset to lobby", state });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
