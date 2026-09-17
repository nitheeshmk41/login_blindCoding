"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Code2,
  Trophy,
  Terminal,
  LogOut,
  ShieldAlert,
  Cpu,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ContestStatus, Participant } from "@/lib/types";
import { isSoundMuted, toggleSoundMuted, playClickSound } from "@/lib/sound-effects";

interface NavbarProps {
  status?: ContestStatus;
  participant?: Participant | null;
  activeTab?: "workspace" | "leaderboard";
  resultsPublished?: boolean;
  onTabChange?: (tab: "workspace" | "leaderboard") => void;
  onLogout?: () => void;
}

export default function Navbar({
  status = "WAITING",
  participant,
  activeTab = "workspace",
  resultsPublished = false,
  onTabChange,
  onLogout,
}: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [providerInfo, setProviderInfo] = useState<string>("OpenRouter");
  const [muted, setMuted] = useState<boolean>(false);

  useEffect(() => {
    setMuted(isSoundMuted());
  }, []);

  const handleToggleSound = () => {
    const nextMuted = toggleSoundMuted();
    setMuted(nextMuted);
    if (!nextMuted) {
      playClickSound();
    }
  };

  useEffect(() => {
    async function checkAiConfig() {
      try {
        const res = await fetch("/api/admin/config");
        const data = await res.json();
        if (data.provider === "openrouter") {
          setProviderInfo("OpenRouter Free");
        } else if (data.provider === "gemini") {
          setProviderInfo("Gemini 1.5");
        } else if (data.provider === "ollama") {
          setProviderInfo("Ollama");
        } else {
          setProviderInfo("Static AST");
        }
      } catch {
        setProviderInfo("OpenRouter Free");
      }
    }
    checkAiConfig();
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 text-zinc-100 hover:text-white transition-colors">
          <img
            src="/bc_logo.png"
            alt="Blind Coding Event Logo"
            className="w-8 h-8 rounded-md object-contain border border-zinc-700 bg-zinc-950 p-0.5 shadow-sm"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-sm tracking-tight text-white">LOGIN 2K26</span>
              <span className="text-[11px] font-mono text-red-400 font-semibold">· DC Movie DSA Arena</span>
            </div>
            <span className="text-[10px] text-zinc-400 hidden md:block">PSG College of Technology · MCA</span>
          </div>
        </Link>

        {/* Contest Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-red-900/60 bg-zinc-900/80 text-[11px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === "ACTIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-zinc-300 font-semibold">
            {status === "ACTIVE" ? "DC Arena Active" : "Lobby Standby"}
          </span>
        </div>
      </div>

      {/* Segmented Navigation Tabs (Only in Assessment View) */}
      {!isAdmin && onTabChange && (
        <nav className="flex items-center bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-md">
          <button
            onClick={() => onTabChange("workspace")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "workspace"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Workspace</span>
          </button>
          <button
            onClick={() => {
              if (resultsPublished) {
                onTabChange("leaderboard");
              } else {
                alert("Results Pending Publication: Leaderboard will be visible once the admin publishes the final standings.");
              }
            }}
            title={resultsPublished ? "View Leaderboard" : "Leaderboard locked until Admin publishes results"}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "leaderboard"
                ? "bg-zinc-800 text-white shadow-xs"
                : resultsPublished
                ? "text-zinc-400 hover:text-zinc-200"
                : "text-zinc-600 cursor-not-allowed opacity-60"
            }`}
          >
            <Trophy className={`w-3.5 h-3.5 ${resultsPublished ? "text-zinc-400" : "text-amber-600"}`} />
            <span>Leaderboard {resultsPublished ? "" : "🔒"}</span>
          </button>
        </nav>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Sound FX Toggle Button */}
        <button
          onClick={handleToggleSound}
          title={muted ? "Unmute Sound Effects" : "Mute Sound Effects"}
          className="p-1.5 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Candidate Badge & Logout */}
        {participant && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded border border-zinc-800 bg-zinc-900/50">
              <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] flex items-center justify-center font-semibold">
                {participant.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-xs font-medium text-zinc-200 max-w-[120px] truncate">
                {participant.name}
              </span>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out of assessment"
                className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        )}

        {/* Exit Admin button ONLY visible when actually on /admin */}
        {isAdmin && (
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Exit Admin</span>
          </Link>
        )}
      </div>
    </header>
  );
}
