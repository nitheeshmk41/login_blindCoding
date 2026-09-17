import { NextResponse } from "next/server";
import {
  getContestState,
  joinLobby,
  startContest,
  startRound1,
  startRound2,
  publishResults,
  endContest,
  closeContest,
  resetContest,
  updateContestCode,
  toggleBackgroundMusic,
  skipContestTrack,
} from "@/lib/contest-store";
import { CONTEST_PROBLEMS } from "@/lib/problems";
import { updateContestSettings } from "@/lib/sqlite-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getContestState();
  return NextResponse.json({
    contest: {
      code: state.code,
      name: state.name,
      status: state.status,
      currentRound: state.currentRound ?? 0,
      round1Unlocked: Boolean(state.round1Unlocked),
      round2Unlocked: Boolean(state.round2Unlocked),
      resultsPublished: Boolean(state.resultsPublished),
      backgroundMusicEnabled: state.backgroundMusicEnabled ?? true,
      backgroundMusicVolume: state.backgroundMusicVolume ?? 0.25,
      currentTrackIndex: state.currentTrackIndex ?? 0,
      demoDurationMinutes: state.demoDurationMinutes || 5,
      round1DurationMinutes: state.round1DurationMinutes || 25,
      round2DurationMinutes: state.round2DurationMinutes || 30,
      demoBufferMinutes: state.demoBufferMinutes || 2,
      round1BufferMinutes: state.round1BufferMinutes || 10,
      round2BufferMinutes: state.round2BufferMinutes || 10,
      demoStartedAt: state.demoStartedAt,
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
      isDemo: p.isDemo,
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
        round1Unlocked: state.round1Unlocked,
        round2Unlocked: state.round2Unlocked,
        resultsPublished: state.resultsPublished,
        backgroundMusicEnabled: state.backgroundMusicEnabled ?? true,
      });
    }

    if (action === "start" || action === "start_demo") {
      const state = startContest();
      return NextResponse.json({ message: "Demo Round (Q1 · 5 Mins) started", state });
    }

    if (action === "start_round_1") {
      const state = startRound1();
      return NextResponse.json({ message: "Round 1 (Q2 Stack · 25 Mins) started", state });
    }

    if (action === "start_round_2") {
      const state = startRound2();
      return NextResponse.json({ message: "Round 2 (Q3 Linked List · 30 Mins) started", state });
    }

    if (action === "publish_results") {
      const state = publishResults();
      return NextResponse.json({ message: "Final Results & Leaderboard Published!", state });
    }

    if (action === "toggle_music") {
      const state = toggleBackgroundMusic(body.enabled);
      return NextResponse.json({
        message: `Background music ${state.backgroundMusicEnabled ? "enabled" : "disabled"}`,
        state,
      });
    }

    if (action === "set_music_volume") {
      const vol = Math.max(0, Math.min(1, Number(body.volume ?? 0.25)));
      const state = updateContestSettings(body.code || "BLIND2026", { backgroundMusicVolume: vol });
      return NextResponse.json({
        message: `Background music volume set to ${Math.round(vol * 100)}%`,
        state,
      });
    }

    if (action === "skip_track" || action === "next_track") {
      const state = skipContestTrack();
      return NextResponse.json({
        message: `Background music track skipped to track ${state.currentTrackIndex! + 1}`,
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
    const isValidationError = message.includes("Invalid Contest Access Code") || message.includes("required") || message.includes("cannot be empty");
    return NextResponse.json({ error: message }, { status: isValidationError ? 400 : 500 });
  }
}
