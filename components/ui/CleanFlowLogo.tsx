'use client'

import React from 'react'

// ── Icon seul (fond bleu dégradé + forme blanche "C") ──────────────────────
export function CleanFlowIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="cf-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1d6ef5" />
          <stop offset="100%" stopColor="#59b8ff" />
        </linearGradient>
      </defs>
      {/* Fond arrondi */}
      <rect width="36" height="36" rx="9" fill="url(#cf-bg)" />
      {/* Ruban supérieur (face principale) */}
      <path d="M5 13 L16 7 L26 11 L15 17 Z" fill="white" />
      {/* Accent bleu clair — arête pliée du ruban supérieur */}
      <path d="M16 7 L26 11 L25 14 L15 10 Z" fill="#93c5fd" opacity="0.8" />
      {/* Ruban inférieur (face principale) */}
      <path d="M11 19 L22 23 L31 19 L20 15 Z" fill="white" />
      {/* Accent bleu clair — arête pliée du ruban inférieur */}
      <path d="M11 19 L22 23 L22 26 L10 22 Z" fill="#93c5fd" opacity="0.8" />
    </svg>
  )
}

// ── Logo horizontal : icône + texte "Clean Flow" ───────────────────────────
export function CleanFlowLogoFull({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36
  const textClass =
    size === 'sm'
      ? 'text-lg font-bold'
      : size === 'lg'
      ? 'text-3xl font-bold'
      : 'text-2xl font-bold'

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <CleanFlowIcon size={iconSize} />
      <span className={textClass} style={{ letterSpacing: '-0.01em' }}>
        <span style={{ color: '#0f172a' }}>Clean</span>
        <span style={{ color: '#2563eb' }}> Flow</span>
      </span>
    </div>
  )
}

// ── Logo compact : icône + "CleanFlow" sur une ligne serrée ───────────────
export function CleanFlowLogoCompact({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CleanFlowIcon size={30} />
      <span className="text-xl font-bold" style={{ letterSpacing: '-0.01em' }}>
        <span style={{ color: '#0f172a' }}>Clean</span>
        <span style={{ color: '#2563eb' }}>Flow</span>
      </span>
    </div>
  )
}

export default CleanFlowLogoFull
