"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Medal,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  ShieldAlert,
  Flame,
  Award,
  Zap,
} from "lucide-react";
import { Submission, Participant } from "@/lib/types";

interface LeaderboardViewProps {
  currentParticipant?: Participant | null;
  resultsPublished?: boolean;
}

export default function LeaderboardView({ currentParticipant, resultsPublished = false }: LeaderboardViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

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

    const totalScore = p.totalScore !== undefined && p.totalScore !== 0 ? p.totalScore : (p1Score + p2Score);
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

  if (!resultsPublished) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center animate-fade-in">
        <div className="rounded-xl border border-red-900/60 bg-zinc-950 p-6 sm:p-8 w-full shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent pointer-events-none" />
          <div className="w-14 h-14 rounded-full bg-red-950/80 border border-red-600/50 flex items-center justify-center mx-auto mb-4 text-red-500 font-mono text-2xl font-bold shadow-lg animate-pulse">
            🔒
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-red-900/80 bg-red-950/40 text-xs font-mono text-red-400 mb-4 font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            STANDINGS LOCKED · PENDING PUBLICATION
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            DC 2026 REVENGE STANDINGS
          </h2>
          <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto leading-relaxed">
            The contest administrator is reviewing final reverse-defect code evaluations. Official standings will be unlocked once published by the judge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Movie-Themed Header Card */}
      <div className="relative rounded-xl overflow-hidden border border-red-900/80 bg-zinc-950 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/bc_logo.png"
              alt="DC 2026 Logo"
              className="w-16 h-16 rounded-lg object-contain border border-red-800 bg-zinc-950 p-1 shadow-xl shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-black uppercase tracking-widest shadow-md">
                  DC 2026 TAMIL MOVIE EDITION
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono font-bold">
                  OFFICIAL LEADERBOARD
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>DSA REVENGE ARENA STANDINGS</span>
                <Flame className="w-5 h-5 text-red-500 animate-pulse" />
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Final scores compiled across <strong>Round 1 (The Lodge Escape)</strong> &amp; <strong>Round 2 (Das&apos;s Gang)</strong>.
              </p>
            </div>
          </div>

          {/* Search bar & Refresh Button */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name..."
                className="bg-zinc-900/90 border border-zinc-800 focus:border-red-600 text-zinc-100 text-xs rounded-lg pl-9 pr-3 py-2 outline-none w-52 font-mono transition-all"
              />
            </div>

            <button
              onClick={fetchLeaderboardData}
              disabled={isLoading}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600/60 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-md"
              title="Refresh Standings"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-red-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Movie Character Podium */}
      {filteredEntries.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rank #1: DAS (Gold) */}
          <div className="rounded-xl border border-amber-600/60 bg-gradient-to-b from-amber-950/30 via-zinc-950 to-zinc-950 p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded bg-amber-500 text-black text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Trophy className="w-3.5 h-3.5 text-black" /> #1 DAS (GANG CHIEF)
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {filteredEntries[0].languages.join(" · ").toUpperCase() || "C++"}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-1 truncate">
                {filteredEntries[0].participant.name}
              </h3>
              <p className="text-[11px] font-mono text-zinc-400 mb-3 truncate">
                {filteredEntries[0].participant.email}
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono text-amber-400 drop-shadow">
                  {filteredEntries[0].totalScore}
                </span>
                <span className="text-xs font-mono text-zinc-400">/ 200 Total Pts</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-900/40 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300">P1: <strong className="text-white">{filteredEntries[0].p1Score}</strong></span>
              <span className="text-zinc-300">P2: <strong className="text-white">{filteredEntries[0].p2Score}</strong></span>
              {filteredEntries[0].totalDeductions > 0 ? (
                <span className="text-red-400 font-bold">-{filteredEntries[0].totalDeductions} pts</span>
              ) : (
                <span className="text-emerald-400 font-bold">PERFECT ESCAPE</span>
              )}
            </div>
          </div>

          {/* Rank #2: CHANDRA (Silver) */}
          {filteredEntries.length >= 2 && (
            <div className="rounded-xl border border-zinc-700 bg-gradient-to-b from-zinc-900/40 via-zinc-950 to-zinc-950 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded bg-zinc-300 text-black text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Medal className="w-3.5 h-3.5 text-black" /> #2 CHANDRA (TASK FORCE)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300 font-bold">
                    {filteredEntries[1].languages.join(" · ").toUpperCase() || "C++"}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1 truncate">
                  {filteredEntries[1].participant.name}
                </h3>
                <p className="text-[11px] font-mono text-zinc-400 mb-3 truncate">
                  {filteredEntries[1].participant.email}
                </p>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-zinc-200">
                    {filteredEntries[1].totalScore}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">/ 200 Total Pts</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300">P1: <strong className="text-white">{filteredEntries[1].p1Score}</strong></span>
                <span className="text-zinc-300">P2: <strong className="text-white">{filteredEntries[1].p2Score}</strong></span>
                {filteredEntries[1].totalDeductions > 0 ? (
                  <span className="text-red-400 font-bold">-{filteredEntries[1].totalDeductions} pts</span>
                ) : (
                  <span className="text-emerald-400 font-bold">NO DEFECTS</span>
                )}
              </div>
            </div>
          )}

          {/* Rank #3: KARUPPU (Bronze) */}
          {filteredEntries.length >= 3 && (
            <div className="rounded-xl border border-amber-900/50 bg-gradient-to-b from-amber-950/20 via-zinc-950 to-zinc-950 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded bg-amber-800 text-amber-100 text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Award className="w-3.5 h-3.5 text-amber-200" /> #3 KARUPPU (ENFORCER)
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 font-bold">
                    {filteredEntries[2].languages.join(" · ").toUpperCase() || "C++"}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1 truncate">
                  {filteredEntries[2].participant.name}
                </h3>
                <p className="text-[11px] font-mono text-zinc-400 mb-3 truncate">
                  {filteredEntries[2].participant.email}
                </p>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-amber-300">
                    {filteredEntries[2].totalScore}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">/ 200 Total Pts</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300">P1: <strong className="text-white">{filteredEntries[2].p1Score}</strong></span>
                <span className="text-zinc-300">P2: <strong className="text-white">{filteredEntries[2].p2Score}</strong></span>
                {filteredEntries[2].totalDeductions > 0 ? (
                  <span className="text-red-400 font-bold">-{filteredEntries[2].totalDeductions} pts</span>
                ) : (
                  <span className="text-emerald-400 font-bold">CLEAN CODE</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Standings Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200">
            <Zap className="w-4 h-4 text-red-500" />
            <span>FULL CANDIDATE ROSTER STANDINGS ({filteredEntries.length})</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Click inspection buttons (P1/P2) to view reverse flaw deductions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4 text-center">Languages</th>
                <th className="py-3 px-4 text-center">P1 (Lodge Escape)</th>
                <th className="py-3 px-4 text-center">P2 (Das&apos;s Gang)</th>
                <th className="py-3 px-4 text-center">Tab Penalties</th>
                <th className="py-3 px-4 text-center">Total Deductions</th>
                <th className="py-3 px-4 text-right">Final Score</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-mono text-xs">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500 font-mono">
                    No matching candidate found in the standings roster.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isCurrent = currentParticipant?.id === entry.participant.id;
                  return (
                    <tr
                      key={entry.participant.id}
                      className={`hover:bg-zinc-900/50 transition-colors ${
                        isCurrent ? "bg-red-950/20 border-l-2 border-l-red-600" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs ${
                            idx === 0
                              ? "bg-amber-500 text-black font-black shadow-md"
                              : idx === 1
                              ? "bg-zinc-300 text-black font-black shadow-md"
                              : idx === 2
                              ? "bg-amber-800 text-white font-black shadow-md"
                              : "bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{entry.participant.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-mono font-bold">
                                YOU
                              </span>
                            )}
                            {entry.isManual && (
                              <span
                                title="Judged manually by administrator"
                                className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[9px] border border-amber-800 font-bold"
                              >
                                JUDGE REVIEWED
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500">{entry.participant.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {entry.languages.length > 0 ? (
                            entry.languages.map((l) => (
                              <span
                                key={l}
                                className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px] uppercase border border-zinc-800 font-bold"
                              >
                                {l}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-600 text-[10px]">C++</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {entry.p1Sub ? (
                          entry.p1Sub.status === "pending" || entry.p1Sub.status === "evaluating" ? (
                            <span className="text-amber-400 font-medium italic text-[10px] animate-pulse">EVALUATING</span>
                          ) : (
                            <span className="text-white font-bold">
                              {entry.p1Score} <span className="text-zinc-600 text-[10px]">/ 100</span>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {entry.p2Sub ? (
                          entry.p2Sub.status === "pending" || entry.p2Sub.status === "evaluating" ? (
                            <span className="text-amber-400 font-medium italic text-[10px] animate-pulse">EVALUATING</span>
                          ) : (
                            <span className="text-white font-bold">
                              {entry.p2Score} <span className="text-zinc-600 text-[10px]">/ 100</span>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {entry.tabSwitchPenalty > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-bold text-[11px]">
                            -{entry.tabSwitchPenalty} pts ({entry.tabSwitchCount} tabs)
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold text-[11px]">CLEAN (0)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {entry.totalDeductions > 0 ? (
                          <span className="text-red-400 font-bold">
                            -{entry.totalDeductions} pts
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">0 pts</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-white text-base">
                        {entry.totalScore}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {entry.p1Sub && (
                            <button
                              onClick={() => setSelectedSubmission(entry.p1Sub!)}
                              className="px-2 py-1 rounded bg-zinc-900 hover:bg-red-950 text-zinc-300 hover:text-red-300 border border-zinc-800 hover:border-red-700 text-[10px] font-bold transition-all cursor-pointer"
                              title="Inspect Problem 1 Flaw Breakdown"
                            >
                              P1
                            </button>
                          )}
                          {entry.p2Sub && (
                            <button
                              onClick={() => setSelectedSubmission(entry.p2Sub!)}
                              className="px-2 py-1 rounded bg-zinc-900 hover:bg-red-950 text-zinc-300 hover:text-red-300 border border-zinc-800 hover:border-red-700 text-[10px] font-bold transition-all cursor-pointer"
                              title="Inspect Problem 2 Flaw Breakdown"
                            >
                              P2
                            </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="max-w-xl w-full rounded-xl border border-red-900 bg-zinc-950 p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedSubmission.participantName}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                    {selectedSubmission.problemTitle}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Language: {selectedSubmission.language.toUpperCase()} · Evaluator: {selectedSubmission.evaluation?.evaluatorType || "AI Reverse Engine"}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score summary box */}
            <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 mb-4 flex justify-between items-center">
              <span className="text-zinc-400 text-xs">Awarded Problem Score:</span>
              <span className="text-lg font-black text-emerald-400">
                {selectedSubmission.evaluation?.score ?? 0} / 100 PTS
              </span>
            </div>

            {/* Defects breakdown */}
            <div className="space-y-3 text-xs mb-4">
              <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Reverse Flaw Deductions
              </h4>

              {/* Syntax Errors */}
              {selectedSubmission.evaluation?.syntaxErrors && selectedSubmission.evaluation.syntaxErrors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-amber-400 font-bold">Syntax Flaws:</div>
                  {selectedSubmission.evaluation.syntaxErrors.map((err, i) => (
                    <div key={i} className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 flex justify-between items-center gap-2">
                      <span>• Line {err.line || "—"}: {err.message}</span>
                      <span className="text-red-400 font-bold shrink-0">-{err.deduction} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Logic Flaws */}
              {selectedSubmission.evaluation?.logicErrors && selectedSubmission.evaluation.logicErrors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-red-400 font-bold">Logic Errors:</div>
                  {selectedSubmission.evaluation.logicErrors.map((err, i) => (
                    <div key={i} className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 flex justify-between items-center gap-2">
                      <span>• Line {err.line || "—"}: {err.message}</span>
                      <span className="text-red-400 font-bold shrink-0">-{err.deduction} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Edge Case Errors */}
              {selectedSubmission.evaluation?.edgeCaseErrors && selectedSubmission.evaluation.edgeCaseErrors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400 font-bold">Edge Cases Missed:</div>
                  {selectedSubmission.evaluation.edgeCaseErrors.map((err, i) => (
                    <div key={i} className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 flex justify-between items-center gap-2">
                      <span>• {err.message}</span>
                      <span className="text-red-400 font-bold shrink-0">-{err.deduction} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {(!selectedSubmission.evaluation?.syntaxErrors?.length &&
                !selectedSubmission.evaluation?.logicErrors?.length &&
                !selectedSubmission.evaluation?.edgeCaseErrors?.length) && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Flawless code! Zero defects detected by the reverse evaluator.</span>
                </div>
              )}
            </div>

            {/* AI Notes */}
            {selectedSubmission.evaluation?.aiFeedback && (
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 italic">
                &ldquo;{selectedSubmission.evaluation.aiFeedback}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
