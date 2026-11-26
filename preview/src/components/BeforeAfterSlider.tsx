import React, { useEffect, useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  altSubject: string;
  autoAnimate?: boolean;
  className?: string;
}

/**
 * Interactive Before/After visual transformation comparator with smooth continuous
 * auto-gliding motion (like an editorial GIF loop) that pauses immediately when the
 * user hovers or drags the handle.
 */
export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Antes',
  afterLabel = 'Depois',
  altSubject,
  autoAnimate = true,
  className = '',
}) => {
  const [position, setPosition] = useState(52);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth infinite gliding animation (like a living GIF) when user isn't dragging/hovering
  useEffect(() => {
    if (!autoAnimate || isInteracting) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsedSec = (now - start) / 1000;
      // Gentle sinusoidal sweep between 22% and 78%
      const nextPos = 50 + Math.sin(elapsedSec * 0.85) * 28;
      setPosition(nextPos);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoAnimate, isInteracting]);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(4, Math.min(96, pct)));
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onMouseMove={(e) => {
        if (e.buttons === 1) updateFromClientX(e.clientX);
      }}
      onTouchStart={() => setIsInteracting(true)}
      onTouchMove={(e) => {
        if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
      }}
      onTouchEnd={() => setIsInteracting(false)}
      className={`relative select-none overflow-hidden rounded-xl bg-[#141417] border border-[var(--border-subtle)] aspect-[4/3] ${className}`}
    >
      {/* After Image (Full Base Layer) */}
      <SafeImage
        src={afterSrc}
        alt={`${altSubject} — ${afterLabel}`}
        className="w-full h-full object-cover object-center pointer-events-none"
      />

      {/* Before Image (Clipped Top Layer) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <SafeImage
          src={beforeSrc}
          alt={`${altSubject} — ${beforeLabel}`}
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Subtle Bottom Contrast Scrim */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B0B0D]/80 to-transparent pointer-events-none" />

      {/* Clean Unboxed Labels */}
      <span className="absolute bottom-3.5 left-4 text-xs font-medium tracking-wider uppercase text-[#E7E2DB] pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute bottom-3.5 right-4 text-xs font-medium tracking-wider uppercase text-[#B58E65] pointer-events-none">
        {afterLabel}
      </span>

      {/* Vertical Brushed Bronze Divider & Handle */}
      <div
        className="absolute inset-y-0 w-px bg-[#E7E2DB]/85 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#0B0B0D]/90 border border-[#B58E65] text-[#E7E2DB] flex items-center justify-center shadow-lg shadow-black/60">
          <MoveHorizontal className="w-4 h-4 text-[#B58E65]" />
        </div>
      </div>

      {/* Accessible Invisible Range Input for Drag / Keyboard / Mobile Touch */}
      <input
        type="range"
        min={4}
        max={96}
        step={0.5}
        value={position}
        aria-label={`Comparar antes e depois de ${altSubject}`}
        onFocus={() => setIsInteracting(true)}
        onBlur={() => setIsInteracting(false)}
        onChange={(e) => {
          setIsInteracting(true);
          setPosition(Number(e.target.value));
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
      />
    </div>
  );
};
