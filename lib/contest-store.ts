import { ContestState, Participant, Submission } from "./types";
import { CONTEST_PROBLEMS } from "./problems";
import { evaluateSubmissionUnified } from "./ai-evaluator";
import { analyzeCodeHeuristically } from "./ollama";
import {
  getContestSettings,
  updateContestSettings,
  updateContestCodeInDb,
  addOrGetParticipant,
  updateParticipantInDb,
  addSubmissionToDb,
  updateSubmissionInDb,
  resetDbContest,
  purgeDuplicateParticipants,
  db,
} from "./sqlite-db";

const DEFAULT_CONTEST_CODE = "BLIND2026";

export function getContestState(_code?: string): ContestState {
  return getContestSettings();
}

export function updateContestCode(newCode: string): ContestState {
  return updateContestCodeInDb(newCode);
}

export function joinLobby(params: {
  name: string;
  email?: string;
  phone?: string;
  contestCode: string;
}): Participant {
  const trimmedCode = params.contestCode.trim().toUpperCase();
  const state = getContestSettings(trimmedCode);

  // Strict check against contest code
  if (trimmedCode !== state.code.toUpperCase()) {
    throw new Error(
      `Invalid Contest Access Code "${trimmedCode}". Please enter the active code set by the contest administrator.`
    );
  }

  // Deduplicate and get isolated participant from SQLite
  return addOrGetParticipant({
    name: params.name,
    email: params.email?.trim() || `${params.name.trim().toLowerCase().replace(/\s+/g, "")}@login2k26.in`,
    phone: params.phone?.trim() || "+91 9999999999",
    contestCode: trimmedCode,
  });
}

export function startContest(code: string = DEFAULT_CONTEST_CODE): ContestState {
  return updateContestSettings(code, {
    status: "ACTIVE",
    currentRound: 0, // Start Demo Q1 (5 Mins)
    round1Unlocked: false,
    round2Unlocked: false,
    resultsPublished: false,
    demoStartedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  });
}

export function startRound1(code: string = DEFAULT_CONTEST_CODE): ContestState {
  return updateContestSettings(code, {
    status: "ACTIVE",
    currentRound: 1, // Start Problem 1 Stack (25 Mins)
    round1Unlocked: true,
    round1StartedAt: new Date().toISOString(),
  });
}

export function startRound2(code: string = DEFAULT_CONTEST_CODE): ContestState {
  return updateContestSettings(code, {
    status: "ACTIVE",
    currentRound: 2, // Start Problem 2 Linked List (30 Mins)
    round2Unlocked: true,
    round2StartedAt: new Date().toISOString(),
  });
}

export function publishResults(code: string = DEFAULT_CONTEST_CODE): ContestState {
  return updateContestSettings(code, {
    resultsPublished: true,
    status: "ENDED",
  });
}

export function endContest(code: string = DEFAULT_CONTEST_CODE): ContestState {
  return updateContestSettings(code, {
    status: "ENDED",
  });
}

export function closeContest(code: string = DEFAULT_CONTEST_CODE): ContestState {
  return updateContestSettings(code, {
    status: "CLOSED",
  });
}

export function toggleBackgroundMusic(enabled?: boolean, code: string = DEFAULT_CONTEST_CODE): ContestState {
  const current = getContestSettings(code);
  const nextVal = enabled !== undefined ? enabled : !current.backgroundMusicEnabled;
  return updateContestSettings(code, {
    backgroundMusicEnabled: nextVal,
  });
}

export function skipContestTrack(): ContestState {
  const current = getContestSettings();
  const nextIdx = ((current.currentTrackIndex || 0) + 1) % 3;
  return updateContestSettings(undefined, { currentTrackIndex: nextIdx });
}

export function resetContest(code: string = DEFAULT_CONTEST_CODE): ContestState {
  resetDbContest(code);
  return getContestSettings(code);
}

export async function submitProblemSolution(data: {
  participantId: string;
  participantName: string;
  contestCode: string;
  problemId: string;
  language: any;
  code: string;
  tabSwitchCount?: number;
  tabSwitchPenalty?: number;
}): Promise<Submission> {
  const code = data.contestCode || DEFAULT_CONTEST_CODE;
  const problem = CONTEST_PROBLEMS.find((p) => p.id === data.problemId) || CONTEST_PROBLEMS[0];
  const penalty = Math.max(0, Number(data.tabSwitchPenalty || 0));

  const submission: Submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    participantId: data.participantId,
    participantName: data.participantName,
    contestCode: code,
    problemId: data.problemId,
    problemTitle: problem.title,
    language: data.language,
    code: data.code,
    submittedAt: new Date().toISOString(),
    status: "pending",
    tabSwitchCount: data.tabSwitchCount || 0,
    tabSwitchPenalty: penalty,
  };

  const isDemoSub = problem.isDemo || data.problemId === "p1-demo-array";

  // If Demo question (p1-demo-array), no marks, no evaluation, and DO NOT STORE in DB
  if (isDemoSub) {
    submission.status = "completed";
    submission.evaluation = {
      score: 0,
      totalDeduction: 0,
      syntaxErrors: [],
      logicErrors: [],
      edgeCaseErrors: [],
      aiFeedback: "Demo question completed. No evaluation or storage required.",
      evaluatedAt: new Date().toISOString(),
      evaluatorType: "heuristic_fallback",
    };
  } else {
    // Only save real contest problem submissions to SQLite
    addSubmissionToDb(submission);
  }

  // Update participant progress in SQLite
  const state = getContestSettings(code);
  const participant = state.participants.find((p) => p.id === data.participantId);

  if (participant) {
    let nextIndex = participant.currentProblemIndex;
    let isCompleted = participant.completed;

    if (data.problemId === "p1-demo-array") {
      nextIndex = 1;
    } else if (data.problemId === "p2-stack-lodge") {
      nextIndex = 2;
    } else if (data.problemId === "p3-linkedlist-gang") {
      nextIndex = 3;
      isCompleted = true;
    }

    const nextTabCount = Math.max(participant.tabSwitchCount || 0, data.tabSwitchCount || 0);
    const nextPenalty = (participant.tabSwitchPenalty || 0) + penalty;

    // Recompute total score (excluding demo question)
    const allSubs = state.submissions.filter(
      (s) => s.participantId === participant.id && s.problemId !== "p1-demo-array"
    );
    const currentScore = isDemoSub ? 0 : (submission.evaluation?.score || 0);
    const totalScore = allSubs.reduce((sum, s) => sum + (s.evaluation?.score || 0), 0) + currentScore;

    updateParticipantInDb(participant.id, {
      currentProblemIndex: nextIndex,
      completed: isCompleted,
      totalScore,
      lastActive: new Date().toISOString(),
      tabSwitchCount: nextTabCount,
      tabSwitchPenalty: nextPenalty,
    });
  }

  return submission;
}

export function manualOverrideEvaluation(data: {
  submissionId: string;
  score: number;
  syntaxErrors: any[];
  logicErrors: any[];
  edgeCaseErrors: any[];
  notes?: string;
  isPreferred?: boolean;
}): Submission | null {
  const subRow = db.prepare("SELECT * FROM submissions WHERE id = ?").get(data.submissionId) as any;
  if (!subRow) return null;

  const totalDeduction =
    data.syntaxErrors.reduce((a, b) => a + (b.deduction || 0), 0) +
    data.logicErrors.reduce((a, b) => a + (b.deduction || 0), 0) +
    data.edgeCaseErrors.reduce((a, b) => a + (b.deduction || 0), 0);

  const finalScore = Math.max(0, Math.min(100, Number(data.score)));

  const existingEval = subRow.evaluationJson ? JSON.parse(subRow.evaluationJson) : {};

  const updatedEvaluation = {
    score: finalScore,
    totalDeduction,
    syntaxErrors: data.syntaxErrors,
    logicErrors: data.logicErrors,
    edgeCaseErrors: data.edgeCaseErrors,
    aiFeedback: existingEval.aiFeedback || "Evaluated by judge.",
    evaluatedAt: new Date().toISOString(),
    evaluatorType: "manual" as any,
    manualNotes: data.notes,
    isManuallyOverridden: true,
  };

  updateSubmissionInDb(data.submissionId, {
    status: "manual_reviewed" as any,
    evaluation: updatedEvaluation,
  });

  // Recompute participant total score in SQLite
  const code = subRow.contestCode || DEFAULT_CONTEST_CODE;
  const state = getContestSettings(code);
  const participant = state.participants.find((p) => p.id === subRow.participantId);

  if (participant) {
    const participantSubs = state.submissions.filter(
      (s) => s.participantId === participant.id && s.problemId !== "p1-demo-array"
    );
    const totalScore = participantSubs.reduce(
      (sum, s) => (s.id === data.submissionId ? sum + finalScore : sum + (s.evaluation?.score || 0)),
      0
    );
    updateParticipantInDb(participant.id, { totalScore });
  }

  return {
    id: subRow.id,
    participantId: subRow.participantId,
    participantName: subRow.participantName,
    contestCode: subRow.contestCode,
    problemId: subRow.problemId,
    problemTitle: subRow.problemTitle,
    language: subRow.language,
    code: subRow.code,
    submittedAt: subRow.submittedAt,
    status: "manual_reviewed" as any,
    evaluation: updatedEvaluation,
    tabSwitchCount: subRow.tabSwitchCount,
    tabSwitchPenalty: subRow.tabSwitchPenalty,
  };
}

export async function evaluateAllPendingSubmissions(problemIdFilter?: string, code: string = DEFAULT_CONTEST_CODE): Promise<{ evaluatedCount: number }> {
  const state = getContestSettings(code);
  const pendingSubmissions = state.submissions.filter((s) => {
    const isPending = s.status === "pending" || s.status === "evaluating";
    if (!isPending) return false;
    if (problemIdFilter && problemIdFilter !== "all") {
      return s.problemId === problemIdFilter;
    }
    return true;
  });

  let evaluatedCount = 0;

  for (const submission of pendingSubmissions) {
    updateSubmissionInDb(submission.id, { status: "evaluating" as any });

    const problem = CONTEST_PROBLEMS.find((p) => p.id === submission.problemId) || CONTEST_PROBLEMS[0];
    const penalty = submission.tabSwitchPenalty || 0;

    let evaluation;
    try {
      evaluation = await evaluateSubmissionUnified({
        code: submission.code,
        language: submission.language,
        problemId: submission.problemId,
        problemTitle: problem.title,
        problemDescription: problem.description,
        tabSwitchPenalty: penalty,
      });
    } catch (err) {
      evaluation = analyzeCodeHeuristically(
        submission.code,
        submission.language as any,
        submission.problemId,
        penalty
      );
    }

    updateSubmissionInDb(submission.id, {
      status: "completed" as any,
      evaluation,
    });

    evaluatedCount++;

    // Recompute participant total score in SQLite
    const updatedState = getContestSettings(code);
    const participant = updatedState.participants.find((p) => p.id === submission.participantId);
    if (participant) {
      const participantSubs = updatedState.submissions.filter(
        (s) => s.participantId === participant.id && s.problemId !== "p1-demo-array"
      );
      const totalScore = participantSubs.reduce((sum, s) => sum + (s.evaluation?.score || 0), 0);
      updateParticipantInDb(participant.id, { totalScore });
    }
  }

  return { evaluatedCount };
}

export function getWinnersExport(code: string = DEFAULT_CONTEST_CODE) {
  const state = getContestSettings(code);
  // Code-wise sorted participants
  const sorted = [...state.participants].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
  });

  return sorted.map((p, idx) => ({
    rank: idx + 1,
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    totalScore: p.totalScore,
    completed: p.completed,
    contestCode: p.contestCode,
    joinedAt: p.joinedAt,
    lastActive: p.lastActive,
    tabSwitchCount: p.tabSwitchCount || 0,
    tabSwitchPenalty: p.tabSwitchPenalty || 0,
  }));
}

export function getParticipantsExport(code: string = DEFAULT_CONTEST_CODE) {
  const state = getContestSettings(code);
  return state.participants.map((p, idx) => ({
    slNo: idx + 1,
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    contestCode: p.contestCode,
    joinedAtDate: new Date(p.joinedAt).toLocaleDateString(),
    joinedAtTime: new Date(p.joinedAt).toLocaleTimeString(),
    joinedAtISO: p.joinedAt,
    lastActiveDate: new Date(p.lastActive).toLocaleDateString(),
    lastActiveTime: new Date(p.lastActive).toLocaleTimeString(),
    lastActiveISO: p.lastActive,
    currentProblemIndex: p.currentProblemIndex,
    completed: p.completed,
    totalScore: p.totalScore,
  }));
}
