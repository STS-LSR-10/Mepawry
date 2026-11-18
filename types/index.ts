// types/index.ts — Shared TypeScript types

export type Species = 'dog' | 'cat' | 'other'
export type TributeType = 'candle' | 'flower' | 'treat_bone' | 'treat_icecream' | 'treat_ball'
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type ProductType = 'acrylic_plaque' | 'keychain' | 'canvas_print'
export type PremiumType = 'golden_lantern' | 'glow'

export interface Floor {
  id: number
  name: string
  capacity: number
  current_count: number
  is_open: boolean
  opened_at: string | null
  created_at: string
}

export interface Pet {
  id: string
  slug: string
  name: string
  species: Species
  country_code: string
  primary_photo_url: string | null
  gallery_urls: string[]
  birth_year: number | null
  death_year: number | null
  epitaph: string | null
  epitaph_translations: Record<string, string>
  floor_id: number
  shrine_position: number
  candle_count: number
  flower_count: number
  visit_count: number
  created_at: string
  updated_at: string
  owner_id?: string | null
  // เพิ่มเฉพาะ owner view
  edit_token?: string
  edit_token_expires_at?: string
}

export interface Tribute {
  id: string
  pet_id: string
  visitor_id: string | null
  visitor_name: string
  type: TributeType
  created_at: string
}

export interface GuestbookEntry {
  id: string
  pet_id: string
  visitor_name: string
  message: string
  is_hidden: boolean
  created_at: string
}

export interface Visitor {
  id: string
  avatar_name: string
  current_floor_id: number | null
  last_seen_at: string
  created_at: string
}

export interface Order {
  id: string
  pet_id: string
  product_type: ProductType
  inscription: string | null
  quantity: number
  gift_wrap: boolean
  shipping_country: string
  amount_cents: number
  currency: string
  status: OrderStatus
  created_at: string
}

export interface PremiumFeature {
  id: string
  pet_id: string
  type: PremiumType
  status: 'pending' | 'active' | 'expired'
  activated_at: string | null
  expires_at: string | null
}

export interface GlobalStats {
  total_pets: number
  total_dogs: number
  total_cats: number
  total_others: number
  total_countries: number
  total_candles: number
  total_flowers: number
  avg_age: number | null
  refreshed_at: string
}

// Realtime event payloads
export interface RealtimePresenceEvent {
  visitor_id: string
  avatar_name: string
  floor_id: number
  x: number
  z: number
}

export interface RealtimeTributeEvent {
  pet_id: string
  pet_name: string
  visitor_name: string
  tribute_type: TributeType
  timestamp: string
}

export type Gender = 'male' | 'female'

export interface Profile {
  id: string
  display_name: string
  gender: Gender
  country_code: string
  created_at: string
}
