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
  round2Unlocked?: boolean;
  onAllCompleted: () => void;
  onSubmissionComplete: (sub: Submission) => void;
  onViewLeaderboard?: () => void;
}

export default function ProblemWorkspace({
  participant,
  round2Unlocked = false,
  onAllCompleted,
  onSubmissionComplete,
  onViewLeaderboard,
}: ProblemWorkspaceProps) {
  // Current problem index (0 for Problem 1, 1 for Problem 2)
  const [currentProblemIdx, setCurrentProblemIdx] = useState<number>(
    participant.currentProblemIndex >= 2 ? 1 : participant.currentProblemIndex
  );

  // If candidate finished Problem 1, but Round 2 has not been unlocked by Admin yet, hold in waiting room
  const [waitingForRound2, setWaitingForRound2] = useState<boolean>(
    participant.currentProblemIndex === 1 && !round2Unlocked
  );

  const problem: Problem = CONTEST_PROBLEMS[currentProblemIdx] || CONTEST_PROBLEMS[0];

  // Selected language
  const [language, setLanguage] = useState<SupportedLanguage>("cpp");

  // Hints disclosure state
  const [showHints, setShowHints] = useState<boolean>(false);

  // Code state: completely blank IDE (no default code)
  const [code, setCode] = useState<string>("");

  // Timers: Round 1 (Linked Lists) = 10 mins, Round 2 (Queues) = 35 mins
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    currentProblemIdx === 0 ? 10 * 60 : 35 * 60
  );

  // 5-minute evaluation buffer for Question 2 (evaluated in 5mins after 35mins)
  const [waitingForQ2EvaluationBuffer, setWaitingForQ2EvaluationBuffer] = useState<boolean>(false);
  const [q2BufferSeconds, setQ2BufferSeconds] = useState<number>(5 * 60);

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
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When round2Unlocked turns true from admin, automatically transition to Problem 2
  useEffect(() => {
    if (round2Unlocked && waitingForRound2) {
      setWaitingForRound2(false);
      setCurrentProblemIdx(1);
      setSecondsRemaining(35 * 60);
      setCode("");
      setHasEnteredFullscreen(false); // Force fullscreen click again for Q2
    }
  }, [round2Unlocked, waitingForRound2]);

  // Request fullscreen utility
  const requestFullscreenArena = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  // Attempt to enter fullscreen on initial mount (browsers may block this without gesture)
  useEffect(() => {
    // requestFullscreenArena();
  }, []);

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
      if (document.visibilityState === "hidden") {
        handleTabViolation();
      }
    };

    const onWindowBlur = () => {
      handleTabViolation();
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleTabViolation();
      }
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

  // Countdown timer for problems
  useEffect(() => {
    if (waitingForRound2 || waitingForQ2EvaluationBuffer || !hasEnteredFullscreen) return;
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
  }, [waitingForRound2, waitingForQ2EvaluationBuffer, currentProblemIdx, hasEnteredFullscreen]);

  // 5-minute evaluation buffer countdown for Question 2
  useEffect(() => {
    if (!waitingForQ2EvaluationBuffer) return;
    const bufferTimer = setInterval(() => {
      setQ2BufferSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(bufferTimer);
          onAllCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(bufferTimer);
  }, [waitingForQ2EvaluationBuffer, onAllCompleted]);

  // Auto-submit when time expires (10 mins for Q1, 35 mins for Q2)
  useEffect(() => {
    if (secondsRemaining === 0 && !isSubmitting && !waitingForRound2 && !waitingForQ2EvaluationBuffer) {
      handleSubmit(true);
    }
  }, [secondsRemaining, isSubmitting, waitingForRound2, waitingForQ2EvaluationBuffer]);

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

  // Key down interceptor:
  // Disallow text selection keys (Ctrl+A, Cmd+A, Shift + Arrows) in ALL problems
  // Disallow Backspace & Delete keys in Round 2
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Play keypress sound effect on typing character
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

    if (currentProblemIdx === 1) {
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

  // Submission handler with auto-submit support
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
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmissionFeedback(data.submission);
      onSubmissionComplete(data.submission);

      if (isAutoSubmit) {
        if (currentProblemIdx === 0) {
          setWaitingForRound2(true);
        } else {
          setWaitingForQ2EvaluationBuffer(true);
        }
      } else {
        setShowAdvanceModal(true);
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
    if (currentProblemIdx === 0) {
      setWaitingForRound2(true);
    } else {
      setWaitingForQ2EvaluationBuffer(true);
    }
  };

  // Removed waitingForQ2EvaluationBuffer block from here as it was moved above

  // If candidate finished Problem 2 and is in the 5-minute evaluation buffer
  if (waitingForQ2EvaluationBuffer) {
    const bufferMinutes = Math.floor(q2BufferSeconds / 60);
    const bufferSecs = q2BufferSeconds % 60;
    const formattedBuffer = `${bufferMinutes.toString().padStart(2, "0")}:${bufferSecs.toString().padStart(2, "0")}`;
    const progressPercent = Math.max(0, Math.min(100, ((300 - q2BufferSeconds) / 300) * 100));

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 sm:p-8 w-full shadow-lg">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-[11px] font-mono text-zinc-300 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Round 2 Concluded · 5-Min Evaluation Buffer
          </div>

          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Assessment Complete
          </h2>

          {/* Buffer Timer Display */}
          <div className="my-5 p-4 rounded-md bg-zinc-900/80 border border-zinc-800 max-w-xs mx-auto">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Final Evaluation Buffer
            </div>
            <div className="text-3xl font-semibold font-mono text-zinc-100 tracking-wider">
              {formattedBuffer}
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1 mt-3 overflow-hidden">
              <div
                className="bg-red-600 h-1 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto leading-relaxed">
            The 35-minute coding period for Question 2 has concluded. Submissions are being evaluated by the static AI auditor. Marks are automatically updated on the official leaderboard.
          </p>

          <div className="inline-block px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 mb-6">
            Official Standings: <strong className="text-zinc-200">Only Top 2</strong> are highlighted on the podium.
          </div>

          {/* Latest Submission Card */}
          {submissionFeedback && (
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-md p-4 mb-6 max-w-md mx-auto text-left font-mono text-xs space-y-2">
              <div className="flex justify-between items-center text-zinc-400">
                <span>{submissionFeedback.problemTitle || "Problem 2"}:</span>
                <span className="text-base font-semibold text-zinc-100">
                  {submissionFeedback.evaluation ? `${submissionFeedback.evaluation.score} / 100 PTS` : "Pending Admin Evaluation"}
                </span>
              </div>
              {submissionFeedback.evaluation && (
                <>
                  <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-800">
                    <span>Deductions:</span>
                    <span className="text-red-400 font-mono">-{submissionFeedback.evaluation.totalDeduction} pts</span>
                  </div>
                  {(submissionFeedback.evaluation.syntaxErrors.length > 0 || submissionFeedback.evaluation.logicErrors.length > 0) && (
                    <div className="mt-2 text-[10px] text-red-300">
                      See Final Standings for detailed feedback.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onViewLeaderboard && (
              <button
                onClick={onViewLeaderboard}
                className="btn-primary-red w-full sm:w-auto px-5 py-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Trophy className="w-4 h-4" />
                <span>View Live Standings</span>
              </button>
            )}
            <button
              onClick={requestFullscreenArena}
              className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Verify Fullscreen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If candidate has completed both questions, lock the workspace completely
  if (participant.completed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center animate-fade-in">
        <div className="rounded-lg border border-emerald-900/60 bg-zinc-950 p-6 sm:p-8 w-full shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-900/80 bg-emerald-950/40 text-xs font-mono text-emerald-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Assessment Concluded · Submissions Locked
          </div>

          <h2 className="text-2xl font-bold text-zinc-100 mb-2 tracking-tight">
            All Questions Submitted!
          </h2>

          <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto leading-relaxed">
            You have completed both Problem 1 and Problem 2. Your solutions have been submitted and locked. You can no longer edit or re-enter the coding environment.
          </p>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-md p-4 mb-6 max-w-md mx-auto text-left font-mono text-xs space-y-3">
            <div className="flex justify-between items-center text-zinc-300 pb-2 border-b border-zinc-800">
              <span className="font-semibold text-zinc-200">Candidate:</span>
              <span className="text-emerald-400 font-bold">{participant.name}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Status:</span>
              <span className="text-emerald-400 font-semibold">Both Problems Submitted &amp; Locked</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>Total Score:</span>
              <span className="text-zinc-100 font-bold text-sm">{participant.totalScore} PTS</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onViewLeaderboard && (
              <button
                onClick={onViewLeaderboard}
                className="btn-primary-red w-full sm:w-auto px-5 py-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Trophy className="w-4 h-4" />
                <span>View Official Leaderboard &amp; Standings</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If candidate completed Problem 1 and is waiting for Admin to start Round 2
  if (waitingForRound2) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 sm:p-8 w-full shadow-lg">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-[11px] font-mono text-zinc-300 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Round 1 Complete · Waiting for Round 2
          </div>

          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Problem 1 Submitted
          </h2>

          <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto leading-relaxed">
            Your Round 1 solution has been collected. All candidates are held in lobby standby until the administrator begins Round 2 (Question 2 · 35 Mins). Evaluation is pending.
          </p>

          {/* Result Summary */}
          {submissionFeedback && (
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-md p-4 mb-6 max-w-md mx-auto text-left font-mono text-xs space-y-2">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Problem 1 (Linked Lists):</span>
                <span className="text-base font-semibold text-zinc-100">
                  {submissionFeedback.evaluation ? `${submissionFeedback.evaluation.score} / 100 PTS` : "Pending Admin Evaluation"}
                </span>
              </div>
              {submissionFeedback.evaluation && (
                <>
                  <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-800">
                    <span>Deductions:</span>
                    <span>-{submissionFeedback.evaluation.totalDeduction} PTS</span>
                  </div>
                  {submissionFeedback.evaluation.aiFeedback && (
                    <p className="text-[11px] text-zinc-400 italic pt-1">
                      &ldquo;{submissionFeedback.evaluation.aiFeedback}&rdquo;
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onViewLeaderboard && (
              <button
                onClick={onViewLeaderboard}
                className="btn-primary-red w-full sm:w-auto px-4 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>View Live Standings</span>
              </button>
            )}

            <button
              onClick={requestFullscreenArena}
              className="w-full sm:w-auto px-4 py-2 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Verify Fullscreen</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-transitioning when administrator initiates Round 2...</span>
          </div>
        </div>
      </div>
    );
  }

  // Initial Fullscreen Gate
  if (!hasEnteredFullscreen && !participant.completed && !waitingForQ2EvaluationBuffer && !waitingForRound2) {
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
            This assessment requires strict full-screen proctoring. Please click the button below to enter fullscreen mode and begin {currentProblemIdx === 0 ? "Round 1 (10 Mins)" : "Round 2 (35 Mins)"}. Your timer will not start until you do so.
          </p>
          <button
            onClick={() => {
              requestFullscreenArena();
              setHasEnteredFullscreen(true);
            }}
            className="btn-primary-red px-6 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center mx-auto gap-2 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            Enter Fullscreen & Begin
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
        {/* Round indicator */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-md border border-zinc-800">
          <span
            className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
              currentProblemIdx === 0
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-500"
            }`}
          >
            01 · Linked Lists (10m)
          </span>
          <span
            className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
              currentProblemIdx === 1
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-500"
            }`}
          >
            02 · Queues (35m)
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

          <div className="flex items-center gap-2 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
            <Timer className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500 text-[10px] uppercase">Time:</span>
            <span
              className={`font-semibold tracking-wider ${
                secondsRemaining < 300 ? "text-red-400 animate-pulse" : "text-zinc-100"
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  {problem.topic}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {problem.difficulty} · 100 Base Pts
                </span>
              </div>
              <h1 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
                {problem.title}
              </h1>

              {/* Problem specific rule notification */}
              {currentProblemIdx === 0 ? (
                <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 mb-3">
                  <span className="text-red-400 font-semibold">Rule:</span> Blurred mode active. Text selection and clipboard operations are strictly disabled.
                </div>
              ) : (
                <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 mb-3">
                  <span className="text-red-400 font-semibold">Rule:</span> Pure blackout mode. Backspace, Delete, and text selection are strictly disabled.
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

            {/* Collapsible Hints & Solution Demo Code Section */}
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
                    <span>Hints &amp; Solution Demo Guide</span>
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
                          Algorithm Pseudocode &amp; Demo Guide:
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

          <div className="mt-4 pt-3 border-t border-zinc-900 text-[11px] font-mono text-zinc-500 flex justify-between">
            <span>Static reverse evaluation</span>
            <span>100 base score</span>
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

          {/* Backspace Alert Badge in Q2 */}
          {backspaceAlert && (
            <div className="mb-2 py-1 px-3 rounded bg-red-950/50 border border-red-900/60 text-red-300 text-xs font-mono text-center">
              Backspace &amp; Delete keys are disabled in Round 2.
            </div>
          )}

          {/* Text Editor Area - Text selection STRICTLY PREVENTED */}
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
                // Strictly disable text selection: force cursor to single position
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
                  ? "Type your solution from scratch (text is blurred, selection is disabled)..."
                  : "Type your solution from scratch (pure blackout; backspace and selection disabled)..."
              }
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              className={`w-full flex-1 p-3.5 font-mono text-xs sm:text-sm leading-relaxed outline-none resize-none rounded-md border-none select-none ${
                currentProblemIdx === 0
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
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit {currentProblemIdx === 0 ? "Problem 1" : "Problem 2"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Proctoring Fullscreen / Tab Switch Warning Modal */}
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
                <p>
                  Window focus loss is monitored by proctoring. Return to fullscreen immediately.
                </p>
              </div>
            )}

            {tabSwitchCount === 2 && (
              <div className="space-y-2 text-xs text-zinc-300 mb-5">
                <div className="p-2 rounded bg-red-950/60 border border-red-800 text-red-300 font-mono font-medium">
                  Final Warning (2 of 2)
                </div>
                <p>
                  Any subsequent tab switch will incur a <strong>-10 penalty deduction</strong> per event.
                </p>
              </div>
            )}

            {tabSwitchCount > 2 && (
              <div className="space-y-2 text-xs text-zinc-300 mb-5">
                <div className="p-2 rounded bg-red-950 border border-red-700 text-red-300 font-mono font-medium">
                  Penalty Applied: Attempt #{tabSwitchCount}
                </div>
                <p className="text-red-400 font-medium">
                  -{(tabSwitchCount - 2) * 10} marks deducted from your final assessment score.
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

      {/* Advance Modal */}
      {showAdvanceModal && submissionFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="max-w-md w-full rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {currentProblemIdx === 0 ? "Problem 1 Evaluated" : "Assessment Complete"}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Language: {submissionFeedback.language.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Status</div>
                <div className="text-sm font-semibold font-mono text-zinc-100 mt-1">
                  {submissionFeedback.evaluation ? (
                    <>
                      {submissionFeedback.evaluation.score} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
                    </>
                  ) : (
                    "Pending Evaluation"
                  )}
                </div>
              </div>
            </div>

            {/* Error & Deductions Breakdown (Only if evaluated) */}
            {submissionFeedback.evaluation ? (
              <div className="space-y-2 mb-5 font-mono text-xs">
                <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 flex justify-between items-center">
                  <span className="text-zinc-400">Base Score:</span>
                  <span className="text-zinc-200 font-medium">100 PTS</span>
                </div>

                <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                  <div className="flex justify-between items-center text-zinc-300 font-medium">
                    <span>Defects Deducted:</span>
                    <span className="text-red-400">
                      -
                      {(submissionFeedback.evaluation.totalDeduction ?? 0) -
                        (submissionFeedback.evaluation.tabSwitchPenalty ?? 0)}{" "}
                      PTS
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60 space-y-0.5">
                    <div>• Syntax Errors: {submissionFeedback.evaluation.syntaxErrors?.length ?? 0}</div>
                    <div>• Logic Flaws: {submissionFeedback.evaluation.logicErrors?.length ?? 0}</div>
                    <div>• Edge Cases: {submissionFeedback.evaluation.edgeCaseErrors?.length ?? 0}</div>
                  </div>
                </div>

                {(submissionFeedback.evaluation.tabSwitchPenalty ?? 0) > 0 && (
                  <div className="p-2.5 rounded bg-red-950/30 border border-red-900 text-red-300 flex justify-between items-center font-medium">
                    <span>Proctoring Penalty:</span>
                    <span>-{submissionFeedback.evaluation.tabSwitchPenalty} PTS</span>
                  </div>
                )}

                {submissionFeedback.evaluation.aiFeedback && (
                  <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 italic">
                    &ldquo;{submissionFeedback.evaluation.aiFeedback}&rdquo;
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-5 p-4 rounded bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 font-mono text-center">
                Your code has been collected successfully. It will be evaluated by the administrator.
              </div>
            )}

            {/* Proceed Action */}
            <button
              onClick={handleProceedToNext}
              className="btn-primary-red w-full py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>
                {currentProblemIdx === 0
                  ? "Enter Round 2 Waiting Room (Wait for Admin to Start) →"
                  : "View Official Leaderboard →"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
