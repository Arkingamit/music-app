import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware: Redirects all non-setup requests to /setup
 * if the SETUP_COMPLETE env var is not set.
 * 
 * On a fresh server deployment, SETUP_COMPLETE won't exist,
 * so users are redirected to the setup wizard.
 * 
 * After setup completes, the wizard writes .env.local with SETUP_COMPLETE=true,
 * and a server restart picks it up — disabling the redirect permanently.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow access to setup page, setup API, and static assets
  if (
    pathname.startsWith('/setup') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if setup is complete via environment variable
  // This env var gets written to .env.local by the setup wizard
  const setupComplete = process.env.SETUP_COMPLETE;

  if (!setupComplete || setupComplete !== 'true') {
    // Setup not complete — redirect to setup wizard
    const setupUrl = new URL('/setup', request.url);
    return NextResponse.redirect(setupUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
