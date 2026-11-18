// app/api/slots/route.ts — The open floor and which of its shelves are taken (for choosing a shelf)

import { NextResponse } from 'next/server'
import { getOpenSlots } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getOpenSlots())
}
