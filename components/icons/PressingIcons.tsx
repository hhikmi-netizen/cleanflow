import { SVGProps, ReactElement } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 40) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function ChemiseIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 6.5L6 4l3 2.5V20H3V6.5z" />
      <path d="M21 6.5L18 4l-3 2.5V20h6V6.5z" />
      <path d="M6 4c0 0 1.5 3 6 3s6-3 6-3" />
      <path d="M9 20V8" strokeOpacity="0.3" />
    </svg>
  )
}

export function PantalonIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6 2h12v3l-2 17H13l-1-9-1 9H8L6 5V2z" />
      <path d="M6 2q6 2 12 0" />
    </svg>
  )
}

export function CostumeIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 2L9 5 5.5 4 4 22h5.5l2.5-9 2.5 9H20L18.5 4 15 5 12 2z" />
      <path d="M9 5l3 4 3-4" />
      <path d="M12 9v4" strokeOpacity="0.4" />
    </svg>
  )
}

export function RobeIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M10 2h4l4 20H6L10 2z" />
      <path d="M10 7h4" />
      <path d="M9 2c0 0 0 2.5 3 2.5S15 2 15 2" />
    </svg>
  )
}

export function DjellabaIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 2c-1.5 0-2.5 1-2.5 2.5H8L5 8v14h14V8l-3-3.5h-1.5C14.5 3 13.5 2 12 2z" />
      <path d="M9.5 4.5h5" />
      <path d="M5 11h14" strokeOpacity="0.3" />
    </svg>
  )
}

export function CaftanIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 2c-1.5 0-2.5 1-2.5 2.5L3 8l1 2.5 5.5-2V22h5V8.5L20 10.5 21 8l-6.5-3.5C14.5 3 13.5 2 12 2z" />
      <path d="M9.5 4.5h5" />
    </svg>
  )
}

export function BurnousIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      <path d="M12 5c-2.5 0-4.5 1-4.5 3L4 11 3 22h18l-1-11-3.5-3C16.5 6 14.5 5 12 5z" />
      <path d="M8 14h8" strokeOpacity="0.4" />
    </svg>
  )
}

export function CouetteIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="6" width="20" height="13" rx="2.5" />
      <line x1="2" y1="10.5" x2="22" y2="10.5" />
      <line x1="2" y1="15" x2="22" y2="15" />
      <line x1="8.5" y1="6" x2="8.5" y2="19" />
      <line x1="15.5" y1="6" x2="15.5" y2="19" />
    </svg>
  )
}

export function DrapsIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <rect x="2" y="10" width="20" height="5" rx="1" />
      <rect x="2" y="17" width="20" height="4" rx="1" />
    </svg>
  )
}

export function TapisIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <rect x="6" y="6" width="12" height="12" rx="0.5" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  )
}

export function RideauxIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="1" y1="3" x2="23" y2="3" strokeWidth="2" />
      <path d="M4 3c0 0 4 8 0 19h6" />
      <path d="M20 3c0 0-4 8 0 19h-6" />
    </svg>
  )
}

export function KiloIcon({ size = 40, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path d="M8 5L2 20h20L16 5" />
      <line x1="2" y1="20" x2="22" y2="20" />
      <line x1="12" y1="3" x2="9" y2="5" />
      <line x1="12" y1="3" x2="15" y2="5" />
    </svg>
  )
}

// Map service name keywords → icon component
export function getPressingIcon(name: string, size = 40): ReactElement {
  const n = name.toLowerCase()
  if (n.includes('chemise') || n.includes('shirt')) return <ChemiseIcon size={size} />
  if (n.includes('pantalon') || n.includes('jean') || n.includes('short')) return <PantalonIcon size={size} />
  if (n.includes('costume') || n.includes('veste') || n.includes('blazer') || n.includes('suit')) return <CostumeIcon size={size} />
  if (n.includes('robe')) return <RobeIcon size={size} />
  if (n.includes('djellaba') || n.includes('jellaba')) return <DjellabaIcon size={size} />
  if (n.includes('caftan') || n.includes('kaftan')) return <CaftanIcon size={size} />
  if (n.includes('burnous') || n.includes('burnous')) return <BurnousIcon size={size} />
  if (n.includes('couette') || n.includes('duvet') || n.includes('couverture')) return <CouetteIcon size={size} />
  if (n.includes('drap') || n.includes('lit')) return <DrapsIcon size={size} />
  if (n.includes('tapis') || n.includes('carpet') || n.includes('moquette')) return <TapisIcon size={size} />
  if (n.includes('rideau') || n.includes('curtain') || n.includes('voilage')) return <RideauxIcon size={size} />
  if (n.includes('kilo') || n.includes('kg') || n.includes('poids')) return <KiloIcon size={size} />
  // fallback
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  )
}

export function getCategoryColor(name: string): string {
  const n = name.toLowerCase()
  const household = ['couette', 'drap', 'tapis', 'rideau', 'lit', 'carpet', 'voilage']
  const kilo = ['kilo', 'kg', 'poids']
  const moroccan = ['djellaba', 'caftan', 'kaftan', 'burnous', 'jellaba']
  if (household.some(k => n.includes(k))) return 'indigo'
  if (kilo.some(k => n.includes(k))) return 'emerald'
  if (moroccan.some(k => n.includes(k))) return 'amber'
  return 'blue'
}

export type ArticleColor = 'blue' | 'indigo' | 'emerald' | 'amber' | 'gray'

export const COLOR_CLASSES: Record<ArticleColor, {
  tile: string; icon: string; badge: string; btn: string
}> = {
  blue:    { tile: 'bg-blue-50 border-blue-100 hover:border-blue-300 hover:bg-blue-100',    icon: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  indigo:  { tile: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-100', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  emerald: { tile: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  amber:   { tile: 'bg-amber-50 border-amber-100 hover:border-amber-300 hover:bg-amber-100',  icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
  gray:    { tile: 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-gray-100',    icon: 'text-gray-600',    badge: 'bg-gray-100 text-gray-700',    btn: 'bg-gray-600 hover:bg-gray-700 text-white' },
}
