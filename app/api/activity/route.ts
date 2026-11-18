// app/api/activity/route.ts — Latest real candles, flowers, guestbook messages and new shrines

import { NextResponse } from 'next/server'
import { getActivity } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ items: await getActivity() })
}
