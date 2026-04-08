import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // setAll can fail in middleware/edge — safe to ignore here
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Session cookies are now set — redirect to confirm page to handle
      // brand claiming and final redirect
      return NextResponse.redirect(`${origin}/auth/confirm`)
    }

    // If code exchange failed, redirect to login with error
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Login failed. Please try again.')}`
    )
  }

  // No code param — redirect to confirm with whatever hash/search params exist
  const { search, hash } = new URL(request.url)
  return NextResponse.redirect(`${origin}/auth/confirm${search}${hash}`)
}
