import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ToolNavigation } from './ToolNavigation';

interface CompassMarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CompassMark({ className = '', size = 'md' }: CompassMarkProps) {
  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  }[size];

  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={`${sizeClass} ${className}`}
    >
      <circle cx="24" cy="24" r="20" fill="white" stroke="currentColor" strokeWidth="1.75" />
      <path d="M24 1.75 26.6 8h-5.2L24 1.75ZM46.25 24 40 26.6v-5.2l6.25 2.6ZM24 46.25 21.4 40h5.2L24 46.25ZM1.75 24 8 21.4v5.2L1.75 24Z" fill="currentColor" />
      <path d="m31.7 14.8-4.6 12.3-12.3 4.6 4.6-12.3 12.3-4.6Z" fill="#2F6FED" />
      <path d="m31.7 14.8-4.6 12.3-7.7-7.7 12.3-4.6Z" fill="#063A70" />
      <circle cx="23.25" cy="23.25" r="2.85" fill="white" stroke="#063A70" strokeWidth="1.25" />
    </svg>
  );
}

interface CompassHeaderProps {
  toolName?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}

export function CompassHeader({ toolName, onBack, action }: CompassHeaderProps) {
  return (
    <header className="compass-app-header">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="compass-icon-button"
              aria-label="トップに戻る"
              title="トップに戻る"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <CompassMark size="md" className="shrink-0 text-[#063A70]" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[13px] font-extrabold text-[#063A70]">
                LIFE COMPASS LAB
              </span>
              <span className="hidden text-[10px] font-bold text-[#2F6FED] sm:inline">
                COMPASS SERIES
              </span>
            </div>
            {toolName && (
              <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                {toolName}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <ToolNavigation />
    </header>
  );
}

