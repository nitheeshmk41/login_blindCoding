"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import LobbyView from "@/components/LobbyView";
import ProblemWorkspace from "@/components/ProblemWorkspace";
import LeaderboardView from "@/components/LeaderboardView";
import { Participant, ContestStatus, Submission } from "@/lib/types";

export default function HomePage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [contestStatus, setContestStatus] = useState<ContestStatus>("WAITING");
  const [currentRound, setCurrentRound] = useState<0 | 1 | 2>(0);
  const [round1Unlocked, setRound1Unlocked] = useState<boolean>(false);
  const [round2Unlocked, setRound2Unlocked] = useState<boolean>(false);
  const [resultsPublished, setResultsPublished] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "leaderboard">("workspace");
  const [isLoading, setIsLoading] = useState(true);

  // Load stored participant session if exists
  useEffect(() => {
    try {
      const stored = localStorage.getItem("blindcode_participant");
      if (stored) {
        setParticipant(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not read local storage", e);
    }
  }, []);

  // Poll contest state
  useEffect(() => {
    async function checkContestState() {
      try {
        const res = await fetch("/api/contest");
        const data = await res.json();
        if (data?.contest) {
          setContestStatus(data.contest.status);
          setCurrentRound(data.contest.currentRound ?? 0);
          setRound1Unlocked(Boolean(data.contest.round1Unlocked));
          setRound2Unlocked(Boolean(data.contest.round2Unlocked));
          setResultsPublished(Boolean(data.contest.resultsPublished));
        }
      } catch (err) {
        console.error("Failed to query contest status:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkContestState();
    const interval = setInterval(checkContestState, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleJoinSuccess = (p: Participant) => {
    setParticipant(p);
    try {
      localStorage.setItem("blindcode_participant", JSON.stringify(p));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  };

  const handleLogout = () => {
    setParticipant(null);
    try {
      localStorage.removeItem("blindcode_participant");
    } catch (e) {}
  };

  const handleContestStarted = () => {
    setContestStatus("ACTIVE");
    setActiveTab("workspace");
  };

  const handleSubmissionComplete = (sub: Submission) => {
    if (participant) {
      const isDemo = sub.problemId === "p1-demo-array";
      const isP1 = sub.problemId === "p2-stack-lodge";
      const isP2 = sub.problemId === "p3-linkedlist-gang";

      const updated: Participant = {
        ...participant,
        currentProblemIndex: isDemo ? 1 : isP1 ? 2 : isP2 ? 3 : participant.currentProblemIndex,
        completed: isP2,
        totalScore: participant.totalScore + (sub.evaluation?.score || 0),
      };
      setParticipant(updated);
      try {
        localStorage.setItem("blindcode_participant", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const handleAllCompleted = () => {
    if (resultsPublished) {
      setActiveTab("leaderboard");
    }
  };

  return (
    <div className="cyber-bg min-h-screen flex flex-col">
      <Navbar
        status={contestStatus}
        participant={participant}
        activeTab={activeTab}
        resultsPublished={resultsPublished}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col">
        {/* If event is fully CLOSED */}
        {contestStatus === "CLOSED" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full text-center animate-fade-in">
            <div className="rounded-lg border border-red-900/60 bg-zinc-950 p-6 sm:p-8 w-full shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-600/50 flex items-center justify-center mx-auto mb-4 text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-900/80 bg-red-950/40 text-xs font-mono text-red-400 mb-4">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Event Terminated
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2 tracking-tight">
                Contest is Closed
              </h2>
              <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto leading-relaxed">
                The administrator has permanently closed this event. The leaderboard and problem workspace are no longer accessible. Thank you for participating.
              </p>
            </div>
          </div>
        ) : activeTab === "leaderboard" ? (
          <LeaderboardView currentParticipant={participant} resultsPublished={resultsPublished} />
        ) : !participant || contestStatus === "WAITING" ? (
          /* Clean Lobby view */
          <LobbyView
            existingParticipant={participant}
            onJoinSuccess={handleJoinSuccess}
            onContestStarted={handleContestStarted}
            onLogout={handleLogout}
          />
        ) : (
          <ProblemWorkspace
            participant={participant}
            currentRound={currentRound}
            round1Unlocked={round1Unlocked}
            round2Unlocked={round2Unlocked}
            resultsPublished={resultsPublished}
            onAllCompleted={handleAllCompleted}
            onSubmissionComplete={handleSubmissionComplete}
            onViewLeaderboard={() => setActiveTab("leaderboard")}
          />
        )}
      </main>
    </div>
  );
}
