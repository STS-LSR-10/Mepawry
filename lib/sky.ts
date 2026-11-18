// lib/sky.ts — Visitor's local time of day and season, worked out from the browser's time zone

export type Phase = 'dawn' | 'day' | 'dusk' | 'night'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'hot' | 'rainy' | 'cool'

export interface LocalSky {
  hour: number   // 0–24, fractional
  phase: Phase
  season: Season
  place: string  // city from the time zone, e.g. "Bangkok"
}

// shortcut: hemisphere/climate from a time-zone list, not real coordinates; switch to IP geolocation (lat) if seasons look wrong somewhere
const SOUTHERN = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham)|^America\/(Argentina|Santiago|Punta_Arenas|Montevideo|Asuncion|Sao_Paulo)|^Africa\/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Maseru|Mbabane)/
// Monsoon tropics: hot (Mar–May), rainy (Jun–Oct), cool (Nov–Feb), as in Thailand
const TROPICAL = /^Asia\/(Bangkok|Ho_Chi_Minh|Saigon|Phnom_Penh|Vientiane|Yangon|Rangoon|Kuala_Lumpur|Singapore|Jakarta|Makassar|Manila|Kolkata|Calcutta|Colombo|Dhaka|Brunei)|^America\/(Panama|Bogota|Caracas|Lima|Guayaquil|Manaus|Belem|Costa_Rica|Managua|Tegucigalpa|El_Salvador|Guatemala|Belize|Jamaica|Santo_Domingo|Puerto_Rico|Havana)|^Africa\/(Lagos|Accra|Abidjan|Nairobi|Kampala|Dar_es_Salaam|Kinshasa|Addis_Ababa|Dakar)|^Pacific\/(Honolulu|Guam|Port_Moresby|Fiji)/

export const PHASE_LABEL: Record<Phase, string> = { dawn: '🌅 Dawn', day: '☀️ Day', dusk: '🌇 Dusk', night: '🌙 Night' }
export const SEASON_LABEL: Record<Season, string> = {
  spring: '🌸 Spring', summer: '🌻 Summer', autumn: '🍂 Autumn', winter: '❄️ Winter',
  hot: '🔥 Hot season', rainy: '🌧️ Rainy season', cool: '🍃 Cool season',
}

export function phaseAt(hour: number): Phase {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 19) return 'dusk'
  return 'night'
}

export function seasonAt(month: number, timeZone: string): Season {
  if (TROPICAL.test(timeZone)) return month >= 2 && month <= 4 ? 'hot' : month >= 5 && month <= 9 ? 'rainy' : 'cool'
  const m = SOUTHERN.test(timeZone) ? (month + 6) % 12 : month
  return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'
}

/** Reads the browser clock and time zone. `override` (from ?hour=&season=) previews other times. */
export function getLocalSky(now = new Date(), override: { hour?: number; season?: Season } = {}): LocalSky {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const hour = override.hour ?? now.getHours() + now.getMinutes() / 60
  return {
    hour,
    phase: phaseAt(hour),
    season: override.season ?? seasonAt(now.getMonth(), timeZone),
    place: timeZone.split('/').pop()!.replace(/_/g, ' '),
  }
}
