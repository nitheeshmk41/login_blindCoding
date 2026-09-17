"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Music } from "lucide-react";

export const PLAYLIST = [
  { id: "track-1", title: "Hangova", src: "/Hangova.mp3" },
  { id: "track-2", title: "Ain't Nobody", src: "/Ain't%20Nobody.mp3" },
  { id: "track-3", title: "Raga of Revenge", src: "/Raga%20of%20Revenge.mp3" },
];

export default function BackgroundMusic() {
  const [adminVolume, setAdminVolume] = useState(0.25); // Default 25% volume
  const [userMuted, setUserMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll contest state to sync with Admin global volume settings & track selection
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/contest", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.contest?.backgroundMusicVolume !== undefined) {
            setAdminVolume(Number(data.contest.backgroundMusicVolume));
          }
          if (data.contest?.currentTrackIndex !== undefined) {
            setCurrentTrackIdx(Number(data.contest.currentTrackIndex) % PLAYLIST.length);
          }
        }
      } catch (err) {
        // Ignore fetch errors during polling
      }
    };

    fetchState();
    intervalRef.current = setInterval(fetchState, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // First user interaction listener to trigger browser audio autoplay
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
      }
    };

    window.addEventListener("click", handleFirstInteraction, { once: false });
    window.addEventListener("keydown", handleFirstInteraction, { once: false });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [hasInteracted]);

  const currentTrack = PLAYLIST[currentTrackIdx] || PLAYLIST[0];

  // Auto-advance to next song in circle when current song ends locally
  const handleEnded = () => {
    setCurrentTrackIdx((prev) => (prev + 1) % PLAYLIST.length);
  };

  // Handle HTML5 Audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const effectiveVol = Math.max(0, Math.min(1, adminVolume));
    audio.volume = effectiveVol;

    const shouldPlay = !userMuted && hasInteracted && effectiveVol > 0;

    if (shouldPlay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrackIdx, adminVolume, userMuted, hasInteracted]);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
      {/* 3 Songs Circular Auto-Playing Audio */}
      <audio
        ref={audioRef}
        src={currentTrack.src}
        autoPlay
        preload="auto"
        onEnded={handleEnded}
      />

      {/* Sound Controller Widget (Participants cannot skip song, only Admin can) */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121215]/95 border border-[#27272a] shadow-xl backdrop-blur-md text-xs font-mono">
        <Music
          className={`w-3.5 h-3.5 transition-colors ${
            isPlaying ? "text-[#dc2626] animate-pulse" : "text-zinc-600"
          }`}
        />
        <div className="flex items-center gap-1.5 text-zinc-300">
          <span className="hidden sm:inline font-bold text-zinc-200">
            {currentTrack.title} ({currentTrackIdx + 1}/3)
          </span>

          {userMuted ? (
            <span className="text-zinc-500 font-bold ml-1">(MUTED)</span>
          ) : !hasInteracted ? (
            <span className="text-amber-400 text-[10px] ml-1 animate-pulse">[Click anywhere to start music]</span>
          ) : (
            <span className="text-emerald-400 text-[10px] ml-1 font-bold">
              PLAYING ({Math.round((adminVolume || 0.25) * 100)}%)
            </span>
          )}
        </div>

        {/* Local Mute Toggle */}
        <button
          onClick={() => setUserMuted(!userMuted)}
          className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
          title={userMuted ? "Unmute Soundtrack" : "Mute Soundtrack"}
        >
          {userMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-[#dc2626]" />
          )}
        </button>
      </div>
    </div>
  );
}
