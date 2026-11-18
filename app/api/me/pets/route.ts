// app/api/me/pets/route.ts — The signed-in user's own memorials

import { NextResponse } from 'next/server'
import { getMyPets } from '@/lib/data'
import { getUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  return NextResponse.json({ pets: await getMyPets(user.id) })
}
