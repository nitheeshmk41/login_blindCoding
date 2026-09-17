"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Shield,
  Clock,
  LogOut,
  CheckCircle2,
  FileCode2,
  AlertCircle,
  EyeOff,
  Delete,
} from "lucide-react";
import { Participant } from "@/lib/types";

interface LobbyViewProps {
  onJoinSuccess: (participant: Participant) => void;
  onContestStarted: () => void;
  onLogout?: () => void;
  existingParticipant?: Participant | null;
}

export default function LobbyView({
  onJoinSuccess,
  onContestStarted,
  onLogout,
  existingParticipant,
}: LobbyViewProps) {
  const [name, setName] = useState(existingParticipant?.name || "");
  const [email, setEmail] = useState(existingParticipant?.email || "");
  const [phone, setPhone] = useState(existingParticipant?.phone || "");
  const [code, setCode] = useState(existingParticipant?.contestCode || "BLIND2026");

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(0);

  // Poll contest status & lobby roster
  useEffect(() => {
    async function fetchLobbyStatus() {
      try {
        const res = await fetch("/api/contest");
        const data = await res.json();
        if (data?.contest) {
          setParticipantsCount(data.contest.participants?.length || 0);
          if (data.contest.status === "ACTIVE" && existingParticipant) {
            onContestStarted();
          }
        }
      } catch (err) {
        console.error("Lobby poll error:", err);
      }
    }

    fetchLobbyStatus();
    const interval = setInterval(fetchLobbyStatus, 2500);
    return () => clearInterval(interval);
  }, [existingParticipant, onContestStarted]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid academic or professional email address.");
      return;
    }
    if (!phone.trim() || phone.length < 8) {
      setError("Please enter a valid contact phone number.");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      if (typeof document !== "undefined" && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          code: code.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete lobby registration");
      }

      onJoinSuccess(data.participant);
      if (data.contestStatus === "ACTIVE") {
        onContestStarted();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error joining lobby");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Assessment Specifications & Institutional Context */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-6 sm:p-7">
          <div>
            {/* DC Movie 2026 Poster Card */}
            <div className="relative rounded-lg overflow-hidden border border-red-900/70 shadow-xl mb-5 group">
              <img
                src="/dc_movie_full.jpg"
                alt="DC Movie 2026 Poster"
                className="w-full h-44 object-cover object-top filter brightness-95 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                    DC (2026) TAMIL MOVIE EDITION
                  </span>
                  <h2 className="text-sm font-mono font-bold text-white mt-1 drop-shadow">
                    Das • Chandra • Kitty • Karuppu • Sebastian
                  </h2>
                </div>
                <div className="hidden sm:block text-right font-mono text-[11px] text-zinc-300 bg-black/70 px-2.5 py-1 rounded border border-zinc-700">
                  3 DSA Revenge Problems
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-red-500 font-semibold">
                PSG College of Technology · MCA
              </span>
              <span className="text-zinc-600 text-xs">/</span>
              <span className="text-[11px] font-mono text-zinc-400">LOGIN 2026</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mb-2">
              DC 2026 — DSA Revenge Arena
            </h1>

            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              Welcome to the DC Movie themed Blind Coding Challenge! Map the film&apos;s high-stakes gang operation, police task force chases, lodge escapes, and revenge traps into core Data Structures &amp; Algorithms.
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-md bg-zinc-900/60 border border-zinc-800/80">
                <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">Demo Round: Das&apos;s Stolen Money</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">5 Mins</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Warmup problem. Editor text is blurred with selection disabled. No marks or evaluation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md bg-zinc-900/60 border border-zinc-800/80">
                <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <EyeOff className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">Round 1: The Lodge Escape</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-900 font-bold">25 Mins</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Escape through lodge rooms. Editor text is blurred with selection disabled.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md bg-zinc-900/60 border border-zinc-800/80">
                <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Delete className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">Round 2: Das&apos;s Gang</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-900 font-bold">30 Mins</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Remove compromised gang members. Pure blackout mode (Backspace &amp; Delete disabled).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md bg-zinc-900/60 border border-zinc-800/80">
                <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-zinc-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-200">Proctoring &amp; AI Reverse Grading</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">100 Base</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Strict full-screen. Tab switches penalized after 2 warnings (-10 pts). Graded by AI Evaluator.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Supported: C++, Java, Python, C, JavaScript</span>
            <span>{participantsCount} candidates registered</span>
          </div>
        </div>

        {/* Right Column: Check-in Form or Standby Card */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          {!existingParticipant ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 sm:p-7">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-zinc-100 mb-1">
                  Candidate Check-in
                </h2>
                <p className="text-xs text-zinc-400">
                  Enter your credentials to enter the assessment lobby.
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name as per college ID"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-zinc-100 text-xs rounded-md px-3 py-2 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institution.edu"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-zinc-100 text-xs rounded-md px-3 py-2 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-zinc-100 text-xs rounded-md px-3 py-2 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Contest Access Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="BLIND2026"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 text-zinc-100 font-mono text-xs rounded-md px-3 py-2 uppercase outline-none transition-colors"
                    required
                  />
                </div>

                {error && (
                  <div className="p-2.5 rounded-md bg-red-950/30 border border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoining}
                  className="btn-primary-red w-full mt-2 py-2 px-4 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isJoining ? (
                    <span>Validating credentials...</span>
                  ) : (
                    <>
                      <span>Enter Assessment Lobby</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-zinc-900 text-center">
                <p className="text-[11px] text-zinc-500">
                  By checking in, you agree to the automated anti-cheat protocol and static code analysis rules.
                </p>
              </div>
            </div>
          ) : (
            /* Checked-in Standby Card */
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 sm:p-7 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>

              <h2 className="text-base font-semibold text-zinc-100 mb-1">
                Candidate Registered
              </h2>
              <p className="text-xs text-zinc-400 mb-4">
                You are checked in and waiting in the assessment lobby.
              </p>

              <div className="bg-zinc-900/70 border border-zinc-800 rounded-md p-3 text-left font-mono text-xs space-y-2 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Name:</span>
                  <span className="text-zinc-200 font-medium">{existingParticipant.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-zinc-300">{existingParticipant.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Phone:</span>
                  <span className="text-zinc-300">{existingParticipant.phone}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                  <span className="text-zinc-500">Access Code:</span>
                  <span className="text-zinc-200 font-semibold">{existingParticipant.contestCode}</span>
                </div>
              </div>

              <div className="p-3 rounded-md bg-zinc-900/50 border border-zinc-800 flex items-center justify-center gap-2 text-xs font-mono text-zinc-300 mb-5">
                <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Waiting for administrator to initiate Round 1 (10 Mins)...</span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full py-1.5 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out / Switch account</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
