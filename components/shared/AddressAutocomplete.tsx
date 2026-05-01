'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Input } from '@/components/ui/input'

export interface PlaceData {
  address_line: string
  city: string
  district: string
  latitude: number | null
  longitude: number | null
  google_place_id: string | null
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string, place?: PlaceData) => void
  placeholder?: string
  className?: string
  id?: string
}

export default function AddressAutocomplete({
  value, onChange, placeholder = 'Adresse complète', className, id,
}: AddressAutocompleteProps) {
  const placesLib = useMapsLibrary('places')
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [internalValue, setInternalValue] = useState(value)

  // If the Maps library isn't available, render a plain input
  const mapsAvailable = typeof window !== 'undefined' && !!placesLib

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ma' },
      fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
      types: ['address'],
    })
    autocompleteRef.current = autocomplete

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.formatted_address) return

      const addressLine = place.formatted_address
      let city = ''
      let district = ''

      for (const component of place.address_components || []) {
        if (component.types.includes('locality')) city = component.long_name
        if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
          district = component.long_name
        }
        if (!city && component.types.includes('administrative_area_level_2')) {
          city = component.long_name
        }
      }

      const placeData: PlaceData = {
        address_line: addressLine,
        city,
        district,
        latitude: place.geometry?.location?.lat() ?? null,
        longitude: place.geometry?.location?.lng() ?? null,
        google_place_id: place.place_id ?? null,
      }

      setInternalValue(addressLine)
      onChange(addressLine, placeData)
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib, onChange])

  if (!mapsAvailable) {
    return (
      <Input
        id={id}
        value={internalValue}
        onChange={e => {
          setInternalValue(e.target.value)
          onChange(e.target.value)
        }}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  return (
    <Input
      id={id}
      ref={inputRef}
      value={internalValue}
      onChange={e => {
        setInternalValue(e.target.value)
        onChange(e.target.value)
      }}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  )
}
