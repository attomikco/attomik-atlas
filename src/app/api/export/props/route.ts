import { NextRequest, NextResponse } from 'next/server'

// In-memory store (props only needed for ~30 seconds during export)
const propsStore = new Map<string, { props: any; expires: number }>()

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  propsStore.forEach((value, key) => {
    if (value.expires < now) propsStore.delete(key)
  })
}, 60000)

export async function POST(req: NextRequest) {
  const { props } = await req.json()
  const id = crypto.randomUUID()
  propsStore.set(id, { props, expires: Date.now() + 60000 })
  return NextResponse.json({ id })
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })
  const entry = propsStore.get(id)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ props: entry.props })
}
