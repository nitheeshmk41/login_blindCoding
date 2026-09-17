export type SupportedLanguage = "cpp" | "java" | "javascript" | "python" | "c";

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  order: number;
  title: string;
  topic: string;
  difficulty: "Easy" | "Medium";
  isDemo?: boolean;
  baseScore: number; // 0 for demo, 100 for Q2 & Q3
  timeLimitMinutes: number; // 5 for Q1, 25 for Q2, 30 for Q3
  description: string;
  inputFormat: string;
  outputFormat: string;
  examples: ProblemExample[];
  constraints: string[];
  hints?: string[];
  solutionGuide?: string;
  starterCode: Record<SupportedLanguage, string>;
}

export interface ErrorItem {
  id: string;
  type: "syntax" | "logic" | "edge_case";
  line?: number;
  message: string;
  deduction: number;
}

export interface EvaluationResult {
  score: number; // 100 - totalDeduction - tabSwitchPenalty (clamped at 0..100)
  totalDeduction: number;
  tabSwitchPenalty?: number;
  syntaxErrors: ErrorItem[];
  logicErrors: ErrorItem[];
  edgeCaseErrors: ErrorItem[];
  aiFeedback: string;
  evaluatedAt: string;
  evaluatorType: AiProvider | "manual";
  modelUsed?: string;
  manualNotes?: string;
  isManuallyOverridden?: boolean;
}

export interface Submission {
  id: string;
  participantId: string;
  participantName: string;
  contestCode: string;
  problemId: string;
  problemTitle: string;
  language: SupportedLanguage;
  code: string;
  submittedAt: string;
  status: "pending" | "evaluating" | "completed" | "manual_reviewed";
  tabSwitchCount?: number;
  tabSwitchPenalty?: number;
  evaluation?: EvaluationResult;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string;
  contestCode: string;
  joinedAt: string;
  currentProblemIndex: number; // 0 for problem 1, 1 for problem 2, 2 for completed
  completed: boolean;
  totalScore: number;
  tabSwitchCount?: number;
  tabSwitchPenalty?: number;
  lastActive: string;
}

export type AiProvider = "openrouter" | "gemini" | "ollama" | "openai" | "heuristic_fallback";

export type ContestStatus = "WAITING" | "ACTIVE" | "ENDED" | "CLOSED";

export interface ContestState {
  code: string;
  name: string;
  status: ContestStatus;
  currentRound: 0 | 1 | 2; // 0 = Q1 Demo (5m), 1 = Q2 Stack (25m), 2 = Q3 Linked List (30m)
  round1Unlocked: boolean; // Starts Q2 (Stack)
  round2Unlocked: boolean; // Starts Q3 (Linked List)
  resultsPublished: boolean; // Unlocks leaderboard for candidates
  backgroundMusicEnabled?: boolean;
  backgroundMusicVolume?: number; // Volume scale 0.0 to 1.0 (default 0.25 = 25%)
  currentTrackIndex?: number; // 0, 1, or 2
  demoStartedAt?: string;
  round1StartedAt?: string;
  round2StartedAt?: string;
  demoDurationMinutes: number; // 5 mins
  round1DurationMinutes: number; // 25 mins
  round2DurationMinutes: number; // 30 mins
  demoBufferMinutes: number; // 2 mins waiting timer after demo
  round1BufferMinutes: number; // 10 mins waiting timer after Q2
  round2BufferMinutes: number; // 10 mins evaluation window after Q3
  startedAt?: string;
  durationMinutes: number;
  participants: Participant[];
  submissions: Submission[];
}

export interface AiConfig {
  provider: AiProvider;
  openRouterApiKey?: string;
  openRouterModel: string;
  geminiApiKey?: string;
  geminiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  openaiApiKey?: string;
  openaiEndpoint?: string;
  openaiModel: string;
}
