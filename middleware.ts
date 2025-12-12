import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const authCookie = request.cookies.get('auth')
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/inventory') || pathname.startsWith('/audit')) {
        if (!authCookie) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (pathname === '/login') {
        if (authCookie) {
            return NextResponse.redirect(new URL('/inventory', request.url))
        }
    }

    if (pathname === '/') {
        return NextResponse.redirect(new URL('/inventory', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
