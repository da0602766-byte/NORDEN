import React, { useState } from 'react';
import { NordenLogo } from './NordenLogo';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  priority?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  priority = false,
}) => {
  const [failedSrc, setFailedSrc] = useState<string>();

  if (failedSrc === src || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[var(--bg-surface-alt)] text-center p-6 ${className}`}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={!alt || undefined}
      >
        <NordenLogo variant="markOnly" className="opacity-70 mb-2" />
        <span className="text-xs text-[var(--text-muted)] max-w-[180px] truncate">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      decoding={priority ? undefined : "async"}
      onError={() => setFailedSrc(src)}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
    />
  );
};
