'use client';

import React from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';

export interface CredixLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  taglineText?: string;
  iconOnly?: boolean;
  className?: string;
  animate?: boolean;
  href?: string;
  variant?: 'brand' | 'monochrome' | 'white';
}

function BuildingGroups() {
  return (
    <>
      <g className="logo-base" fill="currentColor">
        <path d="M270 285h260v18H270zM258 306h284v16H258zM246 327h308v19H246z" />
      </g>
      <g className="logo-columns" fill="currentColor">
        <path d="M286 203h28v14h-4v70h-20v-70h-4zM326 203h28v14h-4v70h-20v-70h-4zM446 203h28v14h-4v70h-20v-70h-4zM486 203h28v14h-4v70h-20v-70h-4z" />
      </g>
      <g className="logo-door" fill="currentColor">
        <path d="M379 285v-53c0-16 10-27 21-27s21 11 21 27v53z" />
      </g>
      <g className="logo-beam" fill="currentColor">
        <path d="M256 170h288v27H256zM278 198h244v12H278z" />
      </g>
      <g className="logo-roof" fill="none" stroke="currentColor" strokeLinejoin="miter" strokeWidth="12">
        <path d="M280 161v-16l120-58 120 58v16z" />
      </g>
    </>
  );
}

export function CredixSymbol({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`credix-symbol ${className}`.trim()}
      viewBox="235 76 330 280"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <BuildingGroups />
    </svg>
  );
}

/**
 * CredixLogo — Unified Columned Bank Brand Mark
 * Uses the authentic Landing Page visual identity in Navy (#1B3A5C) / White.
 */
export function CredixLogo({
  size = 'md',
  showTagline = true,
  taglineText = 'Credit Intelligence',
  iconOnly = false,
  className = '',
  animate = true,
  href,
  variant = 'brand',
}: CredixLogoProps) {
  // Optically balanced proportions per size tier with unified ratio
  const sizeMap = {
    xs: {
      iconWidth: 28,
      iconHeight: 24,
      text: 'text-base',
      tagline: 'text-[8px]',
      gap: 'gap-2',
      spacing: 'mt-0.5',
    },
    sm: {
      iconWidth: 38,
      iconHeight: 32,
      text: 'text-[20px]',
      tagline: 'text-[8.5px]',
      gap: 'gap-2.5',
      spacing: 'mt-1',
    },
    md: {
      iconWidth: 44,
      iconHeight: 38,
      text: 'text-[23px]',
      tagline: 'text-[9.5px]',
      gap: 'gap-3',
      spacing: 'mt-1',
    },
    lg: {
      iconWidth: 52,
      iconHeight: 44,
      text: 'text-[27px]',
      tagline: 'text-[11px]',
      gap: 'gap-3.5',
      spacing: 'mt-1.5',
    },
    xl: {
      iconWidth: 62,
      iconHeight: 52,
      text: 'text-[33px]',
      tagline: 'text-[12.5px]',
      gap: 'gap-4',
      spacing: 'mt-1.5',
    },
  };

  const currentSize = sizeMap[size];
  const isWhite = variant === 'white';
  const iconColor = isWhite ? 'text-white' : 'text-[#174A66]';
  const wordmarkColor = isWhite ? 'text-white' : 'text-[#102A3D]';
  const taglineColor = isWhite ? 'text-[#BAC7D5]/80' : 'text-[#24617F]';

  const LogoIcon = (
    <div
      className={clsx(
        'relative flex items-center justify-center shrink-0 select-none',
        'transition-transform duration-normal ease-smooth-in-out',
        iconColor,
        animate && 'group-hover:scale-[1.03]'
      )}
      style={{
        width: currentSize.iconWidth,
        height: currentSize.iconHeight,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="235 76 330 280"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx('w-full h-full drop-shadow-xs', animate && 'credix-logo--assemble')}
      >
        <BuildingGroups />
      </svg>
    </div>
  );

  const LogoContent = (
    <div
      className={clsx(
        'inline-flex items-center select-none text-start group',
        currentSize.gap,
        className
      )}
    >
      {LogoIcon}

      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <span
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            className={clsx(
              currentSize.text,
              'font-bold tracking-tight transition-colors leading-none',
              wordmarkColor
            )}
          >
            CrediX
          </span>

          {showTagline && (
            <span
              className={clsx(
                currentSize.tagline,
                'font-extrabold uppercase tracking-[0.18em] transition-colors leading-none',
                currentSize.spacing,
                taglineColor
              )}
            >
              {taglineText}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/50 rounded-xl"
        aria-label="CrediX Home"
      >
        {LogoContent}
      </Link>
    );
  }

  return LogoContent;
}

export default CredixLogo;
