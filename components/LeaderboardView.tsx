"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { playSuccessSound } from "@/lib/sound-effects";
import {
  Trophy,
  Medal,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Flame,
  Zap,
  Sparkles,
  ShieldAlert,
  Users,
  Award,
  BarChart3,
  FileCode2,
} from "lucide-react";
import { Submission, Participant } from "@/lib/types";

interface LeaderboardViewProps {
  currentParticipant?: Participant | null;
  resultsPublished?: boolean;
}

export default function LeaderboardView({
  currentParticipant,
  resultsPublished = false,
}: LeaderboardViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const lastConfettiTimeRef = useRef<number>(0);

  const handleHoverCelebration = (isSilver = false) => {
    const now = Date.now();
    if (now - lastConfettiTimeRef.current < 1200) return; // Debounce 1.2s
    lastConfettiTimeRef.current = now;

    try {
      playSuccessSound();
      confetti({
        particleCount: isSilver ? 35 : 55,
        spread: 75,
        origin: { y: 0.45 },
        colors: isSilver
          ? ["#e4e4e7", "#a1a1aa", "#71717a", "#ffffff"]
          : ["#dc2626", "#ef4444", "#991b1b", "#ffffff", "#f87171"],
        disableForReducedMotion: true,
      });
    } catch (e) {}
  };

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/evaluate");
      const data = await res.json();
      if (data.participants && data.submissions) {
        setParticipants(data.participants);
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Compute standings matching actual problem IDs
  const leaderboardEntries = participants.map((p) => {
    const userSubs = submissions.filter((s) => s.participantId === p.id);
    const p1Sub = userSubs.find((s) => s.problemId === "p2-stack-lodge");
    const p2Sub = userSubs.find((s) => s.problemId === "p3-linkedlist-gang");

    const p1Score = p1Sub?.evaluation?.score ?? 0;
    const p2Score = p2Sub?.evaluation?.score ?? 0;

    const p1Deductions = p1Sub?.evaluation?.totalDeduction ?? 0;
    const p2Deductions = p2Sub?.evaluation?.totalDeduction ?? 0;
    const tabSwitchPenalty = p.tabSwitchPenalty || 0;
    const totalDeductions = p1Deductions + p2Deductions + tabSwitchPenalty;

    const totalScore =
      p.totalScore !== undefined && p.totalScore !== 0
        ? p.totalScore
        : p1Score + p2Score;
    const languages = Array.from(new Set(userSubs.map((s) => s.language)));

    const isManual = userSubs.some((s) => s.evaluation?.isManuallyOverridden);

    return {
      participant: p,
      p1Sub,
      p2Sub,
      p1Score,
      p2Score,
      tabSwitchPenalty,
      tabSwitchCount: p.tabSwitchCount || 0,
      totalDeductions,
      totalScore,
      languages,
      isManual,
      completed: p.completed || userSubs.length >= 2,
    };
  });

  // Sort descending by total score, then ascending by total deductions
  leaderboardEntries.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.totalDeductions - b.totalDeductions;
  });

  const filteredEntries = leaderboardEntries.filter((entry) =>
    entry.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.participant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Overall Statistics
  const totalCandidatesCount = leaderboardEntries.length;
  const highestScore = leaderboardEntries.length > 0 ? leaderboardEntries[0].totalScore : 0;
  const avgScore =
    totalCandidatesCount > 0
      ? Math.round(
          leaderboardEntries.reduce((acc, curr) => acc + curr.totalScore, 0) /
            totalCandidatesCount
        )
      : 0;

  if (!resultsPublished) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-3xl mx-auto w-full text-center animate-fade-in font-mono my-auto">
        <div className="rounded-3xl border border-red-900/80 bg-zinc-950 w-full shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden">
          <div className="relative h-64 sm:h-80 overflow-hidden">
            <img
              src="/das.jpg"
              alt="Das Banner"
              className="w-full h-full object-cover object-[center_25%] filter brightness-90 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
          </div>
          <div className="p-6 sm:p-10 relative -mt-16">
            <div className="w-16 h-16 rounded-2xl bg-red-950/90 border border-red-600/80 flex items-center justify-center mx-auto mb-4 text-red-500 font-mono text-3xl font-bold shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse backdrop-blur-md">
              🔒
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-900/80 bg-red-950/60 text-xs font-mono text-red-400 mb-4 font-bold tracking-wider shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              STANDINGS LOCKED · PENDING JUDGE PUBLICATION
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-3 tracking-tight font-mono drop-shadow-md">
              DC 2026 REVENGE STANDINGS
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              The contest administrator is reviewing final reverse-defect code evaluations. Official standings will be unlocked once published by the judge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono">
      {/* 1. Hero Movie Banner with das.jpg Top Background */}
      <div className="relative rounded-3xl overflow-hidden border border-red-900/80 bg-zinc-950 shadow-[0_0_50px_rgba(220,38,38,0.2)] group">
        <div className="relative h-60 sm:h-72 md:h-[320px] w-full overflow-hidden">
          <img
            src="/das.jpg"
            alt="Das Movie Banner"
            className="w-full h-full object-cover object-[center_20%] filter brightness-95 contrast-105 group-hover:scale-[1.02] transition-transform duration-700"
          />
          {/* Layered cinematic dark red gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-transparent to-zinc-950/80" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-red-900/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Banner Content Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 to-red-800 opacity-70 blur-sm" />
              <img
                src="/bc_logo.png"
                alt="DC 2026 Logo"
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain border border-red-600/80 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-md"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-0.5 rounded-full bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/30">
                  BLIND CODING 2026
                </span>
                <span className="text-[10px] sm:text-xs px-3 py-0.5 rounded-full bg-black/90 border border-red-600/50 text-red-400 font-bold backdrop-blur-md shadow-md">
                  OFFICIAL STANDINGS
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2 drop-shadow-lg">
                <span>BLIND CODING: THE LAST HUMANS</span>
              </h1>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="px-4 py-2.5 rounded-2xl bg-black/85 border border-red-900/60 text-zinc-300 flex items-center gap-2.5 backdrop-blur-md shadow-xl">
              <Users className="w-4 h-4 text-red-400" />
              <span>Candidates: <strong className="text-white text-sm">{totalCandidatesCount}</strong></span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-black/85 border border-red-900/60 text-zinc-300 flex items-center gap-2.5 backdrop-blur-md shadow-xl">
              <Award className="w-4 h-4 text-red-400" />
              <span>Top Score: <strong className="text-red-400 text-sm">{highestScore}/200</strong></span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-black/85 border border-red-900/60 text-zinc-300 flex items-center gap-2.5 backdrop-blur-md shadow-xl">
              <BarChart3 className="w-4 h-4 text-red-400" />
              <span>Avg Score: <strong className="text-white text-sm">{avgScore} pts</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top 2 Winner & Runner Podium Cards */}
      {filteredEntries.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Rank #1: WINNER */}
          <div
            onMouseEnter={() => handleHoverCelebration(false)}
            className="rounded-3xl border-2 border-red-600/80 hover:border-red-500 bg-gradient-to-b from-red-950/40 via-zinc-950 to-zinc-950 p-6 sm:p-7 flex flex-col justify-between shadow-[0_0_40px_rgba(220,38,38,0.25)] hover:shadow-[0_0_60px_rgba(220,38,38,0.45)] hover:scale-[1.015] transition-all duration-300 relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute -right-8 -top-8 w-44 h-44 bg-red-600/10 rounded-full blur-3xl group-hover:bg-red-600/30 transition-all pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30">
                  <Trophy className="w-4 h-4 text-white fill-white" /> #1 WINNER
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-3xl font-black text-red-500 tracking-tight mb-1">
                  {filteredEntries[0].participant.name}
                </h3>
                <p className="text-xs text-red-400 font-bold tracking-wide">
                  {filteredEntries[0].participant.email} · 1st Place Champion
                </p>
              </div>

              <div className="bg-red-950/30 p-4 rounded-2xl border border-red-900/60 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">TOTAL AWARDED SCORE</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-red-500 tabular-nums drop-shadow">
                      {filteredEntries[0].totalScore}
                    </span>
                    <span className="text-xs text-zinc-400 font-bold">/ 200 PTS</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block mb-1">ACCURACY</span>
                  <span className="text-lg font-bold text-red-400">
                    {Math.round((filteredEntries[0].totalScore / 200) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-red-900/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-zinc-400">
                  P1: <strong className="text-white text-sm">{filteredEntries[0].p1Score}</strong>
                </span>
                <span className="text-zinc-400">
                  P2: <strong className="text-white text-sm">{filteredEntries[0].p2Score}</strong>
                </span>
              </div>

              <div>
                {filteredEntries[0].totalDeductions > 0 ? (
                  <span className="text-red-400 font-bold">
                    -{filteredEntries[0].totalDeductions} pts deductions
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> ZERO DEFECTS
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rank #2: RUNNERS */}
          {filteredEntries.length >= 2 && (
            <div
              onMouseEnter={() => handleHoverCelebration(true)}
              className="rounded-3xl border-2 border-zinc-400/80 hover:border-zinc-200 bg-gradient-to-b from-zinc-800/40 via-zinc-950 to-zinc-950 p-6 sm:p-7 flex flex-col justify-between shadow-[0_0_40px_rgba(212,212,216,0.1)] hover:shadow-[0_0_60px_rgba(212,212,216,0.25)] hover:scale-[1.015] transition-all duration-300 relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute -right-8 -top-8 w-44 h-44 bg-zinc-400/10 rounded-full blur-3xl group-hover:bg-zinc-400/25 transition-all pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="px-4 py-1.5 rounded-xl bg-zinc-300 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-zinc-300/20">
                    <Medal className="w-4 h-4 text-black fill-black" /> #2 RUNNERS
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-3xl font-black text-zinc-100 tracking-tight mb-1">
                    {filteredEntries[1].participant.name}
                  </h3>
                  <p className="text-xs text-zinc-400 font-bold tracking-wide">
                    {filteredEntries[1].participant.email} · 2nd Place Runner-Up
                  </p>
                </div>

                <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">TOTAL AWARDED SCORE</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black font-mono text-zinc-200 tabular-nums">
                        {filteredEntries[1].totalScore}
                      </span>
                      <span className="text-xs text-zinc-400 font-bold">/ 200 PTS</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-zinc-400 block mb-1">ACCURACY</span>
                    <span className="text-lg font-bold text-zinc-300">
                      {Math.round((filteredEntries[1].totalScore / 200) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-zinc-400">
                    P1: <strong className="text-white text-sm">{filteredEntries[1].p1Score}</strong>
                  </span>
                  <span className="text-zinc-400">
                    P2: <strong className="text-white text-sm">{filteredEntries[1].p2Score}</strong>
                  </span>
                </div>

                <div>
                  {filteredEntries[1].totalDeductions > 0 ? (
                    <span className="text-red-400 font-bold">
                      -{filteredEntries[1].totalDeductions} pts deductions
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> ZERO DEFECTS
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Search Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950 border border-red-950/90 shadow-[0_0_30px_rgba(220,38,38,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative flex-1 w-full group">
          <Search className="w-4 h-4 text-red-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-red-400 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name or email address..."
            className="w-full bg-zinc-900/90 border border-red-950 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-zinc-100 text-xs sm:text-sm rounded-2xl pl-11 pr-10 py-3 outline-none font-mono transition-all placeholder:text-zinc-500 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-red-400 cursor-pointer p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="px-4 py-2.5 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 font-bold tracking-wide shadow-inner">
            Showing <strong className="text-white">{filteredEntries.length}</strong> of <strong className="text-white">{leaderboardEntries.length}</strong> candidates
          </span>
        </div>
      </div>

      {/* 4. Main Standings Table Roster */}
      <div className="rounded-3xl border border-zinc-800/90 bg-zinc-950 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
            <span className="uppercase tracking-wider">
              FULL CANDIDATE ROSTER STANDINGS ({filteredEntries.length})
            </span>
          </div>
          <span className="text-xs text-zinc-400">
            Click P1/P2 to inspect submission evaluation details
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-400 uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-16">Rank</th>
                <th className="py-4 px-4">Candidate</th>
                <th className="py-4 px-4 text-center">P1 (Lodge Escape)</th>
                <th className="py-4 px-4 text-center">P2 (Das&apos;s Gang)</th>
                <th className="py-4 px-4 text-center">Tab Switches</th>
                <th className="py-4 px-4 text-center">Total Deductions</th>
                <th className="py-4 px-4 text-right pr-6">Final Score</th>
                <th className="py-4 px-4 text-center">Inspect Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No matching candidate found in the standings roster.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isCurrent = currentParticipant?.id === entry.participant.id;
                  const isWinner = idx === 0;
                  const isRunner = idx === 1;

                  return (
                    <tr
                      key={entry.participant.id}
                      onMouseEnter={() => handleHoverCelebration(idx === 1)}
                      className={`hover:bg-zinc-900/80 transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-red-950/20 border-l-4 border-l-red-600"
                          : isWinner
                          ? "bg-red-950/10"
                          : isRunner
                          ? "bg-zinc-900/30"
                          : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black shadow-md ${
                            isWinner
                              ? "bg-red-600 text-white ring-2 ring-red-500/50"
                              : isRunner
                              ? "bg-zinc-300 text-black ring-2 ring-zinc-300/50"
                              : idx === 2
                              ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                              : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>

                      {/* Candidate Name / Info */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-sm ${
                                isWinner
                                  ? "text-red-500 font-black"
                                  : isRunner
                                  ? "text-zinc-200 font-black"
                                  : "text-white"
                              }`}
                            >
                              {entry.participant.name}
                            </span>

                            {isWinner && (
                              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black tracking-wider">
                                WINNER
                              </span>
                            )}

                            {isRunner && (
                              <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-200 text-[9px] font-bold tracking-wider">
                                RUNNER
                              </span>
                            )}

                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold tracking-wider">
                                YOU
                              </span>
                            )}

                            {entry.isManual && (
                              <span
                                title="Reviewed manually by judge"
                                className="px-2 py-0.5 rounded bg-red-950 text-red-300 text-[9px] border border-red-800 font-bold"
                              >
                                MANUAL GRADE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500">{entry.participant.email}</span>
                        </div>
                      </td>

                      {/* P1 Score */}
                      <td className="py-4 px-4 text-center">
                        {entry.p1Sub ? (
                          entry.p1Sub.status === "pending" || entry.p1Sub.status === "evaluating" ? (
                            <span className="text-red-400 font-medium italic text-[10px] animate-pulse">
                              EVALUATING
                            </span>
                          ) : (
                            <span className="text-white font-bold text-sm tabular-nums">
                              {entry.p1Score}{" "}
                              <span className="text-zinc-600 text-[10px]">/ 100</span>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* P2 Score */}
                      <td className="py-4 px-4 text-center">
                        {entry.p2Sub ? (
                          entry.p2Sub.status === "pending" || entry.p2Sub.status === "evaluating" ? (
                            <span className="text-red-400 font-medium italic text-[10px] animate-pulse">
                              EVALUATING
                            </span>
                          ) : (
                            <span className="text-white font-bold text-sm tabular-nums">
                              {entry.p2Score}{" "}
                              <span className="text-zinc-600 text-[10px]">/ 100</span>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Tab Switches */}
                      <td className="py-4 px-4 text-center">
                        {entry.tabSwitchPenalty > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-800 text-red-300 font-bold text-[11px] inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            -{entry.tabSwitchPenalty} pts ({entry.tabSwitchCount} tabs)
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold text-[11px]">
                            CLEAN (0)
                          </span>
                        )}
                      </td>

                      {/* Total Deductions */}
                      <td className="py-4 px-4 text-center">
                        {entry.totalDeductions > 0 ? (
                          <span className="text-red-400 font-bold text-xs tabular-nums">
                            -{entry.totalDeductions} pts
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold text-xs">0 pts</span>
                        )}
                      </td>

                      {/* Final Score */}
                      <td className="py-4 px-4 text-right pr-6 font-black text-white text-base tabular-nums">
                        <span
                          className={
                            isWinner
                              ? "text-red-500 text-lg drop-shadow"
                              : isRunner
                              ? "text-zinc-200 text-lg"
                              : "text-white"
                          }
                        >
                          {entry.totalScore}
                        </span>
                      </td>

                      {/* Inspect Buttons */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {entry.p1Sub ? (
                            <button
                              onClick={() => setSelectedSubmission(entry.p1Sub!)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-red-950 text-zinc-300 hover:text-red-300 border border-zinc-800 hover:border-red-700 text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                              title="Inspect Problem 1 Evaluation Details"
                            >
                              <FileCode2 className="w-3 h-3 text-red-400" />
                              <span>P1</span>
                            </button>
                          ) : (
                            <span className="text-zinc-700 text-[10px]">—</span>
                          )}

                          {entry.p2Sub ? (
                            <button
                              onClick={() => setSelectedSubmission(entry.p2Sub!)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-red-950 text-zinc-300 hover:text-red-300 border border-zinc-800 hover:border-red-700 text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                              title="Inspect Problem 2 Evaluation Details"
                            >
                              <FileCode2 className="w-3 h-3 text-red-400" />
                              <span>P2</span>
                            </button>
                          ) : (
                            <span className="text-zinc-700 text-[10px]">—</span>
                          )}
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

      {/* Code Flaw Inspector Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-mono">
          <div className="max-w-xl w-full rounded-3xl border border-red-900 bg-zinc-950 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedSubmission.participantName}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-red-950 text-red-300 border border-red-800 font-bold">
                    {selectedSubmission.problemTitle}
                  </span>
                </h3>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score summary box */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-400 text-xs">Awarded Problem Score:</span>
              <span className="text-xl font-black text-emerald-400">
                {selectedSubmission.evaluation?.score ?? 0} / 100 PTS
              </span>
            </div>

            {/* Defects breakdown */}
            <div className="space-y-3 text-xs">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Evaluation Breakdown
              </h4>

              {/* Syntax Errors */}
              {selectedSubmission.evaluation?.syntaxErrors &&
                selectedSubmission.evaluation.syntaxErrors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-red-400 font-bold">Syntax Errors:</div>
                    {selectedSubmission.evaluation.syntaxErrors.map((err, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 flex justify-between items-center gap-2"
                      >
                        <span>• Line {err.line || "—"}: {err.message}</span>
                        <span className="text-red-400 font-bold shrink-0">
                          -{err.deduction} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {/* Logic Flaws */}
              {selectedSubmission.evaluation?.logicErrors &&
                selectedSubmission.evaluation.logicErrors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-red-400 font-bold">Logic Errors:</div>
                    {selectedSubmission.evaluation.logicErrors.map((err, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 flex justify-between items-center gap-2"
                      >
                        <span>• Line {err.line || "—"}: {err.message}</span>
                        <span className="text-red-400 font-bold shrink-0">
                          -{err.deduction} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {/* Edge Case Errors */}
              {selectedSubmission.evaluation?.edgeCaseErrors &&
                selectedSubmission.evaluation.edgeCaseErrors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-red-400 font-bold">Boundary Cases Missed:</div>
                    {selectedSubmission.evaluation.edgeCaseErrors.map((err, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 flex justify-between items-center gap-2"
                      >
                        <span>• {err.message}</span>
                        <span className="text-red-400 font-bold shrink-0">
                          -{err.deduction} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {!selectedSubmission.evaluation?.syntaxErrors?.length &&
                !selectedSubmission.evaluation?.logicErrors?.length &&
                !selectedSubmission.evaluation?.edgeCaseErrors?.length && (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Flawless execution! All test cases passed successfully.</span>
                  </div>
                )}
            </div>

            {/* Evaluator Feedback */}
            {selectedSubmission.evaluation?.aiFeedback && (
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 italic">
                &ldquo;{selectedSubmission.evaluation.aiFeedback}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
