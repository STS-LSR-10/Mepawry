// app/api/board/today/route.ts — Who to remember today (shrine anniversaries and this week's newcomers)

import { NextResponse } from 'next/server'
import { todayPets } from '@/lib/board'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ items: await todayPets() })
}
