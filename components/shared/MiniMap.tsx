'use client'

import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'

interface MiniMapProps {
  latitude: number
  longitude: number
  label?: string
  className?: string
}

export default function MiniMap({ latitude, longitude, label, className }: MiniMapProps) {
  const hasKey = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!hasKey) return null

  return (
    <div className={className || 'w-full h-40 rounded-lg overflow-hidden border border-gray-200'}>
      <Map
        defaultCenter={{ lat: latitude, lng: longitude }}
        defaultZoom={15}
        gestureHandling="cooperative"
        disableDefaultUI
        mapId="cleanflow-minimap"
      >
        <AdvancedMarker position={{ lat: latitude, lng: longitude }} title={label} />
      </Map>
    </div>
  )
}
