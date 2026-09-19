'use client';

import React from 'react';
import { CredixLogo, CredixSymbol, CredixLogoProps } from '@/components/ui/CredixLogo';

export { CredixSymbol };

export interface LandingLogoProps extends CredixLogoProps {
  compact?: boolean;
}

export function LandingLogo({
  href = '/',
  compact = false,
  animate = true,
  className = '',
  size = 'md',
  ...props
}: LandingLogoProps) {
  return (
    <CredixLogo
      href={href}
      iconOnly={compact}
      animate={animate}
      className={className}
      size={size}
      variant="brand"
      {...props}
    />
  );
}

export default LandingLogo;
