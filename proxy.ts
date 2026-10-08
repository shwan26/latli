import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env"

// Pages anyone can open. Everything else needs a signed-in account.
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/auth", "/pricing", "/terms", "/privacy"]
const AUTH_PAGES = ["/login", "/register"]

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/ads.txt" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // API routes check the session themselves and answer with 401.
  const needsLogin = !isPublicPath(pathname) && !pathname.startsWith("/api/")

  function redirectTo(path: string, from?: NextResponse) {
    const redirect = NextResponse.redirect(new URL(path, request.url))

    // Keep any refreshed session cookies on the redirect.
    from?.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))

    return redirect
  }

  if (!isSupabaseConfigured) {
    return needsLogin ? redirectTo("/login") : NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }

        response = NextResponse.next({ request })

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() asks Supabase to verify the session, so it cannot be forged.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && needsLogin) return redirectTo("/login", response)

  if (user && AUTH_PAGES.includes(pathname)) {
    return redirectTo("/dashboard", response)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
