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
} from "lucide-react";
import { Submission, Participant } from "@/lib/types";

interface LeaderboardViewProps {
  currentParticipant?: Participant | null;
}

export default function LeaderboardView({ currentParticipant }: LeaderboardViewProps) {
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

  // Compute standings
  const leaderboardEntries = participants.map((p) => {
    const userSubs = submissions.filter((s) => s.participantId === p.id);
    const p1Sub = userSubs.find((s) => s.problemId === "p1-linked-list");
    const p2Sub = userSubs.find((s) => s.problemId === "p2-queues");

    const p1Score = p1Sub?.evaluation?.score ?? 0;
    const p2Score = p2Sub?.evaluation?.score ?? 0;

    const p1Deductions = p1Sub?.evaluation?.totalDeduction ?? 0;
    const p2Deductions = p2Sub?.evaluation?.totalDeduction ?? 0;
    const totalDeductions = p1Deductions + p2Deductions;

    const totalScore = p1Score + p2Score;
    const languages = Array.from(new Set(userSubs.map((s) => s.language)));

    const isManual = userSubs.some((s) => s.evaluation?.isManuallyOverridden);

    return {
      participant: p,
      p1Sub,
      p2Sub,
      p1Score,
      p2Score,
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
    entry.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              Contest Leaderboard
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
              Live Standings
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Reverse Marking: Base 100 points per problem with static defect deductions.
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate..."
              className="bg-zinc-900 border border-zinc-800 focus:border-zinc-600 text-zinc-200 text-xs rounded-md pl-8 pr-3 py-1.5 outline-none w-48 transition-colors"
            />
          </div>

          <button
            onClick={fetchLeaderboardData}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-red-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top 2 Spotlight Cards (Only Top 2 Highlighted) */}
      {filteredEntries.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Rank #1 Champion */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-red-800/60 text-red-400 text-[11px] font-mono font-medium flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-red-500" /> #1 Champion
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {filteredEntries[0].languages.join(" · ").toUpperCase() || "C++"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                {filteredEntries[0].participant.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-zinc-100">
                  {filteredEntries[0].totalScore}
                </span>
                <span className="text-xs font-mono text-zinc-500">/ 200 Total Pts</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between text-xs font-mono text-zinc-400">
              <span>P1: <strong className="text-zinc-200">{filteredEntries[0].p1Score}</strong> pts</span>
              <span>P2: <strong className="text-zinc-200">{filteredEntries[0].p2Score}</strong> pts</span>
              {filteredEntries[0].totalDeductions > 0 && (
                <span className="text-red-400">
                  -{filteredEntries[0].totalDeductions} pts
                </span>
              )}
            </div>
          </div>

          {/* Rank #2 Runner-Up */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-[11px] font-mono font-medium flex items-center gap-1.5">
                  <Medal className="w-3 h-3 text-zinc-400" /> #2 Runner-Up
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {filteredEntries[1].languages.join(" · ").toUpperCase() || "C++"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                {filteredEntries[1].participant.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-zinc-200">
                  {filteredEntries[1].totalScore}
                </span>
                <span className="text-xs font-mono text-zinc-500">/ 200 Total Pts</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between text-xs font-mono text-zinc-400">
              <span>P1: <strong className="text-zinc-200">{filteredEntries[1].p1Score}</strong> pts</span>
              <span>P2: <strong className="text-zinc-200">{filteredEntries[1].p2Score}</strong> pts</span>
              {filteredEntries[1].totalDeductions > 0 && (
                <span className="text-red-400">
                  -{filteredEntries[1].totalDeductions} pts
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">Rank</th>
                <th className="py-2.5 px-4">Candidate</th>
                <th className="py-2.5 px-4 text-center">Languages</th>
                <th className="py-2.5 px-4 text-center">P1 (Linked List)</th>
                <th className="py-2.5 px-4 text-center">P2 (Queues)</th>
                <th className="py-2.5 px-4 text-center">Deductions</th>
                <th className="py-2.5 px-4 text-right">Score</th>
                <th className="py-2.5 px-4 text-center">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-mono text-xs">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No candidates matching query.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isCurrent = currentParticipant?.id === entry.participant.id;
                  return (
                    <tr
                      key={entry.participant.id}
                      className={`hover:bg-zinc-900/40 transition-colors ${
                        isCurrent ? "bg-zinc-900/60" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${
                            idx === 0
                              ? "bg-zinc-800 text-red-400 font-bold border border-red-800/60"
                              : idx === 1
                              ? "bg-zinc-800 text-zinc-200 font-bold border border-zinc-700"
                              : "text-zinc-500 font-normal"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100">{entry.participant.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[9px] font-mono border border-zinc-700">
                              YOU
                            </span>
                          )}
                          {entry.isManual && (
                            <span
                              title="Reviewed by Judge"
                              className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 text-[9px] border border-zinc-800"
                            >
                              MANUAL
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {entry.languages.map((l) => (
                            <span
                              key={l}
                              className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[10px] uppercase border border-zinc-800"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {entry.p1Sub ? (
                          entry.p1Sub.status === "pending" || entry.p1Sub.status === "evaluating" ? (
                            <span className="text-zinc-500 font-medium italic text-[10px]">PENDING</span>
                          ) : (
                            <span className="text-zinc-200 font-medium">
                              {entry.p1Score} <span className="text-zinc-600 text-[10px]">/ 100</span>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {entry.p2Sub ? (
                          entry.p2Sub.status === "pending" || entry.p2Sub.status === "evaluating" ? (
                            <span className="text-zinc-500 font-medium italic text-[10px]">PENDING</span>
                          ) : (
                            <span className="text-zinc-200 font-medium">
                              {entry.p2Score} <span className="text-zinc-600 text-[10px]">/ 100</span>
                            </span>
                          )
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {entry.totalDeductions > 0 ? (
                          <span className="text-red-400 font-medium">
                            -{entry.totalDeductions}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-medium">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-zinc-100">
                        {entry.totalScore}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {entry.p1Sub && (
                            <button
                              onClick={() => setSelectedSubmission(entry.p1Sub!)}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[10px] transition-colors"
                              title="Inspect P1 Defects"
                            >
                              P1
                            </button>
                          )}
                          {entry.p2Sub && (
                            <button
                              onClick={() => setSelectedSubmission(entry.p2Sub!)}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[10px] transition-colors"
                              title="Inspect P2 Defects"
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

      {/* Submission Audit Inspector Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="max-w-xl w-full rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  {selectedSubmission.participantName} · {selectedSubmission.problemTitle}
                </h3>
                <p className="text-[11px] font-mono text-zinc-500">
                  Language: {selectedSubmission.language.toUpperCase()} · Evaluator: {selectedSubmission.evaluation?.modelUsed || "AI Evaluator"}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score pill */}
            <div className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800 mb-4 flex justify-between items-center font-mono text-xs">
              <span className="text-zinc-400">Awarded Score:</span>
              <span className="text-base font-bold text-zinc-100">
                {selectedSubmission.evaluation?.score ?? 0} / 100 PTS
              </span>
            </div>

            {/* Defects breakdown */}
            <div className="space-y-3 font-mono text-xs mb-4">
              <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Identified Code Flaws
              </h4>

              {/* Syntax Errors */}
              {selectedSubmission.evaluation?.syntaxErrors && selectedSubmission.evaluation.syntaxErrors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-amber-400 font-semibold">Syntax Errors:</div>
                  {selectedSubmission.evaluation.syntaxErrors.map((err, i) => (
                    <div key={i} className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 text-[11px] text-zinc-300 flex justify-between gap-2">
                      <span>• Line {err.line || "—"}: {err.message}</span>
                      <span className="text-red-400 shrink-0">-{err.deduction} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Logic Flaws */}
              {selectedSubmission.evaluation?.logicErrors && selectedSubmission.evaluation.logicErrors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-red-400 font-semibold">Logic Flaws:</div>
                  {selectedSubmission.evaluation.logicErrors.map((err, i) => (
                    <div key={i} className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 text-[11px] text-zinc-300 flex justify-between gap-2">
                      <span>• Line {err.line || "—"}: {err.message}</span>
                      <span className="text-red-400 shrink-0">-{err.deduction} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Edge Case Errors */}
              {selectedSubmission.evaluation?.edgeCaseErrors && selectedSubmission.evaluation.edgeCaseErrors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400 font-semibold">Edge Cases Missed:</div>
                  {selectedSubmission.evaluation.edgeCaseErrors.map((err, i) => (
                    <div key={i} className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 text-[11px] text-zinc-300 flex justify-between gap-2">
                      <span>• {err.message}</span>
                      <span className="text-red-400 shrink-0">-{err.deduction} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {(!selectedSubmission.evaluation?.syntaxErrors?.length &&
                !selectedSubmission.evaluation?.logicErrors?.length &&
                !selectedSubmission.evaluation?.edgeCaseErrors?.length) && (
                <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800 text-emerald-400 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Flawless submission with zero defects detected.</span>
                </div>
              )}
            </div>

            {/* AI Notes */}
            {selectedSubmission.evaluation?.aiFeedback && (
              <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 italic">
                &ldquo;{selectedSubmission.evaluation.aiFeedback}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
