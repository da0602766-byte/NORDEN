import React, { useId } from 'react';

interface NordenLogoProps {
  variant?: 'header' | 'stacked' | 'markOnly';
  className?: string;
}

/**
 * Custom redesigned vector emblem for NORDEN — Salão Masculino Premium.
 * Faithful geometric recreation of the Nordic peak integrated with crossed barber shears
 * in Brushed Bronze metallic shading — never uses the reference photograph.
 */
export const NordenLogo: React.FC<NordenLogoProps> = ({
  variant = 'header',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const bronzeGradId = `norden-bronze-${uid}`;
  const bronzeDeepId = `norden-bronze-deep-${uid}`;
  const bronzeHighlightId = `norden-bronze-hi-${uid}`;

  const renderMark = (sizeClass: string) => (
    <svg
      viewBox="0 0 120 124"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={sizeClass}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bronzeGradId} x1="18" y1="8" x2="104" y2="116" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D7B992" />
          <stop offset="38%" stopColor="#B08A60" />
          <stop offset="72%" stopColor="#8E6B47" />
          <stop offset="100%" stopColor="#5D442B" />
        </linearGradient>
        <linearGradient id={bronzeDeepId} x1="60" y1="6" x2="60" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C9A882" />
          <stop offset="55%" stopColor="#8E6B47" />
          <stop offset="100%" stopColor="#4F3A24" />
        </linearGradient>
        <linearGradient id={bronzeHighlightId} x1="42" y1="10" x2="78" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E7D4BA" />
          <stop offset="50%" stopColor="#A98258" />
          <stop offset="100%" stopColor="#6D4F32" />
        </linearGradient>
      </defs>

      {/* Top Nordic Mountain / Arrowhead Crest */}
      <path
        d="M60 6L46.5 34.5L53.5 41.5L58 37L62.5 41.5L68 38.5L73.5 34.5L60 6Z"
        fill={`url(#${bronzeHighlightId})`}
      />
      {/* Faceted shadow side of the Nordic peak */}
      <path
        d="M60 6L60 36L62.5 41.5L68 38.5L73.5 34.5L60 6Z"
        fill="#0B0B0D"
        fillOpacity="0.22"
      />

      {/* Left Angular A-Frame Wing */}
      <path
        d="M40.5 46L17 95.5L38 83L34 76L26 81.5L43.5 49.5L40.5 46Z"
        fill={`url(#${bronzeDeepId})`}
      />

      {/* Right Angular A-Frame Wing */}
      <path
        d="M79.5 46L103 95.5L82 83L86 76L94 81.5L76.5 49.5L79.5 46Z"
        fill={`url(#${bronzeDeepId})`}
      />

      {/* Left-to-Right Crossing Barber Blade & Lower Right Shank */}
      <path
        d="M34.5 23C33.8 22.1 32.5 22.8 33.1 23.9L56.2 66.2L67.8 87.2L73.2 84.1L63.1 65.2L34.5 23Z"
        fill={`url(#${bronzeGradId})`}
      />

      {/* Right-to-Left Crossing Barber Blade & Lower Left Shank (Top Layer) */}
      <path
        d="M85.5 23C86.2 22.1 87.5 22.8 86.9 23.9L63.8 66.2L52.2 87.2L46.8 84.1L56.9 65.2L85.5 23Z"
        fill={`url(#${bronzeHighlightId})`}
      />

      {/* Left Scissor Finger Ring + Classic Barber Tang */}
      <path
        d="M44.5 85.5C37.6 85.5 32 91.1 32 98C32 102.6 34.5 106.6 38.2 108.8C36.6 111.5 34.2 113.2 30.8 113.8C29.7 114 29.8 115.6 31 115.8C36.8 116.5 41.9 113.7 45.2 110.3C51.7 109.9 57 104.5 57 98C57 91.1 51.4 85.5 44.5 85.5ZM44.5 104.6C40.9 104.6 37.9 101.6 37.9 98C37.9 94.4 40.9 91.4 44.5 91.4C48.1 91.4 51.1 94.4 51.1 98C51.1 101.6 48.1 104.6 44.5 104.6Z"
        fill={`url(#${bronzeGradId})`}
      />

      {/* Right Scissor Finger Ring + Classic Barber Tang */}
      <path
        d="M75.5 85.5C82.4 85.5 88 91.1 88 98C88 102.6 85.5 106.6 81.8 108.8C83.4 111.5 85.8 113.2 89.2 113.8C90.3 114 90.2 115.6 89 115.8C83.2 116.5 78.1 113.7 74.8 110.3C68.3 109.9 63 104.5 63 98C63 91.1 68.6 85.5 75.5 85.5ZM75.5 104.6C79.1 104.6 82.1 101.6 82.1 98C82.1 94.4 79.1 91.4 75.5 91.4C71.9 91.4 68.9 94.4 68.9 98C68.9 101.6 71.9 104.6 75.5 104.6Z"
        fill={`url(#${bronzeGradId})`}
      />

      {/* Center Pivot Screw */}
      <circle cx="60" cy="63" r="3.4" fill="#0B0B0D" />
      <circle cx="60" cy="63" r="1.8" fill="#D7B992" />
    </svg>
  );

  if (variant === 'markOnly') {
    return <span className={`inline-flex items-center ${className}`}>{renderMark('w-9 h-9')}</span>;
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        {renderMark('w-16 h-16 mb-3')}
        <span className="font-display text-2xl sm:text-3xl font-semibold tracking-[0.28em] text-[var(--text-primary)] pl-[0.28em]">
          NORDEN
        </span>
        <span className="mt-1.5 text-[11px] tracking-[0.26em] text-[var(--text-muted)] uppercase pl-[0.26em]">
          Salão Masculino
        </span>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="h-px w-8 bg-[#8E6B47]/60" />
          <span className="text-[10px] font-medium tracking-[0.32em] text-[var(--accent)] uppercase pl-[0.32em]">
            Premium
          </span>
          <span className="h-px w-8 bg-[#8E6B47]/60" />
        </div>
      </div>
    );
  }

  // Strictly clean single-line header brand lockup (no subtitle or descriptor in DOM)
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2.5 whitespace-nowrap shrink-0 select-none ${className}`}>
      {renderMark('w-6 h-6 sm:w-7 sm:h-7 shrink-0')}
      <span className="font-display text-base sm:text-lg font-semibold tracking-[0.16em] sm:tracking-[0.24em] text-[var(--text-primary)]">
        NORDEN
      </span>
    </span>
  );
};
