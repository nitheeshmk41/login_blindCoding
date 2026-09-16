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
  topic: "Linked Lists" | "Queues";
  difficulty: "Medium";
  baseScore: number; // 100
  timeLimitMinutes: number;
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
  currentRound: 1 | 2;
  round2Unlocked: boolean;
  backgroundMusicEnabled?: boolean;
  round1StartedAt?: string;
  round2StartedAt?: string;
  round1DurationMinutes: number; // 10 minutes
  round2DurationMinutes: number; // 35 minutes
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
