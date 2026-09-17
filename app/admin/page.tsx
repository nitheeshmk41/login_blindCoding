"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Cpu,
  FileCode,
  Edit3,
  Plus,
  Trash2,
  Save,
  Users,
  Terminal,
  Activity,
  Lock,
  KeyRound,
  LogIn,
  LogOut,
  Music,
  Trophy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  BarChart3,
  Sparkles,
  Check,
  XCircle,
} from "lucide-react";
import { Submission, ContestState, ErrorItem, AiProvider } from "@/lib/types";

export default function AdminPage() {
  // Authentication State (passcode: bc-admin)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Contest & Data State
  const [contestState, setContestState] = useState<ContestState | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // AI Configuration State (Gemini, Ollama, OpenAI, Heuristic)
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("openrouter");
  const [openRouterModel, setOpenRouterModel] = useState("cohere/north-mini-code:free");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");
  const [ollamaEndpoint, setOllamaEndpoint] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");

  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);
  const [isEvaluatingAi, setIsEvaluatingAi] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [evaluatingProblemId, setEvaluatingProblemId] = useState<string | null>(null);

  // Contest Code Management
  const [customContestCode, setCustomContestCode] = useState<string>("BLIND2026");

  // Submissions queue filtering
  const [problemFilter, setProblemFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Manual evaluation form state
  const [manualScore, setManualScore] = useState<number>(100);
  const [syntaxErrors, setSyntaxErrors] = useState<ErrorItem[]>([]);
  const [logicErrors, setLogicErrors] = useState<ErrorItem[]>([]);
  const [edgeCaseErrors, setEdgeCaseErrors] = useState<ErrorItem[]>([]);
  const [manualNotes, setManualNotes] = useState<string>("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check stored admin session
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem("bc_admin_auth");
      if (storedAuth === "true") {
        setIsAuthenticated(true);
      }
    } catch (e) {}
  }, []);

  // Load contest, submissions, and AI config
  const loadData = async () => {
    try {
      const [contestRes, evalRes, configRes] = await Promise.all([
        fetch("/api/contest"),
        fetch("/api/evaluate"),
        fetch("/api/admin/config"),
      ]);

      const contestData = await contestRes.json();
      const evalData = await evalRes.json();
      const configData = await configRes.json();

      if (contestData.contest) {
        setContestState(contestData.contest);
        if (contestData.contest.code && !customContestCode) {
          setCustomContestCode(contestData.contest.code);
        }
      }
      if (evalData.submissions) {
        const filtered = evalData.submissions.filter((s: Submission) => s.problemId !== "p1-demo-array");
        setSubmissions(filtered);
        if (selectedSub) {
          const updated = filtered.find((s: Submission) => s.id === selectedSub.id);
          if (updated) setSelectedSub(updated);
        }
      }
      if (configData) {
        setSelectedProvider(configData.provider || "openrouter");
        if (configData.openRouterModel) setOpenRouterModel(configData.openRouterModel);
        if (configData.geminiModel) setGeminiModel(configData.geminiModel);
        if (configData.ollamaEndpoint) setOllamaEndpoint(configData.ollamaEndpoint);
        if (configData.ollamaModel) setOllamaModel(configData.ollamaModel);
        if (configData.openaiModel) setOpenaiModel(configData.openaiModel);
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: inputPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || "Access Denied: Invalid Passcode");
      }

      setIsAuthenticated(true);
      try {
        localStorage.setItem("bc_admin_auth", "true");
      } catch (e) {}
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setInputPassword("");
    try {
      localStorage.removeItem("bc_admin_auth");
    } catch (e) {}
  };

  // Sync selected submission to manual editor
  useEffect(() => {
    if (selectedSub) {
      setManualScore(selectedSub.evaluation?.score ?? 100);
      setSyntaxErrors(selectedSub.evaluation?.syntaxErrors || []);
      setLogicErrors(selectedSub.evaluation?.logicErrors || []);
      setEdgeCaseErrors(selectedSub.evaluation?.edgeCaseErrors || []);
      setManualNotes(
        selectedSub.evaluation?.manualNotes || selectedSub.evaluation?.aiFeedback || ""
      );
    }
  }, [selectedSub]);

  // Recalculate score on defect changes
  const recomputeManualScore = (
    syntax: ErrorItem[],
    logic: ErrorItem[],
    edge: ErrorItem[]
  ) => {
    const totalDeductions =
      syntax.reduce((a, b) => a + Number(b.deduction || 0), 0) +
      logic.reduce((a, b) => a + Number(b.deduction || 0), 0) +
      edge.reduce((a, b) => a + Number(b.deduction || 0), 0);
    setManualScore(Math.max(0, 100 - totalDeductions));
  };

  const handleEvaluateBatch = async (problemId?: string) => {
    setEvaluatingProblemId(problemId || "all");
    setIsEvaluatingAll(true);
    try {
      const res = await fetch("/api/evaluate/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: problemId || "all" }),
      });
      const data = await res.json();
      if (res.ok) {
        const label = problemId === "p2-stack-lodge" ? "Problem 1 (Stack)" : problemId === "p3-linkedlist-gang" ? "Problem 2 (Linked List)" : "All Questions";
        setSuccessMessage(`Evaluated ${data.evaluatedCount} pending submissions for ${label}.`);
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert("Failed to evaluate: " + data.error);
      }
    } catch (err) {
      alert("Failed to trigger evaluation");
    } finally {
      setIsEvaluatingAll(false);
      setEvaluatingProblemId(null);
    }
  };

  const handleUpdateContestCode = async () => {
    if (!customContestCode.trim()) {
      alert("Please enter a valid contest access code.");
      return;
    }
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_code", code: customContestCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Contest Access Code updated to "${data.state?.code || customContestCode.trim().toUpperCase()}"!`);
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(data.error || "Failed to update access code");
      }
    } catch (e) {
      alert("Error updating contest access code");
    }
  };

  const handleStartDemo = async () => {
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_demo" }),
      });
      if (res.ok) {
        setSuccessMessage("Q1 Demo Started (5 Mins)! All candidates transitioned to Demo question.");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to start Demo");
    }
  };

  const handleStartRound1 = async () => {
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_round_1" }),
      });
      if (res.ok) {
        setSuccessMessage("Round 1 Started (Problem 1 · Stack · 25 Mins)! Candidates transitioned.");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to start Round 1");
    }
  };

  const handleStartRound2 = async () => {
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_round_2" }),
      });
      if (res.ok) {
        setSuccessMessage("Round 2 Started (Problem 2 · Linked List · 30 Mins)! Candidates transitioned.");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to start Round 2");
    }
  };

  const handlePublishResults = async () => {
    if (!confirm("Are you sure you want to PUBLISH final standings to all candidates?")) return;
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_results" }),
      });
      if (res.ok) {
        setSuccessMessage("Official Leaderboard & Final Standings Published!");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to publish results");
    }
  };

  const handleSetMusicVolume = async (volume: number) => {
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_music_volume", volume }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      alert("Failed to update music volume");
    }
  };

  const handleSkipMusicTrack = async () => {
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip_track" }),
      });
      if (res.ok) {
        setSuccessMessage("Music skipped to next song for all candidates!");
        loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      alert("Failed to skip music track");
    }
  };

  const handleResetContest = async () => {
    if (!confirm("Are you sure you want to reset the contest back to Lobby mode?")) return;
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.ok) {
        setSuccessMessage("Contest reset to lobby standby.");
        setSelectedSub(null);
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to reset contest");
    }
  };

  const handleCloseContest = async () => {
    if (!confirm("Are you sure you want to CLOSE the event permanently? Candidates will be locked out completely.")) return;
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      if (res.ok) {
        setSuccessMessage("Event CLOSED permanently.");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to close contest");
    }
  };

  // Save AI Config
  const handleSaveAiConfig = async () => {
    setIsSavingAiConfig(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          openRouterModel,
          geminiApiKey: geminiApiKey || undefined,
          geminiModel,
          ollamaEndpoint,
          ollamaModel,
          openaiApiKey: openaiApiKey || undefined,
          openaiModel,
        }),
      });

      if (res.ok) {
        setSuccessMessage(`AI Evaluator updated to ${selectedProvider.toUpperCase()}!`);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err) {
      alert("Failed to save AI configuration");
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  // Trigger AI evaluation on specific submission
  const handleTriggerAiEvaluation = async (submissionId: string) => {
    setIsEvaluatingAi(submissionId);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "re_evaluate_ollama",
          submissionId,
          provider: selectedProvider,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage("AI Reverse Evaluation completed successfully!");
        loadData();
        if (selectedSub?.id === submissionId) {
          setSelectedSub(data.submission);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      alert("Evaluation failed");
    } finally {
      setIsEvaluatingAi(null);
    }
  };

  // Save Manual Grade Override
  const handleSaveManualEvaluation = async () => {
    if (!selectedSub) return;
    setIsSavingManual(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_override",
          submissionId: selectedSub.id,
          score: manualScore,
          syntaxErrors,
          logicErrors,
          edgeCaseErrors,
          notes: manualNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Manual grade & deductions published!");
        loadData();
        setSelectedSub(data.submission);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      alert("Failed to save manual evaluation");
    } finally {
      setIsSavingManual(false);
    }
  };

  // Defect Helpers
  const addDefect = (type: "syntax" | "logic" | "edge_case") => {
    const defaultDeduction = type === "syntax" ? 5 : type === "logic" ? 15 : 10;
    const newDefect: ErrorItem = {
      id: `man-${Date.now()}`,
      type,
      message: `Manual ${type.replace("_", " ")} deduction`,
      deduction: defaultDeduction,
    };

    if (type === "syntax") {
      const updated = [...syntaxErrors, newDefect];
      setSyntaxErrors(updated);
      recomputeManualScore(updated, logicErrors, edgeCaseErrors);
    } else if (type === "logic") {
      const updated = [...logicErrors, newDefect];
      setLogicErrors(updated);
      recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
    } else {
      const updated = [...edgeCaseErrors, newDefect];
      setEdgeCaseErrors(updated);
      recomputeManualScore(syntaxErrors, logicErrors, updated);
    }
  };

  const removeDefect = (type: "syntax" | "logic" | "edge_case", id: string) => {
    if (type === "syntax") {
      const updated = syntaxErrors.filter((e) => e.id !== id);
      setSyntaxErrors(updated);
      recomputeManualScore(updated, logicErrors, edgeCaseErrors);
    } else if (type === "logic") {
      const updated = logicErrors.filter((e) => e.id !== id);
      setLogicErrors(updated);
      recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
    } else {
      const updated = edgeCaseErrors.filter((e) => e.id !== id);
      setEdgeCaseErrors(updated);
      recomputeManualScore(syntaxErrors, logicErrors, updated);
    }
  };

  // Question-Wise Evaluation Data Computation
  const p1Subs = submissions.filter((s) => s.problemId === "p2-stack-lodge");
  const p2Subs = submissions.filter((s) => s.problemId === "p3-linkedlist-gang");

  const p1Evaluated = p1Subs.filter((s) => s.status === "completed" || s.status === "manual_reviewed");
  const p1Pending = p1Subs.filter((s) => s.status === "pending" || s.status === "evaluating");
  const p1Corrects = p1Subs.filter((s) => (s.evaluation?.score ?? 0) >= 80);

  const p2Evaluated = p2Subs.filter((s) => s.status === "completed" || s.status === "manual_reviewed");
  const p2Pending = p2Subs.filter((s) => s.status === "pending" || s.status === "evaluating");
  const p2Corrects = p2Subs.filter((s) => (s.evaluation?.score ?? 0) >= 80);

  const totalPending = p1Pending.length + p2Pending.length;
  const totalCorrects = p1Corrects.length + p2Corrects.length;
  const totalEvaluated = p1Evaluated.length + p2Evaluated.length;

  // Render Login Portal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-between cyber-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-sm w-full rounded-xl border border-red-900/60 bg-zinc-950 p-6 sm:p-7 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-950 border border-red-600/50 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-white font-mono">
                Admin Authentication
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Enter master passcode to unlock control console.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">
                  Master Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="Enter passcode"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 text-white font-mono text-xs rounded-lg pl-9 pr-3 py-2.5 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 font-mono">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary-red w-full py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>Authenticate Root</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col cyber-bg">
      <Navbar status={contestState?.status || "WAITING"} />

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-mono text-white flex items-center gap-2 tracking-tight">
                <span>ADMIN CONTROL CENTER</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-bold">
                  ROOT
                </span>
              </h1>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Question-Wise Evaluation · Arena Lifecycle Controls · AI Reverse Evaluator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {successMessage && (
              <div className="px-3.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-mono font-bold animate-pulse shadow-md">
                ✓ {successMessage}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600/60 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              Logout
            </button>
          </div>
        </div>

        {/* Top Controls Row: Arena Lifecycle + AI Engine Config */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Arena Lifecycle Controls */}
          <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <span className="text-xs font-mono text-white uppercase tracking-wider flex items-center gap-2 font-black">
                  <Activity className="w-4 h-4 text-red-500" /> Arena Status Controls
                </span>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider ${
                    contestState?.resultsPublished
                      ? "bg-purple-950 text-purple-300 border border-purple-800"
                      : contestState?.status === "ACTIVE"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                  }`}
                >
                  {contestState?.resultsPublished
                    ? "RESULTS PUBLISHED 🔓"
                    : contestState?.status === "ACTIVE"
                    ? contestState?.currentRound === 0
                      ? "Q1 DEMO (5 MINS)"
                      : contestState?.currentRound === 1
                      ? "ROUND 1: STACK (25 MINS)"
                      : "ROUND 2: LINKED LIST (30 MINS)"
                    : contestState?.status === "CLOSED"
                    ? "CLOSED"
                    : "STANDBY (LOBBY)"}
                </span>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {contestState?.status === "WAITING" && (
                  <button
                    onClick={handleStartDemo}
                    className="btn-primary-red py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Q1 Demo (5 Mins)
                  </button>
                )}

                <button
                  onClick={handleStartRound1}
                  className="py-2.5 rounded-lg bg-zinc-900 border border-red-800/80 hover:bg-red-950 hover:border-red-600 text-red-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-red-500" />
                  Start Round 1 (P1 · 25 Mins)
                </button>

                <button
                  onClick={handleStartRound2}
                  className="py-2.5 rounded-lg bg-zinc-900 border border-red-800/80 hover:bg-red-950 hover:border-red-600 text-red-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-red-500" />
                  Start Round 2 (P2 · 30 Mins)
                </button>

                {!contestState?.resultsPublished && (
                  <button
                    onClick={handlePublishResults}
                    className="btn-primary-red py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-300" />
                    Publish Results &amp; Leaderboard 🔓
                  </button>
                )}
              </div>

              {/* Reset & Close Buttons */}
              <div className="flex gap-2 pt-1 border-t border-zinc-900">
                <button
                  onClick={handleResetContest}
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-600 hover:bg-amber-950/30 text-amber-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Lobby
                </button>
                <button
                  onClick={handleCloseContest}
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 hover:bg-red-950/40 text-red-400 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Close Event
                </button>
              </div>
            </div>

            {/* Contest Code & Music Stream */}
            <div className="mt-4 pt-3 border-t border-zinc-900 space-y-2.5 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-red-500" /> Contest Code:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customContestCode}
                    onChange={(e) => setCustomContestCode(e.target.value.toUpperCase())}
                    className="bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1 text-white font-mono uppercase text-xs outline-none w-28"
                  />
                  <button
                    onClick={handleUpdateContestCode}
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs transition-all cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                <span className="text-[11px] text-red-400 font-bold flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-red-500 animate-pulse" /> 3-Song Stream:
                </span>
                <div className="flex items-center gap-1">
                  {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
                    <button
                      key={v}
                      onClick={() => handleSetMusicVolume(v)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        (contestState?.backgroundMusicVolume ?? 0.25) === v
                          ? "bg-red-950 text-red-300 font-bold border border-red-700"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {v === 0 ? "Mute" : `${v * 100}%`}
                    </button>
                  ))}
                  <button
                    onClick={handleSkipMusicTrack}
                    className="px-2 py-0.5 rounded bg-red-900 hover:bg-red-800 text-white text-[10px] font-bold transition-all cursor-pointer border border-red-700"
                  >
                    Skip ⏭️
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Evaluation Engine Setup */}
          <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <span className="text-xs font-mono text-white uppercase tracking-wider flex items-center gap-2 font-black">
                  <Cpu className="w-4 h-4 text-red-500" /> AI Reverse Evaluator Setup
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800 font-bold">
                  ACTIVE: {selectedProvider.toUpperCase()}
                </span>
              </div>

              {/* Provider Selection Tabs */}
              <div className="flex flex-wrap gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                {(["openrouter", "gemini", "ollama", "openai", "heuristic_fallback"] as AiProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`flex-1 min-w-[70px] py-1.5 rounded text-[10px] font-mono uppercase font-bold transition-all cursor-pointer ${
                      selectedProvider === p
                        ? "bg-red-600 text-white shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {p === "openrouter" ? "OpenRouter Free" : p === "heuristic_fallback" ? "AST Inspector" : p}
                  </button>
                ))}
              </div>

              {/* Provider Config Forms */}
              {selectedProvider === "openrouter" && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Key Loaded from .env (OPEN_ROUTER)
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Cascades to Google Gemini, Ollama, then AST Inspector if rate limited.
                    </p>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">OpenRouter Free Model:</label>
                    <select
                      value={openRouterModel}
                      onChange={(e) => setOpenRouterModel(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none text-xs"
                    >
                      <option value="cohere/north-mini-code:free">cohere/north-mini-code:free (Recommended)</option>
                      <option value="liquid/lfm-2.5-2.6b:free">liquid/lfm-2.5-2.6b:free (Fast Free)</option>
                      <option value="openrouter/auto">openrouter/auto (Auto-route Free)</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedProvider === "gemini" && (
                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Gemini API Key:</label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy... (leave blank to use system env)"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Model:</label>
                    <select
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    >
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Fast &amp; Accurate)</option>
                      <option value="gemini-2.0-flash">gemini-2.0-flash (Latest)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Reasoning)</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedProvider === "ollama" && (
                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Ollama Endpoint:</label>
                    <input
                      type="text"
                      value={ollamaEndpoint}
                      onChange={(e) => setOllamaEndpoint(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Model:</label>
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="llama3, codellama, deepseek-coder"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedProvider === "heuristic_fallback" && (
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
                  Multi-Pass AST Inspector strictly scans missing semicolons, unbalanced brackets, pointer dereferences, and bounds without network overhead.
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-zinc-900 flex justify-between items-center">
              <span className="text-[10px] font-mono text-zinc-500">
                Reverse flaw marking: 100 Base score minus defects.
              </span>
              <button
                onClick={handleSaveAiConfig}
                disabled={isSavingAiConfig}
                className="btn-primary-red px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer"
              >
                {isSavingAiConfig ? "Saving..." : "Save AI Configuration"}
              </button>
            </div>
          </div>
        </div>

        {/* QUESTION-WISE EVALUATION DASHBOARD (NEW FEATURE) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 font-mono text-sm font-black text-white uppercase tracking-wider">
              <BarChart3 className="w-5 h-5 text-red-500" />
              <span>Question-Wise Evaluation Dashboard</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEvaluateBatch("all")}
                disabled={isEvaluatingAll}
                className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isEvaluatingAll && evaluatingProblemId === "all" ? "Evaluating All Questions..." : "Evaluate All Questions"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            {/* Problem 1 Card: Lodge Escape (Stack) */}
            <div className="rounded-xl border border-amber-900/60 bg-gradient-to-b from-amber-950/30 via-zinc-950 to-zinc-950 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-700/60 text-[10px] font-bold uppercase">
                  Problem 1 (Stack)
                </span>
                <span className="text-[11px] text-zinc-400">100 Base Pts</span>
              </div>

              <h4 className="text-base font-bold text-white truncate">
                The Lodge Escape
              </h4>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block uppercase">Submissions</span>
                  <span className="text-lg font-black text-white">{p1Subs.length}</span>
                </div>
                <div className="bg-emerald-950/40 p-2 rounded border border-emerald-900/60">
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold">Corrects</span>
                  <span className="text-lg font-black text-emerald-400">{p1Corrects.length}</span>
                </div>
                <div className="bg-amber-950/40 p-2 rounded border border-amber-900/60">
                  <span className="text-[10px] text-amber-400 block uppercase font-bold">Pending</span>
                  <span className="text-lg font-black text-amber-400">{p1Pending.length}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleEvaluateBatch("p2-stack-lodge")}
                  disabled={isEvaluatingAll}
                  className="w-full py-2 px-3 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-600/60 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  {isEvaluatingAll && evaluatingProblemId === "p2-stack-lodge"
                    ? "Evaluating Problem 1..."
                    : `Batch Evaluate P1 (${p1Pending.length} Pending)`}
                </button>
              </div>
            </div>

            {/* Problem 2 Card: Das's Gang (Linked List) */}
            <div className="rounded-xl border border-blue-900/60 bg-gradient-to-b from-blue-950/30 via-zinc-950 to-zinc-950 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-700/60 text-[10px] font-bold uppercase">
                  Problem 2 (Linked List)
                </span>
                <span className="text-[11px] text-zinc-400">100 Base Pts</span>
              </div>

              <h4 className="text-base font-bold text-white truncate">
                Das&apos;s Gang
              </h4>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block uppercase">Submissions</span>
                  <span className="text-lg font-black text-white">{p2Subs.length}</span>
                </div>
                <div className="bg-emerald-950/40 p-2 rounded border border-emerald-900/60">
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold">Corrects</span>
                  <span className="text-lg font-black text-emerald-400">{p2Corrects.length}</span>
                </div>
                <div className="bg-amber-950/40 p-2 rounded border border-amber-900/60">
                  <span className="text-[10px] text-amber-400 block uppercase font-bold">Pending</span>
                  <span className="text-lg font-black text-amber-400">{p2Pending.length}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleEvaluateBatch("p3-linkedlist-gang")}
                  disabled={isEvaluatingAll}
                  className="w-full py-2 px-3 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-600/60 text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  {isEvaluatingAll && evaluatingProblemId === "p3-linkedlist-gang"
                    ? "Evaluating Problem 2..."
                    : `Batch Evaluate P2 (${p2Pending.length} Pending)`}
                </button>
              </div>
            </div>

            {/* Total Arena Evaluation Stats Summary Card */}
            <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 via-zinc-950 to-zinc-950 p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-bold uppercase">
                    Arena Totals
                  </span>
                  <span className="text-[11px] text-zinc-400">200 Max Pts</span>
                </div>

                <h4 className="text-base font-bold text-white">
                  Evaluation Overview
                </h4>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Total Submissions:</span>
                    <strong className="text-white font-black">{submissions.length}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 font-semibold">Total Corrects (≥80 Pts):</span>
                    <strong className="text-emerald-400 font-black">{totalCorrects}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-semibold">Total Yet to Evaluate:</span>
                    <strong className="text-amber-400 font-black">{totalPending}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Evaluated: <strong className="text-white">{totalEvaluated}/{submissions.length}</strong></span>
                <span className="text-zinc-500">Auto-Refreshes 4s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Registered Participants Roster */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              Registered Candidates Roster ({contestState?.participants?.length || 0})
            </h3>
            <div className="flex items-center gap-2 font-mono text-xs">
              <a
                href="/api/admin/export?type=winners"
                download="winners_list.json"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded bg-amber-950/80 border border-amber-700 text-amber-300 hover:bg-amber-900 transition-all text-[11px] font-bold flex items-center gap-1"
              >
                🏆 Export Winners (JSON)
              </a>
              <a
                href="/api/admin/export?type=participants"
                download="participants_list.json"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-all text-[11px] font-semibold flex items-center gap-1"
              >
                📥 Export Candidates (JSON)
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Rank #</th>
                  <th className="py-2.5 px-3">Candidate Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3">Access Code</th>
                  <th className="py-2.5 px-3 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {contestState?.participants?.map((p, i) => (
                  <tr key={p.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-zinc-500">#{i + 1}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{p.name}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{p.email || "—"}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{p.phone || "—"}</td>
                    <td className="py-2.5 px-3 text-zinc-500">{p.contestCode}</td>
                    <td className="py-2.5 px-3 text-right font-black text-red-500 text-sm">
                      {p.totalScore} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submissions Queue & Manual Evaluation Suite (SIDE-BY-SIDE LAYOUT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
          {/* Left Side: Submissions Queue */}
          <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-red-500" />
                Submissions Queue ({submissions.length})
              </h3>
            </div>

            {/* Filtering Toolbar */}
            <div className="space-y-2.5 font-mono text-xs">
              {/* Question Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setProblemFilter("all")}
                  className={`flex-1 py-1.5 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    problemFilter === "all" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All Questions ({submissions.length})
                </button>
                <button
                  onClick={() => setProblemFilter("p2-stack-lodge")}
                  className={`flex-1 py-1.5 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    problemFilter === "p2-stack-lodge" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  P1: Stack ({p1Subs.length})
                </button>
                <button
                  onClick={() => setProblemFilter("p3-linkedlist-gang")}
                  className={`flex-1 py-1.5 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    problemFilter === "p3-linkedlist-gang" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  P2: Linked List ({p2Subs.length})
                </button>
              </div>

              {/* Status Filter Dropdown & Badges */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-zinc-500" /> Status Filter:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-red-600 font-mono"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending (Yet to Evaluate)</option>
                  <option value="corrects">Corrects / High Performers (≥80 PTS)</option>
                  <option value="flawed">Flawed / Deductions (&lt;80 PTS)</option>
                  <option value="manual">Manual Judge Reviewed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Question</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {submissions.filter((sub) => {
                    if (problemFilter !== "all" && sub.problemId !== problemFilter) return false;
                    if (statusFilter === "pending" && sub.status !== "pending" && sub.status !== "evaluating") return false;
                    if (statusFilter === "corrects" && (sub.evaluation?.score ?? 0) < 80) return false;
                    if (statusFilter === "flawed" && (sub.evaluation?.score ?? 100) >= 80) return false;
                    if (statusFilter === "manual" && !sub.evaluation?.isManuallyOverridden) return false;
                    return true;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-xs font-mono text-zinc-500">
                        No matching submissions found for this filter.
                      </td>
                    </tr>
                  ) : (
                    submissions
                      .filter((sub) => {
                        if (problemFilter !== "all" && sub.problemId !== problemFilter) return false;
                        if (statusFilter === "pending" && sub.status !== "pending" && sub.status !== "evaluating") return false;
                        if (statusFilter === "corrects" && (sub.evaluation?.score ?? 0) < 80) return false;
                        if (statusFilter === "flawed" && (sub.evaluation?.score ?? 100) >= 80) return false;
                        if (statusFilter === "manual" && !sub.evaluation?.isManuallyOverridden) return false;
                        return true;
                      })
                      .map((sub) => {
                        const isSelected = selectedSub?.id === sub.id;
                        const isPending = sub.status === "pending" || sub.status === "evaluating";
                        const isManual = sub.evaluation?.isManuallyOverridden;
                        const score = sub.evaluation?.score ?? 0;

                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSub(sub)}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-red-950/30 border-l-2 border-l-red-600"
                                : "hover:bg-zinc-900/50"
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-white block truncate max-w-[140px]">{sub.participantName}</span>
                              <span className="text-[10px] text-zinc-500 uppercase">{sub.language}</span>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-300">
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-red-400 mr-1.5">
                                {sub.problemId === "p2-stack-lodge" ? "P1" : "P2"}
                              </span>
                              <span className="text-xs">{sub.problemId === "p2-stack-lodge" ? "Lodge Escape" : "Das's Gang"}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPending ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-400 text-[10px] font-bold animate-pulse">
                                  YET TO EVALUATE
                                </span>
                              ) : isManual ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800 text-purple-300 text-[10px] font-bold">
                                  JUDGE REVIEWED
                                </span>
                              ) : score >= 80 ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                                  CORRECT (AI)
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-400 text-[10px] font-bold">
                                  DEFECTS ({100 - score} PTS)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isPending ? (
                                <span className="text-zinc-600">—</span>
                              ) : (
                                <div>
                                  <span className={`font-bold ${score >= 80 ? "text-emerald-400" : "text-red-400"}`}>{score}</span>
                                  <span className="text-zinc-600 text-[10px]"> / 100</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerAiEvaluation(sub.id);
                                }}
                                disabled={isEvaluatingAi === sub.id}
                                className="px-2 py-1 rounded bg-zinc-900 hover:bg-red-600 hover:text-white text-zinc-300 transition-all cursor-pointer text-[10px] font-bold border border-zinc-800 disabled:opacity-50"
                              >
                                {isEvaluatingAi === sub.id ? "Evaluating..." : "Auto-Grade"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Side: Manual Evaluation Suite */}
          <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl sticky top-4">
            {selectedSub ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-red-500" />
                      Judge Manual Evaluation Suite
                      {selectedSub.evaluation?.isManuallyOverridden && (
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 text-[10px] font-bold">
                          MANUAL OVERRIDDEN
                        </span>
                      )}
                    </h3>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      Candidate: <strong className="text-white">{selectedSub.participantName}</strong> ·{" "}
                      <span className="text-red-400">{selectedSub.problemTitle}</span> ({selectedSub.language.toUpperCase()})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">Awarded Score</span>
                      <span className="text-2xl font-black text-red-500">
                        {manualScore} <small className="text-xs text-zinc-500">/ 100 PTS</small>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Candidate's Code with Line Numbers */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    <span>Candidate Code Submission</span>
                    <span className="text-zinc-500">{selectedSub.code.split("\n").length} Lines</span>
                  </div>
                  <div className="rounded-lg bg-black border border-zinc-900 font-mono text-xs text-zinc-300 max-h-56 overflow-y-auto leading-relaxed flex">
                    <div className="py-3 px-2 bg-zinc-950/80 border-r border-zinc-900 text-zinc-600 text-right select-none font-mono text-[11px] min-w-[36px]">
                      {selectedSub.code.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <pre className="p-3 flex-1 overflow-x-auto whitespace-pre-wrap leading-relaxed text-zinc-200">
                      {selectedSub.code}
                    </pre>
                  </div>
                </div>

                {/* Quick Score Presets */}
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                    Quick Score Presets:
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <button
                      onClick={() => {
                        setManualScore(100);
                        setSyntaxErrors([]);
                        setLogicErrors([]);
                        setEdgeCaseErrors([]);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition-all cursor-pointer font-bold"
                    >
                      💯 Full Marks (100 PTS)
                    </button>
                    <button
                      onClick={() => {
                        setManualScore(90);
                      }}
                      className="px-2.5 py-1 rounded bg-blue-950/70 border border-blue-800 text-blue-300 hover:bg-blue-900 transition-all cursor-pointer font-bold"
                    >
                      ⭐ Minor Deductions (90 PTS)
                    </button>
                    <button
                      onClick={() => {
                        setManualScore(50);
                      }}
                      className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-800 text-amber-300 hover:bg-amber-900 transition-all cursor-pointer font-bold"
                    >
                      ⚠️ Half Credit (50 PTS)
                    </button>
                    <button
                      onClick={() => {
                        setManualScore(0);
                      }}
                      className="px-2.5 py-1 rounded bg-red-950/70 border border-red-800 text-red-300 hover:bg-red-900 transition-all cursor-pointer font-bold"
                    >
                      ❌ Zero Marks (0 PTS)
                    </button>
                  </div>
                </div>

                {/* Problem-Specific Rubric Presets */}
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                    {selectedSub.problemId === "p2-stack-lodge"
                      ? "Rubric Deductions for P1 (The Lodge Escape · Stack):"
                      : "Rubric Deductions for P2 (Das's Gang · Linked List Removal):"}
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    {selectedSub.problemId === "p2-stack-lodge" ? (
                      <>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-p1-1-${Date.now()}`,
                              type: "logic",
                              message: "Corrupted LIFO stack ordering (FIFO instead of LIFO)",
                              deduction: 25,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-red-300 text-[11px] cursor-pointer"
                        >
                          + Corrupted LIFO (-25 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-p1-2-${Date.now()}`,
                              type: "edge_case",
                              message: "Missing empty stack check on pop/peek",
                              deduction: 15,
                            };
                            const updated = [...edgeCaseErrors, newDefect];
                            setEdgeCaseErrors(updated);
                            recomputeManualScore(syntaxErrors, logicErrors, updated);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-[11px] cursor-pointer"
                        >
                          + Missing Empty Pop Check (-15 pts)
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-p2-1-${Date.now()}`,
                              type: "logic",
                              message: "Used extra array/list violating O(1) in-place space constraint",
                              deduction: 25,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-red-300 text-[11px] cursor-pointer"
                        >
                          + Used Extra Array Space (-25 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-p2-2-${Date.now()}`,
                              type: "logic",
                              message: "Failed to unlink duplicate consecutive target nodes",
                              deduction: 15,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-[11px] cursor-pointer"
                        >
                          + Unlink Consecutive Fail (-15 pts)
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Defect Counter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Defect Deductions List
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addDefect("syntax")}
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-red-500" /> +Syntax (-5)
                      </button>
                      <button
                        onClick={() => addDefect("logic")}
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-amber-500" /> +Logic (-15)
                      </button>
                      <button
                        onClick={() => addDefect("edge_case")}
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-blue-500" /> +Edge Case (-10)
                      </button>
                    </div>
                  </div>

                  {/* Syntax Defect List */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-zinc-400 font-semibold block">
                      Syntax Defects:
                    </span>
                    {syntaxErrors.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-600 italic">No syntax defects recorded.</p>
                    ) : (
                      syntaxErrors.map((err) => (
                        <div
                          key={err.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono"
                        >
                          <input
                            type="text"
                            value={err.message}
                            onChange={(e) => {
                              const updated = syntaxErrors.map((item) =>
                                item.id === err.id ? { ...item, message: e.target.value } : item
                              );
                              setSyntaxErrors(updated);
                            }}
                            className="flex-1 bg-transparent border-none text-zinc-200 outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-bold">-{err.deduction} pts</span>
                            <button
                              onClick={() => removeDefect("syntax", err.id)}
                              className="text-zinc-500 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Logic Defect List */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-zinc-400 font-semibold block">
                      Logic Defects:
                    </span>
                    {logicErrors.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-600 italic">No logic defects recorded.</p>
                    ) : (
                      logicErrors.map((err) => (
                        <div
                          key={err.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono"
                        >
                          <input
                            type="text"
                            value={err.message}
                            onChange={(e) => {
                              const updated = logicErrors.map((item) =>
                                item.id === err.id ? { ...item, message: e.target.value } : item
                              );
                              setLogicErrors(updated);
                            }}
                            className="flex-1 bg-transparent border-none text-zinc-200 outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold">-{err.deduction} pts</span>
                            <button
                              onClick={() => removeDefect("logic", err.id)}
                              className="text-zinc-500 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Edge Case Defect List */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-zinc-400 font-semibold block">
                      Edge Case Defects:
                    </span>
                    {edgeCaseErrors.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-600 italic">No edge case defects recorded.</p>
                    ) : (
                      edgeCaseErrors.map((err) => (
                        <div
                          key={err.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono"
                        >
                          <input
                            type="text"
                            value={err.message}
                            onChange={(e) => {
                              const updated = edgeCaseErrors.map((item) =>
                                item.id === err.id ? { ...item, message: e.target.value } : item
                              );
                              setEdgeCaseErrors(updated);
                            }}
                            className="flex-1 bg-transparent border-none text-zinc-200 outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 font-bold">-{err.deduction} pts</span>
                            <button
                              onClick={() => removeDefect("edge_case", err.id)}
                              className="text-zinc-500 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Fine-Tuning Slider */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                      <span>Fine-Tune Final Score:</span>
                      <span className="text-red-500 font-bold">{manualScore} PTS</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={manualScore}
                      onChange={(e) => setManualScore(Number(e.target.value))}
                      className="w-full accent-red-600 cursor-pointer"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1 font-bold">
                      Judge Detailed Feedback / Notes:
                    </label>
                    <textarea
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Enter detailed feedback or reasons for manual grade override..."
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg p-2.5 text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveManualEvaluation}
                  disabled={isSavingManual}
                  className="btn-primary-red w-full py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  {isSavingManual ? "Publishing Grade Override..." : "Publish Manual Grade Override"}
                </button>
              </div>
            ) : (
              <div className="py-24 text-center text-xs font-mono text-zinc-600 space-y-2">
                <Terminal className="w-8 h-8 text-zinc-800 mx-auto" />
                <p>Select a submission from the queue to open the Manual Evaluation Suite.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
