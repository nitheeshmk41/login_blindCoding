"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Timer,
  CheckCircle2,
  RotateCcw,
  Maximize2,
  ShieldAlert,
  Trophy,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Problem, SupportedLanguage, Participant, Submission } from "@/lib/types";
import { CONTEST_PROBLEMS } from "@/lib/problems";
import {
  playKeypressSound,
  playSubmitSound,
  playWarningSound,
  playSuccessSound,
  playClickSound,
} from "@/lib/sound-effects";

interface ProblemWorkspaceProps {
  participant: Participant;
  currentRound?: 0 | 1 | 2;
  round1Unlocked?: boolean;
  round2Unlocked?: boolean;
  resultsPublished?: boolean;
  onAllCompleted: () => void;
  onSubmissionComplete: (sub: Submission) => void;
  onViewLeaderboard?: () => void;
}

export default function ProblemWorkspace({
  participant,
  currentRound = 0,
  round1Unlocked = false,
  round2Unlocked = false,
  resultsPublished = false,
  onAllCompleted,
  onSubmissionComplete,
  onViewLeaderboard,
}: ProblemWorkspaceProps) {
  // Current active problem index (0 for Q1 Demo, 1 for Q2 Stack, 2 for Q3 LinkedList)
  const currentProblemIdx = currentRound === 0 ? 0 : currentRound === 1 ? 1 : 2;
  const problem: Problem = CONTEST_PROBLEMS[currentProblemIdx] || CONTEST_PROBLEMS[0];

  // Selected language
  const [language, setLanguage] = useState<SupportedLanguage>("cpp");

  // Hints disclosure state
  const [showHints, setShowHints] = useState<boolean>(false);

  // Code state: blank IDE
  const [code, setCode] = useState<string>("");

  // Working timer per round
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    currentProblemIdx === 0 ? 5 * 60 : currentProblemIdx === 1 ? 25 * 60 : 30 * 60
  );

  // Track submitted problem IDs in the current session
  const [submittedProblemIds, setSubmittedProblemIds] = useState<string[]>([]);

  // Waiting buffers:
  // After Q1 Demo: 2-minute timer waiting for Admin to start Round 1
  const [waitingForRound1, setWaitingForRound1] = useState<boolean>(false);
  const [q1BufferSeconds, setQ1BufferSeconds] = useState<number>(2 * 60);

  // After Q2 (P1): 10-minute timer waiting for Admin to start Round 2
  const [waitingForRound2, setWaitingForRound2] = useState<boolean>(false);
  const [q2BufferSeconds, setQ2BufferSeconds] = useState<number>(10 * 60);

  // After Q3 (P2): 10-minute evaluation buffer
  const [waitingForFinalResults, setWaitingForFinalResults] = useState<boolean>(false);
  const [q3BufferSeconds, setQ3BufferSeconds] = useState<number>(10 * 60);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<Submission | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState<boolean>(false);

  // Keystrokes & stats
  const [keystrokes, setKeystrokes] = useState<number>(0);

  // Anti-Cheat & Tab Switch Proctoring State
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [tabSwitchPenalty, setTabSwitchPenalty] = useState<number>(0);
  const [showProctorWarning, setShowProctorWarning] = useState<boolean>(false);
  const [backspaceAlert, setBackspaceAlert] = useState<boolean>(false);
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState<boolean>(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Request fullscreen utility
  const requestFullscreenArena = () => {
    try {
      if (typeof document !== "undefined" && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  // Sync working timer & reset IDE to blank (no code samples) when active round changes
  useEffect(() => {
    const limit = problem.timeLimitMinutes || (currentProblemIdx === 0 ? 5 : currentProblemIdx === 1 ? 25 : 30);
    setSecondsRemaining(limit * 60);

    // IDE starts completely blank
    setCode("");

    // Sync waiting screen buffers based on active round
    if (currentRound === 1) {
      setWaitingForRound1(false);
      setWaitingForRound2(submittedProblemIds.includes("p2-stack-lodge") && !round2Unlocked);
      setWaitingForFinalResults(false);
    } else if (currentRound === 2) {
      setWaitingForRound1(false);
      setWaitingForRound2(false);
      setWaitingForFinalResults(submittedProblemIds.includes("p3-linkedlist-gang") || participant.completed);
    } else {
      // Demo Round (0)
      setWaitingForRound1(submittedProblemIds.includes("p1-demo-array") && !round1Unlocked);
      setWaitingForRound2(false);
      setWaitingForFinalResults(false);
    }

    requestFullscreenArena();
    setHasEnteredFullscreen(true);
  }, [currentRound, currentProblemIdx, problem.id, round1Unlocked, round2Unlocked]);

  // Anti-cheat tab switch & fullscreen detection
  useEffect(() => {
    let lastViolationTime = 0;

    const handleTabViolation = () => {
      const now = Date.now();
      if (now - lastViolationTime < 1500) return;
      lastViolationTime = now;

      playWarningSound();
      setTabSwitchCount((prev) => {
        const newCount = prev + 1;
        if (newCount > 2) {
          setTabSwitchPenalty((newCount - 2) * 10);
        }
        return newCount;
      });

      setShowProctorWarning(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleTabViolation();
    };

    const onWindowBlur = () => {
      handleTabViolation();
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) handleTabViolation();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // Auto-request fullscreen on first click/interaction if not currently fullscreen
  useEffect(() => {
    const handleGestureFullscreen = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement) {
        requestFullscreenArena();
      }
    };

    window.addEventListener("click", handleGestureFullscreen);
    window.addEventListener("keydown", handleGestureFullscreen);

    return () => {
      window.removeEventListener("click", handleGestureFullscreen);
      window.removeEventListener("keydown", handleGestureFullscreen);
    };
  }, []);

  // Main Problem Working Timer
  useEffect(() => {
    if (waitingForRound1 || waitingForRound2 || waitingForFinalResults || !hasEnteredFullscreen) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [waitingForRound1, waitingForRound2, waitingForFinalResults, currentProblemIdx, hasEnteredFullscreen]);

  // 2-minute buffer timer countdown after Q1 Demo
  useEffect(() => {
    if (!waitingForRound1) return;
    const timer = setInterval(() => {
      setQ1BufferSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [waitingForRound1]);

  // 10-minute buffer timer countdown after Q2 (P1)
  useEffect(() => {
    if (!waitingForRound2) return;
    const timer = setInterval(() => {
      setQ2BufferSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [waitingForRound2]);

  // 10-minute post-contest evaluation buffer timer after Q3 (P2)
  useEffect(() => {
    if (!waitingForFinalResults) return;
    const timer = setInterval(() => {
      setQ3BufferSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [waitingForFinalResults]);

  // Auto-submit when working timer expires
  useEffect(() => {
    if (
      secondsRemaining === 0 &&
      !isSubmitting &&
      !waitingForRound1 &&
      !waitingForRound2 &&
      !waitingForFinalResults
    ) {
      handleSubmit(true);
    }
  }, [secondsRemaining, isSubmitting, waitingForRound1, waitingForRound2, waitingForFinalResults]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClearCode = () => {
    if (confirm("Reset editor content? All written code will be cleared.")) {
      setCode("");
    }
  };

  // Key interceptor for anti-cheat
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key.length === 1 || e.key === "Enter" || e.key === "Tab") {
      playKeypressSound();
    }

    // Disallow selection shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      playWarningSound();
      return;
    }
    if (
      e.shiftKey &&
      (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End" || e.key === "PageUp" || e.key === "PageDown")
    ) {
      e.preventDefault();
      playWarningSound();
      return;
    }

    // Round 2 (Q3 Linked List) blackout rules
    if (currentProblemIdx === 2) {
      if (
        e.key === "Backspace" ||
        e.key === "Delete" ||
        (e.ctrlKey && (e.key === "h" || e.key === "H")) ||
        (e.altKey && e.key === "Backspace")
      ) {
        e.preventDefault();
        playWarningSound();
        setBackspaceAlert(true);
        setTimeout(() => setBackspaceAlert(false), 2000);
        return;
      }
    }
  };

  // Submission handler
  const handleSubmit = async (isAutoSubmit = false) => {
    const codeToSubmit = code.trim() ? code : "// [Time Expired - Code Automatically Submitted]";
    if (!code.trim() && !isAutoSubmit) {
      alert("Please enter your solution before submitting.");
      return;
    }

    playSubmitSound();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          participantName: participant.name,
          contestCode: participant.contestCode,
          problemId: problem.id,
          language,
          code: codeToSubmit,
          tabSwitchCount,
          tabSwitchPenalty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmissionFeedback(data.submission);
      setSubmittedProblemIds((prev) => Array.from(new Set([...prev, problem.id])));
      onSubmissionComplete(data.submission);
      setCode("");

      if (problem.id === "p1-demo-array" || currentProblemIdx === 0) {
        if (!round1Unlocked && currentRound < 1) {
          setWaitingForRound1(true);
        }
      } else if (problem.id === "p2-stack-lodge" || currentProblemIdx === 1) {
        if (!round2Unlocked && currentRound < 2) {
          setWaitingForRound2(true);
        }
      } else {
        setWaitingForFinalResults(true);
      }
    } catch (err: unknown) {
      if (!isAutoSubmit) {
        alert(err instanceof Error ? err.message : "Submission error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToNext = () => {
    setShowAdvanceModal(false);
    setCode("");
    const subProblemId = submissionFeedback?.problemId;
    if (subProblemId === "p1-demo-array") {
      if (!round1Unlocked && currentRound < 1) {
        setWaitingForRound1(true);
      }
    } else if (subProblemId === "p2-stack-lodge") {
      if (!round2Unlocked && currentRound < 2) {
        setWaitingForRound2(true);
      }
    } else {
      setWaitingForFinalResults(true);
    }
  };

  // -------------------------------------------------------------
  // WAITING SCREEN 1: After Q1 Demo (2-minute timer)
  // -------------------------------------------------------------
  if (waitingForRound1 && !round1Unlocked && currentRound < 1) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center animate-fade-in">
        <div className="rounded-lg border border-red-900/60 bg-zinc-950 p-6 sm:p-8 w-full shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-4 text-emerald-400 font-mono text-xl font-bold">
            ✓
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-900/80 bg-red-950/40 text-xs font-mono text-red-300 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Q1 Demo Complete · 2-Min Buffer Active
          </div>

          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Demo Round Submitted
          </h2>

          <p className="text-xs text-zinc-400 mb-5 max-w-md mx-auto leading-relaxed">
            Your Q1 Demo submission has been collected (no marks evaluated). All candidates are held in lobby standby until the administrator initiates Round 1 (Problem 1 · Stack · 25 Mins).
          </p>

          {/* 2-minute timer display */}
          <div className="my-5 p-4 rounded-md bg-zinc-900/80 border border-zinc-800 max-w-xs mx-auto">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Round 1 Transition Timer
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400 tracking-wider">
              {formatTime(q1BufferSeconds)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={requestFullscreenArena}
              className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Verify Fullscreen</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Waiting for administrator to initiate Round 1 (Problem 1 · Stack · 25 Mins)...</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // WAITING SCREEN 2: After Q2 Problem 1 (10-minute timer)
  // -------------------------------------------------------------
  if (waitingForRound2 && !round2Unlocked && currentRound < 2) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center animate-fade-in">
        <div className="rounded-lg border border-red-900/60 bg-zinc-950 p-6 sm:p-8 w-full shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-4 text-emerald-400 font-mono text-xl font-bold">
            ✓
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-900/80 bg-red-950/40 text-xs font-mono text-red-300 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Problem 1 Submitted · 10-Min Buffer Active
          </div>

          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Problem 1 Collected
          </h2>

          <p className="text-xs text-zinc-400 mb-5 max-w-md mx-auto leading-relaxed">
            Your Problem 1 solution (The Lodge Escape · Stack) has been collected. All candidates are held in lobby standby until the administrator initiates Round 2 (Problem 2 · Linked List Medium · 30 Mins).
          </p>

          {/* 10-minute buffer timer display */}
          <div className="my-5 p-4 rounded-md bg-zinc-900/80 border border-zinc-800 max-w-xs mx-auto">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Round 2 Transition Timer
            </div>
            <div className="text-3xl font-bold font-mono text-amber-400 tracking-wider">
              {formatTime(q2BufferSeconds)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={requestFullscreenArena}
              className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Verify Fullscreen</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Waiting for administrator to initiate Round 2 (Problem 2 · Linked List · 30 Mins)...</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // WAITING SCREEN 3: After Q3 Problem 2 (10-minute evaluation buffer & Leaderboard Lock)
  // -------------------------------------------------------------
  if (waitingForFinalResults) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center animate-fade-in">
        <div className="rounded-lg border border-red-900/60 bg-zinc-950 p-6 sm:p-8 w-full shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-4 text-emerald-400 font-mono text-xl font-bold">
            🔒
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-900/80 bg-red-950/40 text-xs font-mono text-red-300 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Assessment Concluded · 10-Min Evaluation Window
          </div>

          <h2 className="text-2xl font-bold text-zinc-100 mb-2 tracking-tight">
            Assessment Completed!
          </h2>

          <p className="text-xs text-zinc-400 mb-5 max-w-md mx-auto leading-relaxed">
            You have completed all 3 stages of the DC Movie Blind Coding Assessment. Solutions have been locked and submitted for static reverse evaluation.
          </p>

          {/* 10-minute evaluation timer display */}
          <div className="my-5 p-4 rounded-md bg-zinc-900/80 border border-zinc-800 max-w-xs mx-auto">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Final Evaluation Buffer
            </div>
            <div className="text-3xl font-bold font-mono text-red-400 tracking-wider">
              {formatTime(q3BufferSeconds)}
            </div>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-md p-4 mb-6 max-w-md mx-auto text-left font-mono text-xs space-y-2">
            <div className="flex justify-between items-center text-zinc-300">
              <span>Candidate:</span>
              <span className="text-emerald-400 font-bold">{participant.name}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Leaderboard Status:</span>
              <span className="text-amber-400 font-semibold">
                {resultsPublished ? "Published" : "Pending Admin Publication 🔒"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {resultsPublished ? (
              onViewLeaderboard && (
                <button
                  onClick={onViewLeaderboard}
                  className="btn-primary-red w-full sm:w-auto px-5 py-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Published Standings</span>
                </button>
              )
            ) : (
              <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Leaderboard will be visible once the admin publishes the results.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Initial Fullscreen Gate
  // -------------------------------------------------------------
  if (!hasEnteredFullscreen && !participant.completed && !waitingForRound1 && !waitingForRound2 && !waitingForFinalResults) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center">
        <div className="rounded-lg border border-red-900/60 bg-zinc-950 p-6 sm:p-8 w-full shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-600/50 flex items-center justify-center mx-auto mb-4 text-red-500">
            <Maximize2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">
            Fullscreen Required
          </h2>
          <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto">
            This assessment requires strict full-screen proctoring. Please click below to enter fullscreen mode and begin{" "}
            {currentProblemIdx === 0
              ? "Q1 Demo (5 Mins)"
              : currentProblemIdx === 1
              ? "Round 1: Problem 1 (Stack · 25 Mins)"
              : "Round 2: Problem 2 (Linked List · 30 Mins)"}
            .
          </p>
          <button
            onClick={() => {
              requestFullscreenArena();
              setHasEnteredFullscreen(true);
            }}
            className="btn-primary-red px-6 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center mx-auto gap-2 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            Enter Fullscreen &amp; Begin
          </button>
        </div>
      </div>
    );
  }

  const lineCount = code ? code.split("\n").length : 0;
  const charCount = code.length;

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Top Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-4 border-b border-zinc-800">
        {/* Stage Indicator Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-3 py-1 text-xs font-mono font-medium rounded border transition-colors ${
              currentProblemIdx === 0
                ? "bg-red-950 text-red-300 border-red-800 font-bold"
                : "bg-zinc-900 text-zinc-500 border-zinc-800"
            }`}
          >
            Demo Round (5m)
          </span>
          <span
            className={`px-3 py-1 text-xs font-mono font-medium rounded border transition-colors ${
              currentProblemIdx === 1
                ? "bg-red-950 text-red-300 border-red-800 font-bold"
                : "bg-zinc-900 text-zinc-500 border-zinc-800"
            }`}
          >
            Round 1 (25m)
          </span>
          <span
            className={`px-3 py-1 text-xs font-mono font-medium rounded border transition-colors ${
              currentProblemIdx === 2
                ? "bg-red-950 text-red-300 border-red-800 font-bold"
                : "bg-zinc-900 text-zinc-500 border-zinc-800"
            }`}
          >
            Round 2 (30m)
          </span>
        </div>

        {/* Proctoring & Timer Controls */}
        <div className="flex items-center gap-2.5">
          {tabSwitchCount > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono ${
                tabSwitchPenalty > 0
                  ? "bg-red-950/40 text-red-300 border border-red-800/80"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>Tab switches: {tabSwitchCount}/2</span>
              {tabSwitchPenalty > 0 && (
                <span className="font-semibold text-red-400 ml-1">
                  (-{tabSwitchPenalty} pts)
                </span>
              )}
            </div>
          )}

          {/* Enhanced Timer Display */}
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-zinc-900 border border-red-900/60 font-mono text-xs text-zinc-300 shadow-sm">
            <Timer className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Timer:</span>
            <span
              className={`font-mono font-bold tracking-wider text-sm ${
                secondsRemaining < 180 ? "text-red-400 animate-pulse" : "text-emerald-400"
              }`}
            >
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <button
            onClick={requestFullscreenArena}
            title="Toggle fullscreen mode"
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Split: Problem Specification (Left) vs Custom IDE (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
        {/* Left: Problem Description Panel */}
        <div className="lg:col-span-5 rounded-lg border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-12rem)] space-y-4">
          <div className="space-y-4">
            {/* DC Movie 2026 Poster Banner */}
            <div className="relative rounded-lg overflow-hidden border border-red-900/60 shadow-lg group">
              <img
                src="/dc_movie_full.jpg"
                alt="DC Tamil 2026 Movie Poster"
                className="w-full h-36 object-cover object-top filter brightness-90 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold tracking-wider uppercase">
                    DC (2026) · DSA REVENGE
                  </span>
                  <div className="text-xs font-mono font-bold text-white mt-1 drop-shadow">
                    Das • Chandra • Kitty • Karuppu
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-300 bg-black/70 px-2 py-0.5 rounded border border-zinc-700">
                    Stage {currentProblemIdx + 1} of 3
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-semibold">
                  {problem.topic}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {problem.difficulty} · {problem.baseScore} Base Pts
                </span>
              </div>
              <h1 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
                {problem.title}
              </h1>

              {/* Problem specific rule notification */}
              {currentProblemIdx === 0 ? (
                <div className="p-2.5 rounded-md bg-amber-950/40 border border-amber-800 text-xs font-mono text-amber-300 mb-3">
                  <span className="text-amber-400 font-semibold">Demo Question:</span> 5 Mins working time. NO marks and NO evaluation.
                </div>
              ) : currentProblemIdx === 1 ? (
                <div className="p-2.5 rounded-md bg-zinc-900 border border-red-900/60 text-xs font-mono text-zinc-300 mb-3">
                  <span className="text-red-400 font-semibold">Problem 1 Rule:</span> Blurred mode active. Text selection and clipboard operations disabled.
                </div>
              ) : (
                <div className="p-2.5 rounded-md bg-zinc-900 border border-red-900/60 text-xs font-mono text-zinc-300 mb-3">
                  <span className="text-red-400 font-semibold">Problem 2 Rule:</span> Pure blackout mode. Backspace, Delete, and selection strictly disabled.
                </div>
              )}

              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-sans">
                {problem.description}
              </p>
            </div>

            {/* Input & Output format */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-900">
              <div>
                <h4 className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                  Input Format
                </h4>
                <div className="text-xs font-mono text-zinc-300 bg-zinc-900/60 p-2.5 rounded-md border border-zinc-800/80">
                  {problem.inputFormat}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                  Output Format
                </h4>
                <div className="text-xs font-mono text-zinc-300 bg-zinc-900/60 p-2.5 rounded-md border border-zinc-800/80">
                  {problem.outputFormat}
                </div>
              </div>
            </div>

            {/* Test Examples */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-900">
              <h4 className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                Sample Test Cases
              </h4>
              {problem.examples.map((ex, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-md p-2.5 text-xs font-mono space-y-1"
                >
                  <div className="flex gap-2">
                    <span className="text-zinc-500 font-medium">Input:</span>
                    <code className="text-zinc-200">{ex.input}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-medium">Output:</span>
                    <code className="text-zinc-200">{ex.output}</code>
                  </div>
                  {ex.explanation && (
                    <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div className="pt-3 border-t border-zinc-900">
              <h4 className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                Constraints
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-xs font-mono text-zinc-400">
                {problem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Collapsible Hints & Solution Guide */}
            {(problem.hints || problem.solutionGuide) && (
              <div className="pt-3 border-t border-zinc-900">
                <button
                  onClick={() => {
                    playClickSound();
                    setShowHints(!showHints);
                  }}
                  className="w-full p-2.5 rounded-lg bg-zinc-900/80 border border-amber-800/60 hover:border-amber-500 text-amber-400 hover:text-amber-300 font-mono text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>Hints &amp; Algorithm Guide</span>
                  </span>
                  {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showHints && (
                  <div className="mt-2.5 p-3 rounded-lg bg-black border border-amber-900/40 font-mono text-xs text-zinc-300 space-y-3 animate-fade-in">
                    {problem.hints && problem.hints.length > 0 && (
                      <div>
                        <span className="text-amber-400 font-bold block mb-1 uppercase tracking-wider text-[11px]">
                          Key Strategy Hints:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11px] leading-relaxed">
                          {problem.hints.map((hint, i) => (
                            <li key={i}>{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {problem.solutionGuide && (
                      <div>
                        <span className="text-amber-400 font-bold block mb-1 uppercase tracking-wider text-[11px]">
                          Algorithm Pseudocode:
                        </span>
                        <pre className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap">
                          {problem.solutionGuide}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Blackout / Blurred IDE */}
        <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          {/* Top IDE Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-zinc-900">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
              {(["cpp", "java", "javascript", "python", "c"] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    playClickSound();
                    setLanguage(lang);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors cursor-pointer ${
                    language === lang
                      ? "bg-zinc-800 text-zinc-100 font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {lang === "javascript" ? "JS" : lang}
                </button>
              ))}
            </div>

            {/* Status indicator and Clear */}
            <div className="flex items-center gap-2">
              {currentProblemIdx === 0 ? (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Demo Mode
                </span>
              ) : currentProblemIdx === 1 ? (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Blurred Mode
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  Blackout Mode
                </span>
              )}

              <button
                onClick={() => {
                  playClickSound();
                  handleClearCode();
                }}
                title="Reset code"
                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Backspace Alert Badge in Q3 */}
          {backspaceAlert && (
            <div className="mb-2 py-1 px-3 rounded bg-red-950/50 border border-red-900/60 text-red-300 text-xs font-mono text-center">
              Backspace &amp; Delete keys are disabled in Round 2 (Q3).
            </div>
          )}

          {/* Text Editor Area */}
          <div className="flex-1 flex flex-col min-h-[380px] bg-black rounded-md border border-zinc-900 relative">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setKeystrokes((prev) => prev + 1);
              }}
              onKeyDown={handleKeyDown}
              onSelect={(e) => {
                const target = e.currentTarget;
                if (target.selectionStart !== target.selectionEnd) {
                  target.selectionStart = target.selectionEnd;
                }
              }}
              onMouseUp={(e) => {
                const target = e.currentTarget;
                target.selectionStart = target.selectionEnd;
              }}
              onMouseMove={(e) => {
                if (e.buttons === 1) {
                  const target = e.currentTarget;
                  target.selectionStart = target.selectionEnd;
                }
              }}
              onDragStart={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              placeholder={
                currentProblemIdx === 0
                  ? "Type your Demo array solution (text is blurred, selection disabled)..."
                  : currentProblemIdx === 1
                  ? "Type your solution from scratch (text is blurred, selection disabled)..."
                  : "Type your solution from scratch (blackout mode; backspace and selection disabled)..."
              }
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              className={`w-full flex-1 p-3.5 font-mono text-xs sm:text-sm leading-relaxed outline-none resize-none rounded-md border-none select-none ${
                currentProblemIdx === 0 || currentProblemIdx === 1
                  ? "blind-mode-blur-noselect"
                  : "blind-mode-blackout-nobackspace"
              }`}
            />
          </div>

          {/* Bottom Bar: Stats and Submit */}
          <div className="mt-3 pt-2.5 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
              <span>Lines: <strong className="text-zinc-300">{lineCount}</strong></span>
              <span>Characters: <strong className="text-zinc-300">{charCount}</strong></span>
              <span>Strokes: <strong className="text-zinc-300">{keystrokes}</strong></span>
            </div>

            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !code.trim()}
              className="btn-primary-red px-5 py-2 rounded-md font-mono text-xs font-medium flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Submit {currentProblemIdx === 0 ? "Demo Q1" : currentProblemIdx === 1 ? "Problem 1" : "Problem 2"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Auto Fullscreen Required Overlay for Demo & Contest Rounds */}
      {typeof document !== "undefined" && !document.fullscreenElement && !showProctorWarning && (
        <div
          onClick={requestFullscreenArena}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md cursor-pointer"
        >
          <div className="max-w-md w-full rounded-lg border border-red-800 bg-zinc-950 p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Maximize2 className="w-6 h-6 text-red-500" />
            </div>
            <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
              {currentProblemIdx === 0 ? "DEMO ROUND FULLSCREEN PROTOCOL" : "FULLSCREEN PROCTORING ENFORCED"}
            </span>
            <h3 className="text-lg font-bold text-zinc-100 mt-2 mb-2">
              Full Screen Mode Required
            </h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Click anywhere on this screen to automatically enter full-screen mode and unlock the {currentProblemIdx === 0 ? "Demo Q1" : currentProblemIdx === 1 ? "Problem 1" : "Problem 2"} workspace.
            </p>
            <div className="btn-primary-red w-full py-2.5 rounded-md text-xs font-mono font-bold flex items-center justify-center gap-2">
              <Maximize2 className="w-4 h-4" />
              <span>CLICK ANYWHERE TO ENTER FULLSCREEN</span>
            </div>
          </div>
        </div>
      )}

      {/* Proctoring Warning Modal */}
      {showProctorWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="max-w-md w-full rounded-lg border border-red-800 bg-zinc-950 p-6 shadow-xl text-center">
            <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>

            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              Tab Switch Detected
            </h3>

            {tabSwitchCount === 1 && (
              <div className="space-y-2 text-xs text-zinc-300 mb-5">
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-mono font-medium">
                  Warning 1 of 2
                </div>
                <p>Focus loss is monitored by proctoring. Return to fullscreen immediately.</p>
              </div>
            )}

            {tabSwitchCount === 2 && (
              <div className="space-y-2 text-xs text-zinc-300 mb-5">
                <div className="p-2 rounded bg-red-950/60 border border-red-800 text-red-300 font-mono font-medium">
                  Final Warning (2 of 2)
                </div>
                <p>Any subsequent tab switch will incur a <strong>-10 penalty deduction</strong> per event.</p>
              </div>
            )}

            {tabSwitchCount > 2 && (
              <div className="space-y-2 text-xs text-zinc-300 mb-5">
                <div className="p-2 rounded bg-red-950 border border-red-700 text-red-300 font-mono font-medium">
                  Penalty Applied: Attempt #{tabSwitchCount}
                </div>
                <p className="text-red-400 font-medium">
                  -{(tabSwitchCount - 2) * 10} marks deducted from final score.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setShowProctorWarning(false);
                requestFullscreenArena();
              }}
              className="btn-primary-red w-full py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Return to Fullscreen Assessment</span>
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
