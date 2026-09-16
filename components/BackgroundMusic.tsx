"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Music } from "lucide-react";

export default function BackgroundMusic() {
  const [adminEnabled, setAdminEnabled] = useState(true);
  const [userMuted, setUserMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const isSetupRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll contest state to stay in sync with Admin music toggle
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/contest", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.contest?.backgroundMusicEnabled !== undefined) {
            setAdminEnabled(Boolean(data.contest.backgroundMusicEnabled));
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

  // Web Audio Synth Engine for Ambient Cyber Synth Soundtrack
  const setupAudioEngine = () => {
    if (isSetupRef.current && audioCtxRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0; // Start quiet, ramp up smoothly
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // 1. Low Sub-Bass Oscillator (Deep Dark Cyber Drone)
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      const bassFilter = ctx.createBiquadFilter();

      bassOsc.type = "sawtooth";
      bassOsc.frequency.setValueAtTime(55, ctx.currentTime); // A1 note (55Hz)
      bassFilter.type = "lowpass";
      bassFilter.frequency.setValueAtTime(160, ctx.currentTime);
      bassGain.gain.setValueAtTime(0.18, ctx.currentTime);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start();

      // 2. Soft Ambient Synth Chord Arpeggiation (Dark Cyber Chords)
      const notes = [110, 130.81, 164.81, 196.0, 220.0]; // A2, C3, E3, G3, A3
      let noteIndex = 0;

      const playChordPulse = () => {
        if (!audioCtxRef.current || ctx.state !== "running") return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        const freq = notes[noteIndex % notes.length];
        noteIndex++;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 3.0);
      };

      // Pulse ambient chords every 2.4 seconds
      const chordInterval = setInterval(playChordPulse, 2400);

      isSetupRef.current = true;

      // Clean up on unmount
      return () => {
        clearInterval(chordInterval);
        try {
          bassOsc.stop();
          ctx.close();
        } catch (e) {}
      };
    } catch (err) {
      console.error("Failed to initialize cyber ambient Web Audio engine:", err);
    }
  };

  // Auto-start audio context on first user interaction anywhere on page
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };

    window.addEventListener("click", handleFirstInteraction, { once: false });
    window.addEventListener("keydown", handleFirstInteraction, { once: false });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [hasInteracted]);

  // Handle Play / Pause state based on Admin Toggle + User Mute
  useEffect(() => {
    const shouldPlay = adminEnabled && !userMuted;

    if (shouldPlay) {
      if (!isSetupRef.current) {
        setupAudioEngine();
      }

      if (audioCtxRef.current && audioCtxRef.current.state === "suspended" && hasInteracted) {
        audioCtxRef.current.resume();
      }

      if (masterGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.cancelScheduledValues(now);
        masterGainRef.current.gain.linearRampToValueAtTime(0.25, now + 1.2); // Smooth fade in
      }
      setIsPlaying(true);
    } else {
      if (masterGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.cancelScheduledValues(now);
        masterGainRef.current.gain.linearRampToValueAtTime(0.0001, now + 0.8); // Smooth fade out
      }
      setIsPlaying(false);
    }
  }, [adminEnabled, userMuted, hasInteracted]);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
      {/* Sound Status Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121215]/90 border border-[#27272a] shadow-lg backdrop-blur-md text-xs font-mono">
        <Music
          className={`w-3.5 h-3.5 transition-colors ${
            adminEnabled && !userMuted ? "text-[#dc2626] animate-pulse" : "text-zinc-600"
          }`}
        />
        <span className="text-zinc-300 hidden sm:inline">
          MUSIC:{" "}
          {!adminEnabled ? (
            <span className="text-red-500 font-bold">OFF (BY ADMIN)</span>
          ) : userMuted ? (
            <span className="text-zinc-500">MUTED</span>
          ) : (
            <span className="text-emerald-400 font-bold">PLAYING</span>
          )}
        </span>

        {/* User local mute button */}
        {adminEnabled && (
          <button
            onClick={() => setUserMuted(!userMuted)}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors ml-1"
            title={userMuted ? "Unmute Ambient Music" : "Mute Ambient Music"}
          >
            {userMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#dc2626]" />}
          </button>
        )}
      </div>
    </div>
  );
}
