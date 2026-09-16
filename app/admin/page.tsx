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
  Volume2,
  VolumeX,
  Music,
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
        setSubmissions(evalData.submissions);
        if (selectedSub) {
          const updated = evalData.submissions.find((s: Submission) => s.id === selectedSub.id);
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
        const label = problemId === "p1-linked-list" ? "Q1" : problemId === "p2-queues" ? "Q2" : "All";
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

  const handleStartContest = async () => {
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (res.ok) {
        setSuccessMessage("Round 1 Started (10 Mins)! All candidates transitioned to Problem 1.");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to start contest");
    }
  };

  const handleToggleMusic = async () => {
    try {
      const nextState = !contestState?.backgroundMusicEnabled;
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_music", enabled: nextState }),
      });
      if (res.ok) {
        setSuccessMessage(`Background music turned ${nextState ? "ON" : "OFF"} globally`);
        loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      alert("Failed to toggle background music");
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
        setSuccessMessage("Round 2 Unlocked (35 Mins)! All waiting participants transitioned to Question 2.");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to start Round 2");
    }
  };

  const handleEndContest = async () => {
    if (!confirm("Are you sure you want to finalize the contest and lock the leaderboard?")) return;
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      if (res.ok) {
        setSuccessMessage("Contest Finalized! Leaderboard is locked.");
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to end contest");
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

  // Save AI Config (Gemini / Ollama / OpenAI)
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

  // -------------------------------------------------------------
  // IF NOT AUTHENTICATED: Render Clean Admin Login Portal
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-between">
        <Navbar />

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-sm w-full rounded-lg border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-sm">
            <div className="text-center mb-5">
              <div className="w-9 h-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-4 h-4 text-zinc-300" />
              </div>
              <h2 className="text-base font-semibold text-zinc-100">
                Administration Console
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Authentication required for contest management.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Master Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="Enter passcode"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-zinc-100 font-mono text-xs rounded-md pl-8 pr-3 py-2 outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {authError && (
                <div className="p-2.5 rounded-md bg-red-950/40 border border-red-900/60 text-xs text-red-300">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary-red w-full py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Authenticate</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED: Full Clean Admin Command Console
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar status={contestState?.status || "WAITING"} />

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                Admin Control Center
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  ROOT
                </span>
              </h1>
              <p className="text-xs font-mono text-zinc-400">
                Contest Lifecycle, Multi-Engine AI Reverse Evaluator & Manual Grading
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {successMessage && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-mono font-bold">
                ✓ {successMessage}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600/40 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              Logout
            </button>
          </div>
        </div>

        {/* Top 2 Control Cards: Arena Controls & Multi-Engine AI Setup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Arena Lifecycle Controls */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-zinc-300 uppercase tracking-widest flex items-center gap-2 font-bold">
                  <Activity className="w-4 h-4 text-red-500" /> Contest State
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    contestState?.status === "ACTIVE"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : contestState?.status === "ENDED"
                      ? "bg-purple-950 text-purple-400 border border-purple-800"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                  }`}
                >
                  {contestState?.status === "ACTIVE"
                    ? contestState?.round2Unlocked
                      ? "ROUND 2 (35 MINS)"
                      : "ROUND 1 (10 MINS)"
                    : contestState?.status === "ENDED"
                    ? "FINALIZED"
                    : contestState?.status === "CLOSED"
                    ? "CLOSED"
                    : "STANDBY (LOBBY)"}
                </span>
              </div>

              <p className="text-xs font-mono text-zinc-400 mb-4 leading-relaxed">
                {contestState?.status === "WAITING" && (
                  <>Click <strong>Start Round 1</strong> to open <strong>Problem 1 (Linked Lists · 10 Mins)</strong> for all participants.</>
                )}
                {contestState?.status === "ACTIVE" && !contestState?.round2Unlocked && (
                  <>Round 1 is running. Candidates who finish Q1 wait in the lobby with scores posted. Click <strong>Unlock Round 2</strong> to transition them to <strong>Problem 2 (Queues · 35 Mins)</strong>.</>
                )}
                {contestState?.status === "ACTIVE" && contestState?.round2Unlocked && (
                  <>Round 2 is active (35 Mins). Evaluation is computed within 5 mins buffer. Click <strong>End Contest</strong> to lock final standings.</>
                )}
                {contestState?.status === "ENDED" && (
                  <>Contest is finalized. Official Leaderboard is locked. Candidates can view results.</>
                )}
                {contestState?.status === "CLOSED" && (
                  <>Event is completely closed. Candidates can no longer view the leaderboard or log in.</>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-zinc-300 mb-4">
                <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                  <Users className="w-3.5 h-3.5 text-red-500" />
                  <span>Participants:</span>
                  <strong className="text-white ml-1">
                    {contestState?.participants?.length || 0}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                  <FileCode className="w-3.5 h-3.5 text-red-500" />
                  <span>Submissions:</span>
                  <strong className="text-white ml-1">{submissions.length}</strong>
                </div>
              </div>

              {/* Data Exports & Music Control */}
              <div className="flex flex-wrap gap-2 mb-4">
                <a
                  href="/api/admin/export?type=winners"
                  download
                  className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-950/30 text-xs font-mono text-zinc-300 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Export Winners (JSON)
                </a>
                <a
                  href="/api/admin/export?type=participants"
                  download
                  className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-950/30 text-xs font-mono text-zinc-300 hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Export All Data (JSON)
                </a>
                <button
                  onClick={handleToggleMusic}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    contestState?.backgroundMusicEnabled !== false
                      ? "bg-red-950/70 border border-red-600 text-red-300 hover:bg-red-900"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  title="Admin toggle for global background music across the platform"
                >
                  {contestState?.backgroundMusicEnabled !== false ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Music: ON
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> Music: OFF
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-zinc-900">
              {contestState?.status === "WAITING" && (
                <button
                  onClick={handleStartContest}
                  className="btn-primary-red flex-1 w-full py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start Round 1 (10 Mins)
                </button>
              )}

              {contestState?.status === "ACTIVE" && !contestState?.round2Unlocked && (
                <button
                  onClick={handleStartRound2}
                  className="btn-primary-red flex-1 w-full py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Unlock Round 2 (35 Mins)
                </button>
              )}

              {contestState?.status === "ACTIVE" && contestState?.round2Unlocked && (
                <button
                  onClick={handleEndContest}
                  className="w-full sm:flex-1 py-2 rounded-lg bg-zinc-900 border border-red-700/60 hover:bg-red-950 text-red-400 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Finalize Contest
                </button>
              )}

              <div className="flex w-full sm:w-auto gap-2">
                <button
                  onClick={handleCloseContest}
                  className="w-full sm:w-auto px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-900 hover:bg-red-950/50 text-red-400 hover:text-red-300 font-mono text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Close the event permanently"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Close Event
                </button>
                <button
                  onClick={handleResetContest}
                  className="w-full sm:w-auto px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Reset back to Lobby"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Q1 / Q2 / All Batch Evaluation Actions */}
            <div className="pt-3 mt-3 border-t border-zinc-900 space-y-2">
              <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                Batch Evaluation Controls:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleEvaluateBatch("p1-linked-list")}
                  disabled={isEvaluatingAll}
                  className="py-2 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-red-600 hover:bg-zinc-800 text-zinc-200 font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Evaluate only Question 1 submissions"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  {isEvaluatingAll && evaluatingProblemId === "p1-linked-list" ? "Evaluating Q1..." : "Evaluate Q1"}
                </button>

                <button
                  onClick={() => handleEvaluateBatch("p2-queues")}
                  disabled={isEvaluatingAll}
                  className="py-2 px-2 rounded bg-zinc-900 border border-zinc-800 hover:border-red-600 hover:bg-zinc-800 text-zinc-200 font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Evaluate only Question 2 submissions"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  {isEvaluatingAll && evaluatingProblemId === "p2-queues" ? "Evaluating Q2..." : "Evaluate Q2"}
                </button>

                <button
                  onClick={() => handleEvaluateBatch("all")}
                  disabled={isEvaluatingAll}
                  className="py-2 px-2 rounded bg-zinc-900 border border-zinc-700 hover:bg-red-950/40 hover:border-red-600 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Evaluate all pending submissions"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  {isEvaluatingAll && evaluatingProblemId === "all" ? "Evaluating All..." : "Evaluate All"}
                </button>
              </div>
            </div>

            {/* Admin Contest Access Code Creator */}
            <div className="pt-3 mt-3 border-t border-zinc-900 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-red-500" /> Active Contest Access Code:
                </span>
                <span className="px-2.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-extrabold text-xs tracking-wider">
                  {contestState?.code || "BLIND2026"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customContestCode}
                  onChange={(e) => setCustomContestCode(e.target.value.toUpperCase())}
                  placeholder="Set Access Code (e.g. LOGIN2026)"
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white font-mono uppercase text-xs outline-none"
                />
                <button
                  onClick={handleUpdateContestCode}
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs transition-all cursor-pointer shrink-0"
                >
                  Set Access Code
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Engine AI Setup */}
          <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-zinc-300 uppercase tracking-widest flex items-center gap-2 font-bold">
                  <Cpu className="w-4 h-4 text-red-500" /> AI Evaluation Engine
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Active: {selectedProvider.toUpperCase()}
                </span>
              </div>

              {/* Provider Selection Tabs */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800 mb-3">
                {(["openrouter", "gemini", "ollama", "openai", "heuristic_fallback"] as AiProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`flex-1 min-w-[70px] py-1 rounded text-[11px] font-mono uppercase font-semibold transition-all ${
                      selectedProvider === p
                        ? "bg-red-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {p === "openrouter" ? "OpenRouter Free" : p === "heuristic_fallback" ? "AST Inspector" : p}
                  </button>
                ))}
              </div>

              {/* OpenRouter Form */}
              {selectedProvider === "openrouter" && (
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Key Loaded from .env (OPEN_ROUTER)
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Using OpenRouter Free Model. If token quota exhausts or rate limit occurs (429), it automatically cascades to Google Gemini, then Ollama, then strict AST inspector.
                    </p>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">OpenRouter Free Model:</label>
                    <select
                      value={openRouterModel}
                      onChange={(e) => setOpenRouterModel(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    >
                      <option value="cohere/north-mini-code:free">cohere/north-mini-code:free (Recommended Free Coder)</option>
                      <option value="liquid/lfm-2.5-2.6b:free">liquid/lfm-2.5-2.6b:free (Fast Free)</option>
                      <option value="openrouter/auto">openrouter/auto (Auto-route Free)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Provider Configuration Forms */}
              {selectedProvider === "gemini" && (
                <div className="space-y-2.5 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">
                      Gemini API Key (or set GEMINI_API_KEY env):
                    </label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy... (leave blank to use system env)"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Model:</label>
                    <select
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    >
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Accurate)</option>
                      <option value="gemini-2.0-flash">gemini-2.0-flash (Latest)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Reasoning)</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedProvider === "ollama" && (
                <div className="space-y-2.5 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">Ollama Endpoint:</label>
                    <input
                      type="text"
                      value={ollamaEndpoint}
                      onChange={(e) => setOllamaEndpoint(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Model:</label>
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

              {selectedProvider === "openai" && (
                <div className="space-y-2.5 font-mono text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">OpenAI API Key:</label>
                    <input
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Model:</label>
                    <input
                      type="text"
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                      placeholder="gpt-4o-mini, gpt-4o"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedProvider === "heuristic_fallback" && (
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
                  Multi-Pass AST Inspector strictly scans missing semicolons, unbalanced brackets,
                  pointer dereferences, and bounds without network overhead.
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-zinc-900 flex justify-between items-center">
              <span className="text-[11px] font-mono text-zinc-500">
                Reverse marking: 100 base minus defects.
              </span>
              <button
                onClick={handleSaveAiConfig}
                disabled={isSavingAiConfig}
                className="btn-primary-red px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer"
              >
                {isSavingAiConfig ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>

        {/* Registered Participants Roster */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              Registered Participants ({contestState?.participants?.length || 0})
            </h3>
            <div className="flex items-center gap-2">
              <a
                href="/api/admin/export?type=winners"
                download="winners_list.json"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-800 text-amber-300 hover:bg-amber-900 transition-all font-mono text-[11px] font-bold flex items-center gap-1"
              >
                🏆 Export Winners JSON
              </a>
              <a
                href="/api/admin/export?type=participants"
                download="participants_list.json"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-all font-mono text-[11px] font-semibold flex items-center gap-1"
              >
                📥 Export Participants JSON
              </a>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">Code</th>
                  <th className="py-2 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {contestState?.participants?.map((p, i) => (
                  <tr key={p.id} className="hover:bg-zinc-900/40">
                    <td className="py-2 px-3 text-zinc-600">{i + 1}</td>
                    <td className="py-2 px-3 text-white font-semibold">{p.name}</td>
                    <td className="py-2 px-3 text-zinc-300">{p.email || "—"}</td>
                    <td className="py-2 px-3 text-zinc-400">{p.phone || "—"}</td>
                    <td className="py-2 px-3 text-zinc-500">{p.contestCode}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-500">
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
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-800">
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-red-500" />
                Submissions Queue ({submissions.length})
              </h3>

              {/* Filtering Toolbar */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {/* Question Filter Tabs */}
                <div className="flex bg-zinc-900 p-0.5 rounded border border-zinc-800">
                  <button
                    onClick={() => setProblemFilter("all")}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                      problemFilter === "all" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    All Questions
                  </button>
                  <button
                    onClick={() => setProblemFilter("p1-linked-list")}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                      problemFilter === "p1-linked-list" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Q1 (Linked Lists)
                  </button>
                  <button
                    onClick={() => setProblemFilter("p2-queues")}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                      problemFilter === "p2-queues" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Q2 (Queues)
                  </button>
                </div>

                {/* Status Filter Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-2 py-1 text-[11px] outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Evaluation</option>
                  <option value="ai">AI Evaluated</option>
                  <option value="manual">Manual Corrected (Preferred)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase">
                    <th className="py-2 px-3">Candidate</th>
                    <th className="py-2 px-3">Problem</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Score</th>
                    <th className="py-2 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {submissions.filter((sub) => {
                    if (problemFilter !== "all" && sub.problemId !== problemFilter) return false;
                    if (statusFilter === "pending" && sub.status !== "pending" && sub.status !== "evaluating") return false;
                    if (statusFilter === "ai" && (sub.status === "pending" || sub.status === "evaluating" || sub.evaluation?.isManuallyOverridden)) return false;
                    if (statusFilter === "manual" && !sub.evaluation?.isManuallyOverridden) return false;
                    return true;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-xs font-mono text-zinc-600">
                        No matching submissions found for this filter.
                      </td>
                    </tr>
                  ) : (
                    [...submissions]
                      .filter((sub) => {
                        if (problemFilter !== "all" && sub.problemId !== problemFilter) return false;
                        if (statusFilter === "pending" && sub.status !== "pending" && sub.status !== "evaluating") return false;
                        if (statusFilter === "ai" && (sub.status === "pending" || sub.status === "evaluating" || sub.evaluation?.isManuallyOverridden)) return false;
                        if (statusFilter === "manual" && !sub.evaluation?.isManuallyOverridden) return false;
                        return true;
                      })
                      .sort((a, b) => {
                        const getWeight = (s: typeof a) => {
                          if (s.status === "pending" || s.status === "evaluating") return 0;
                          if (s.evaluation?.isManuallyOverridden) return 2;
                          return 1;
                        };
                        return getWeight(a) - getWeight(b);
                      })
                      .map((sub) => {
                        const isSelected = selectedSub?.id === sub.id;
                        const isPending = sub.status === "pending" || sub.status === "evaluating";
                        const isManual = sub.evaluation?.isManuallyOverridden;
                        
                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSub(sub)}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-red-950/20"
                                : "hover:bg-zinc-900/40"
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-white block">{sub.participantName}</span>
                              <span className="text-[10px] text-zinc-500">{sub.language.toUpperCase()}</span>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-300">
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-red-400 mr-1.5">
                                {sub.problemId === "p1-linked-list" ? "Q1" : "Q2"}
                              </span>
                              {sub.problemTitle}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPending ? (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-900/50 text-amber-500 text-[10px] font-semibold">
                                  PENDING
                                </span>
                              ) : isManual ? (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-900/50 text-purple-400 text-[10px] font-semibold">
                                  MANUAL (PREFERRED)
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 text-[10px] font-semibold">
                                  EVALUATED (AI)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isPending ? (
                                <span className="text-zinc-600">—</span>
                              ) : (
                                <div>
                                  <span className="font-bold text-red-400">{sub.evaluation?.score ?? 0}</span>
                                  <span className="text-zinc-600 text-[10px]"> / 100</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTriggerAiEvaluation(sub.id);
                                  }}
                                  disabled={isEvaluatingAi === sub.id}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-300 transition-all cursor-pointer text-[10px] font-semibold border border-zinc-700 disabled:opacity-50"
                                >
                                  {isEvaluatingAi === sub.id ? "Working..." : "Auto-Grade"}
                                </button>
                              </div>
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
          <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl sticky top-4">
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
                    <p className="text-xs font-mono text-zinc-400">
                      Candidate: <strong className="text-white">{selectedSub.participantName}</strong> ·{" "}
                      <span className="text-red-400">{selectedSub.problemTitle}</span> ({selectedSub.language.toUpperCase()})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-zinc-500 block uppercase">Final Grade</span>
                      <span className="text-2xl font-extrabold text-red-500">
                        {manualScore} <small className="text-xs text-zinc-500">/ 100 PTS</small>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Candidate's Code with Line Numbers */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    <span>Candidate Blind Code Submission</span>
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

                {/* Quick Score Preset Buttons */}
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
                    {selectedSub.problemId === "p1-linked-list"
                      ? "Rubric Presets for Q1 (Linked List Remove Duplicates):"
                      : "Rubric Presets for Q2 (Circular Queue Basic Implementation):"}
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    {selectedSub.problemId === "p1-linked-list" ? (
                      <>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-1-${Date.now()}`,
                              type: "logic",
                              message: "Used extra space (Set/HashSet/Array) violating O(1) space constraint",
                              deduction: 25,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-red-300 text-[11px] cursor-pointer"
                        >
                          + Used Set/Array (-25 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-2-${Date.now()}`,
                              type: "logic",
                              message: "Failed to unlink duplicate node (missing runner.next = runner.next.next)",
                              deduction: 20,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-[11px] cursor-pointer"
                        >
                          + Didn't Unlink Duplicate (-20 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-3-${Date.now()}`,
                              type: "logic",
                              message: "No pointer advancement causing infinite loop",
                              deduction: 20,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-[11px] cursor-pointer"
                        >
                          + No Pointer Advance (-20 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-4-${Date.now()}`,
                              type: "edge_case",
                              message: "Missing null head check",
                              deduction: 8,
                            };
                            const updated = [...edgeCaseErrors, newDefect];
                            setEdgeCaseErrors(updated);
                            recomputeManualScore(syntaxErrors, logicErrors, updated);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] cursor-pointer"
                        >
                          + Missing Null Check (-8 pts)
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-q2-1-${Date.now()}`,
                              type: "logic",
                              message: "Shifted array elements instead of managing front/rear pointers",
                              deduction: 25,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-red-300 text-[11px] cursor-pointer"
                        >
                          + Shifted Elements (-25 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-q2-2-${Date.now()}`,
                              type: "logic",
                              message: "Missing modulo (% 5) index wrap-around",
                              deduction: 15,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-[11px] cursor-pointer"
                        >
                          + Missing Modulo Wrap (-15 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-q2-3-${Date.now()}`,
                              type: "logic",
                              message: "Unchecked overflow before enqueueing",
                              deduction: 15,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-[11px] cursor-pointer"
                        >
                          + Unchecked Overflow (-15 pts)
                        </button>
                        <button
                          onClick={() => {
                            const newDefect: ErrorItem = {
                              id: `rub-q2-4-${Date.now()}`,
                              type: "logic",
                              message: "Unchecked underflow before dequeueing or peeking",
                              deduction: 12,
                            };
                            const updated = [...logicErrors, newDefect];
                            setLogicErrors(updated);
                            recomputeManualScore(syntaxErrors, updated, edgeCaseErrors);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] cursor-pointer"
                        >
                          + Unchecked Underflow (-12 pts)
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
                  className="btn-primary-red w-full py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  {isSavingManual ? "Publishing Grade Override..." : "Publish Manual Grade Override"}
                </button>
              </div>
            ) : (
              <div className="py-20 text-center text-xs font-mono text-zinc-600">
                Select a submission from the queue above to open the Manual Evaluation Suite.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
