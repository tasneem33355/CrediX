import React from 'react';
import { clsx } from 'clsx';

export interface ScoreGaugeProps {
  score: number; // 0 to 100 or 300 to 850
  maxScore?: number;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'credit' | 'fraud';
  className?: string;
  colorOverride?: string;
}

export const CircularScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  maxScore = 100,
  label,
  sublabel,
  size = 'md',
  variant = 'credit',
  className,
  colorOverride,
}) => {
  const normalized = Math.min(Math.max(score, 0), maxScore);
  const percentage = (normalized / maxScore) * 100;
  
  // Dimensions
  const radius = size === 'sm' ? 45 : size === 'lg' ? 90 : 70;
  const strokeWidth = size === 'sm' ? 8 : size === 'lg' ? 14 : 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;
  const svgSize = (radius + strokeWidth) * 2;

  // Determine stroke color
  let strokeColor = colorOverride || '#2E9E5B'; // Success
  if (!colorOverride) {
    const effectivePct = maxScore > 100 ? (normalized / maxScore) * 100 : normalized;
    if (variant === 'credit') {
      if (effectivePct < 60) strokeColor = '#DC4C4C';
      else if (effectivePct < 80) strokeColor = '#F59E0B';
      else strokeColor = '#2E9E5B';
    } else {
      // Fraud
      if (score >= 70) strokeColor = '#DC4C4C';
      else if (score >= 40) strokeColor = '#F59E0B';
      else strokeColor = '#2E9E5B';
    }
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center relative select-none', className)}>
      <div className="relative flex items-center justify-center">
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90 drop-shadow-sm"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
            fill="transparent"
          />
          {/* Colored progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center score text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={clsx('font-bold text-text-primary tracking-tight', 
            size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-5xl' : 'text-4xl'
          )}>
            {score}
          </span>
          <span className="text-xs text-text-muted font-medium">من {maxScore}</span>
        </div>
      </div>

      {label && (
        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          {sublabel && <p className="text-xs text-text-secondary mt-0.5">{sublabel}</p>}
        </div>
      )}
    </div>
  );
};

export const LinearFraudRiskBar: React.FC<{
  score: number;
  label?: string;
  sublabel?: string;
}> = ({ score, label, sublabel }) => {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col items-center justify-center py-4">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold text-semantic-error tracking-tight">{score}</span>
          <span className="text-sm text-text-muted font-medium">/ 100</span>
        </div>
        {label && <p className="text-sm font-semibold text-semantic-error mt-2">{label}</p>}
        {sublabel && <p className="text-xs text-text-secondary mt-0.5">{sublabel}</p>}
      </div>

      {/* Solid Red Bar */}
      <div className="w-full bg-border h-2.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-semantic-error rounded-full transition-all duration-700"
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};

