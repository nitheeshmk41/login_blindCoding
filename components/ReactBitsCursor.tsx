"use client";

import React, { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export default function ReactBitsCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorRingRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Mouse position ref for smooth 60-120fps render loop
  const mousePos = useRef({ x: -100, y: -100 });
  const targetPos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Check if device is touch-only
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsTouchDevice(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const ripples: Ripple[] = [];

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Pure Red & Black Theme Palette
    const redPalette = ["#ff204e", "#dc2626", "#ef4444", "#991b1b", "#7f1d1d"];

    const addParticles = (x: number, y: number, count = 2) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.6 + 0.3;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.2,
          size: Math.random() * 2.8 + 1,
          color: redPalette[Math.floor(Math.random() * redPalette.length)],
          alpha: 0.95,
          life: 0,
          maxLife: Math.random() * 25 + 20,
        });
      }
    };

    const addClickRipple = (x: number, y: number) => {
      ripples.push({
        x,
        y,
        radius: 4,
        maxRadius: 50,
        alpha: 0.9,
        color: "#ff204e",
      });
      ripples.push({
        x,
        y,
        radius: 2,
        maxRadius: 75,
        alpha: 0.7,
        color: "#991b1b",
      });
      // Crimson burst of particles
      addParticles(x, y, 18);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      // Add trail particles on movement
      const dx = targetPos.current.x - mousePos.current.x;
      const dy = targetPos.current.y - mousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        addParticles(e.clientX, e.clientY, dist > 20 ? 3 : 1);
        mousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsClicked(true);
      addClickRipple(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setIsClicked(false);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.addEventListener("mouseleave", handleMouseLeave);
    document.body.addEventListener("mouseenter", handleMouseEnter);

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth LERP for outer ring inertia
      ringPos.current.x += (targetPos.current.x - ringPos.current.x) * 0.24;
      ringPos.current.y += (targetPos.current.y - ringPos.current.y) * 0.24;

      // Update DOM cursor elements
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${targetPos.current.x}px, ${targetPos.current.y}px, 0px) translate(-50%, -50%)`;
      }
      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0px) translate(-50%, -50%)`;
      }
      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${targetPos.current.x}px, ${targetPos.current.y}px, 0px) translate(-50%, -50%)`;
      }

      // Draw Shockwave Ripples (Red & Dark Red)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += (r.maxRadius - r.radius) * 0.16;
        r.alpha -= 0.035;

        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.alpha;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#dc2626";
        ctx.stroke();
        ctx.restore();
      }

      // Draw Red Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.life >= p.maxLife || p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - (p.life / p.maxLife) * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#dc2626";
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible]);

  if (isTouchDevice) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* Red & Black Ambient Mouse Spotlight */}
      <div
        ref={spotlightRef}
        className={`absolute top-0 left-0 w-[450px] h-[450px] rounded-full blur-[100px] transition-opacity duration-300 ${
          isVisible ? "opacity-30 bg-radial from-[#dc262644] via-[#7f1d1d1a] to-transparent" : "opacity-0"
        }`}
      />

      {/* Canvas for trail particles & click ripples */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Precision Core Red Dot */}
      <div
        ref={cursorDotRef}
        className={`absolute top-0 left-0 rounded-full transition-all duration-100 ease-out ${
          !isVisible ? "opacity-0 scale-0" : "opacity-100"
        } ${
          isClicked
            ? "w-3.5 h-3.5 bg-[#ff204e] shadow-[0_0_15px_#ff204e]"
            : "w-2.5 h-2.5 bg-[#dc2626] shadow-[0_0_10px_#dc2626]"
        }`}
      />

      {/* Outer Cyber Red & Black Ring */}
      <div
        ref={cursorRingRef}
        className={`absolute top-0 left-0 rounded-full border transition-all duration-200 ease-out ${
          !isVisible ? "opacity-0 scale-0" : "opacity-100"
        } ${
          isClicked
            ? "w-10 h-10 border-[#ff204e] scale-90 bg-[#dc262625] shadow-[0_0_20px_rgba(220,38,38,0.5)]"
            : "w-8 h-8 border-[#dc2626aa] scale-100 bg-[#00000033] shadow-[0_0_12px_rgba(220,38,38,0.25)]"
        }`}
      />
    </div>
  );
}
