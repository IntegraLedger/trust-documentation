import React from 'react';

interface IntegraLogoProps {
  variant?: 'dark' | 'white';
  height?: number;
  className?: string;
}

export default function IntegraLogo({
  variant = 'white',
  height = 40,
  className = ''
}: IntegraLogoProps) {
  const logoSrc = variant === 'white'
    ? '/integra-logo-white-300.png'
    : '/integra-logo-300.png';

  return (
    <img
      src={logoSrc}
      alt="Integra"
      style={{ height: `${height}px` }}
      className={className}
    />
  );
}
