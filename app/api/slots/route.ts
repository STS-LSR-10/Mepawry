// app/api/slots/route.ts — The open floors (?floor= picks one) and which of its shelves are taken (for choosing a shelf)

import { NextRequest, NextResponse } from 'next/server'
import { getOpenSlots } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return NextResponse.json(await getOpenSlots(Number(req.nextUrl.searchParams.get('floor')) || undefined))
}
