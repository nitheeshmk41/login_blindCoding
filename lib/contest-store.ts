import fs from "fs";
import path from "path";
import { ContestState, Participant, Submission, EvaluationResult } from "./types";
import { CONTEST_PROBLEMS } from "./problems";
import { evaluateSubmissionUnified } from "./ai-evaluator";
import { analyzeCodeHeuristically } from "./ollama";

// In-memory global state across API requests in Node server
const DEFAULT_CONTEST_CODE = "BLIND2026";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contest-state.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error("Failed to create data directory:", e);
  }
}

export function saveStateToJson(state: ContestState) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save contest state to JSON file:", e);
  }
}

export function loadStateFromJson(): ContestState | null {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      if (content.trim()) {
        const parsed = JSON.parse(content) as ContestState;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load contest state from JSON file:", e);
  }
  return null;
}

// Global singleton declaration for Next.js hot-reloading
declare global {
  // eslint-disable-next-line no-var
  var __CONTEST_STATE__: ContestState | undefined;
}

function initializeDefaultState(): ContestState {
  return {
    code: DEFAULT_CONTEST_CODE,
    name: "LOGIN 2K26 // BLIND CODING ARENA",
    status: "WAITING", // Starts in WAITING lobby
    currentRound: 1,
    round2Unlocked: false,
    backgroundMusicEnabled: true,
    round1DurationMinutes: 10,
    round2DurationMinutes: 35,
    durationMinutes: 60,
    startedAt: undefined,
    round1StartedAt: undefined,
    round2StartedAt: undefined,
    participants: [
      {
        id: "p-demo-1",
        name: "ShadowDev_99",
        email: "shadow@psgtech.ac.in",
        phone: "+91 9876543210",
        contestCode: DEFAULT_CONTEST_CODE,
        joinedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        currentProblemIndex: 2,
        completed: true,
        totalScore: 175,
        lastActive: new Date().toISOString(),
      },
      {
        id: "p-demo-2",
        name: "NeonViper",
        email: "viper@psgtech.ac.in",
        phone: "+91 9876543211",
        contestCode: DEFAULT_CONTEST_CODE,
        joinedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        currentProblemIndex: 2,
        completed: true,
        totalScore: 155,
        lastActive: new Date().toISOString(),
      },
      {
        id: "p-demo-3",
        name: "CyberKnight",
        email: "knight@psgtech.ac.in",
        phone: "+91 9876543212",
        contestCode: DEFAULT_CONTEST_CODE,
        joinedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        currentProblemIndex: 1,
        completed: false,
        totalScore: 90,
        lastActive: new Date().toISOString(),
      },
    ],
    submissions: [
      {
        id: "sub-demo-1-p1",
        participantId: "p-demo-1",
        participantName: "ShadowDev_99",
        contestCode: DEFAULT_CONTEST_CODE,
        problemId: "p1-linked-list",
        problemTitle: "Linked List — Remove Duplicates",
        language: "cpp",
        code: `ListNode* removeDuplicates(ListNode* head) {
    if (!head) return nullptr;
    ListNode* current = head;
    while (current != nullptr) {
        ListNode* runner = current;
        while (runner->next != nullptr) {
            if (runner->next->val == current->val) {
                ListNode* temp = runner->next;
                runner->next = runner->next->next;
                delete temp;
            } else {
                runner = runner->next;
            }
        }
        current = current->next;
    }
    return head;
}`,
        submittedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        status: "completed",
        evaluation: {
          score: 100,
          totalDeduction: 0,
          syntaxErrors: [],
          logicErrors: [],
          edgeCaseErrors: [],
          aiFeedback:
            "Superb in-place duplicate removal implementation! O(n²) time, O(1) space with proper node memory cleanup.",
          evaluatedAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
          evaluatorType: "gemini",
          modelUsed: "Gemini 1.5 Flash",
        },
      },
      {
        id: "sub-demo-1-p2",
        participantId: "p-demo-1",
        participantName: "ShadowDev_99",
        contestCode: DEFAULT_CONTEST_CODE,
        problemId: "p2-queues",
        problemTitle: "Circular Queue — Basic Implementation",
        language: "cpp",
        code: `class CircularQueue {
    int arr[5];
    int front = 0, rear = -1, size = 0, CAPACITY = 5;
public:
    bool enqueue(int x) {
        if (isFull()) return false;
        rear = (rear + 1) % CAPACITY;
        arr[rear] = x;
        size++;
        return true;
    }
    bool dequeue() {
        if (isEmpty()) return false;
        front = (front + 1) % CAPACITY;
        size--;
        return true;
    }
    int peek() { return isEmpty() ? -1 : arr[front]; }
    bool isEmpty() { return size == 0; }
    bool isFull() { return size == CAPACITY; }
};`,
        submittedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        status: "completed",
        evaluation: {
          score: 100,
          totalDeduction: 0,
          syntaxErrors: [],
          logicErrors: [],
          edgeCaseErrors: [],
          aiFeedback:
            "Clean ring buffer circular queue! Handles modulo index wrapping, front/rear management, and size tracking cleanly without shifting elements.",
          evaluatedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
          evaluatorType: "ollama",
          modelUsed: "Ollama (Llama 3)",
        },
      },
    ],
  };
}

export function getContestState(): ContestState {
  if (!global.__CONTEST_STATE__) {
    const loaded = loadStateFromJson();
    if (loaded) {
      global.__CONTEST_STATE__ = loaded;
    } else {
      global.__CONTEST_STATE__ = initializeDefaultState();
      saveStateToJson(global.__CONTEST_STATE__);
    }
  } else if (!fs.existsSync(DATA_FILE)) {
    saveStateToJson(global.__CONTEST_STATE__);
  }
  return global.__CONTEST_STATE__;
}

export function updateContestCode(newCode: string): ContestState {
  const state = getContestState();
  const cleanCode = newCode.trim().toUpperCase();
  if (cleanCode) {
    state.code = cleanCode;
    saveStateToJson(state);
  }
  return state;
}

export function joinLobby(params: {
  name: string;
  email?: string;
  phone?: string;
  contestCode: string;
}): Participant {
  const state = getContestState();
  const trimmedCode = params.contestCode.trim().toUpperCase();
  const cleanName = params.name.trim();

  // Strict check against admin-set contest code
  if (trimmedCode !== state.code.toUpperCase()) {
    throw new Error(`Invalid Contest Access Code "${trimmedCode}". Please enter the active code set by the contest administrator.`);
  }

  // Find existing by name/email or create new
  let participant = state.participants.find(
    (p) =>
      p.name.toLowerCase() === cleanName.toLowerCase() &&
      p.contestCode === trimmedCode
  );

  if (!participant) {
    participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: params.email?.trim() || `${cleanName.toLowerCase().replace(/\s+/g, "")}@login2k26.in`,
      phone: params.phone?.trim() || "+91 9999999999",
      contestCode: trimmedCode,
      joinedAt: new Date().toISOString(),
      currentProblemIndex: 0,
      completed: false,
      totalScore: 0,
      lastActive: new Date().toISOString(),
    };
    state.participants.push(participant);
  } else {
    if (params.email) participant.email = params.email.trim();
    if (params.phone) participant.phone = params.phone.trim();
    participant.lastActive = new Date().toISOString();
  }

  saveStateToJson(state);
  return participant;
}

export function startContest(): ContestState {
  const state = getContestState();
  state.status = "ACTIVE";
  state.currentRound = 1;
  state.round2Unlocked = false;
  state.round1StartedAt = new Date().toISOString();
  state.startedAt = new Date().toISOString();
  saveStateToJson(state);
  return state;
}

export function startRound2(): ContestState {
  const state = getContestState();
  state.currentRound = 2;
  state.round2Unlocked = true;
  state.round2StartedAt = new Date().toISOString();
  saveStateToJson(state);
  return state;
}

export function endContest(): ContestState {
  const state = getContestState();
  state.status = "ENDED";
  saveStateToJson(state);
  return state;
}

export function closeContest(): ContestState {
  const state = getContestState();
  state.status = "CLOSED";
  saveStateToJson(state);
  return state;
}

export function toggleBackgroundMusic(enabled?: boolean): ContestState {
  const state = getContestState();
  if (enabled !== undefined) {
    state.backgroundMusicEnabled = enabled;
  } else {
    state.backgroundMusicEnabled = !state.backgroundMusicEnabled;
  }
  saveStateToJson(state);
  return state;
}

export function resetContest(): ContestState {
  global.__CONTEST_STATE__ = initializeDefaultState();
  saveStateToJson(global.__CONTEST_STATE__);
  return global.__CONTEST_STATE__;
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
  const state = getContestState();
  const problem =
    CONTEST_PROBLEMS.find((p) => p.id === data.problemId) || CONTEST_PROBLEMS[0];

  const penalty = Math.max(0, Number(data.tabSwitchPenalty || 0));

  const submission: Submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    participantId: data.participantId,
    participantName: data.participantName,
    contestCode: data.contestCode || state.code,
    problemId: data.problemId,
    problemTitle: problem.title,
    language: data.language,
    code: data.code,
    submittedAt: new Date().toISOString(),
    status: "evaluating",
    tabSwitchCount: data.tabSwitchCount || 0,
    tabSwitchPenalty: penalty,
  };

  state.submissions.push(submission);

  // We no longer trigger evaluation immediately. Just update participant progress.
  submission.status = "pending";

  // Update participant progress and total score
  const participant = state.participants.find((p) => p.id === data.participantId);
  if (participant) {
    if (data.problemId === "p1-linked-list") {
      participant.currentProblemIndex = 1; // Advanced to problem 2
    } else if (data.problemId === "p2-queues") {
      participant.currentProblemIndex = 2; // Completed
      participant.completed = true;
    }

    participant.tabSwitchCount = Math.max(participant.tabSwitchCount || 0, data.tabSwitchCount || 0);
    participant.tabSwitchPenalty = (participant.tabSwitchPenalty || 0) + penalty;

    // Recompute total score across submissions
    const participantSubs = state.submissions.filter(
      (s) => s.participantId === participant.id
    );
    participant.totalScore = participantSubs.reduce(
      (sum, s) => sum + (s.evaluation?.score || 0),
      0
    );
    participant.lastActive = new Date().toISOString();
  }

  saveStateToJson(state);
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
  const state = getContestState();
  const submission = state.submissions.find((s) => s.id === data.submissionId);
  if (!submission) return null;

  const totalDeduction =
    data.syntaxErrors.reduce((a, b) => a + (b.deduction || 0), 0) +
    data.logicErrors.reduce((a, b) => a + (b.deduction || 0), 0) +
    data.edgeCaseErrors.reduce((a, b) => a + (b.deduction || 0), 0);

  const finalScore = Math.max(0, Math.min(100, Number(data.score)));

  submission.status = "manual_reviewed";
  submission.evaluation = {
    score: finalScore,
    totalDeduction,
    syntaxErrors: data.syntaxErrors,
    logicErrors: data.logicErrors,
    edgeCaseErrors: data.edgeCaseErrors,
    aiFeedback: submission.evaluation?.aiFeedback || "Evaluated by judge.",
    evaluatedAt: new Date().toISOString(),
    evaluatorType: "manual",
    manualNotes: data.notes,
    isManuallyOverridden: true,
  };

  // Recompute participant total score
  const participant = state.participants.find(
    (p) => p.id === submission.participantId
  );
  if (participant) {
    const participantSubs = state.submissions.filter(
      (s) => s.participantId === participant.id
    );
    participant.totalScore = participantSubs.reduce(
      (sum, s) => sum + (s.evaluation?.score || 0),
      0
    );
  }

  saveStateToJson(state);
  return submission;
}

export async function evaluateAllPendingSubmissions(problemIdFilter?: string): Promise<{ evaluatedCount: number }> {
  const state = getContestState();
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
    submission.status = "evaluating";
    
    const problem = CONTEST_PROBLEMS.find((p) => p.id === submission.problemId) || CONTEST_PROBLEMS[0];
    const penalty = submission.tabSwitchPenalty || 0;

    try {
      const evaluation = await evaluateSubmissionUnified({
        code: submission.code,
        language: submission.language,
        problemId: submission.problemId,
        problemTitle: problem.title,
        problemDescription: problem.description,
        tabSwitchPenalty: penalty,
      });

      submission.evaluation = evaluation;
      submission.status = "completed";
    } catch (err) {
      submission.evaluation = analyzeCodeHeuristically(
        submission.code,
        submission.language as any,
        submission.problemId,
        penalty
      );
      submission.status = "completed";
    }

    evaluatedCount++;
    
    // Recompute participant total score
    const participant = state.participants.find((p) => p.id === submission.participantId);
    if (participant) {
      const participantSubs = state.submissions.filter((s) => s.participantId === participant.id);
      participant.totalScore = participantSubs.reduce((sum, s) => sum + (s.evaluation?.score || 0), 0);
    }
  }

  saveStateToJson(state);
  return { evaluatedCount };
}


export function getWinnersExport() {
  const state = getContestState();
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

export function getParticipantsExport() {
  const state = getContestState();
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
