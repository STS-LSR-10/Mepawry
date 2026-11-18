// app/api/floors/route.ts

import { NextResponse } from 'next/server'
import { getFloors } from '@/lib/data'

export async function GET() {
  const floors = await getFloors()
  return NextResponse.json({ floors })
}
