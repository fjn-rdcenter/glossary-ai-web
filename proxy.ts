import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {getBrowserLocale, routing} from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const firstSegment = request.nextUrl.pathname.split('/')[1];

  if (!firstSegment || !routing.locales.some((locale) => locale === firstSegment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${getBrowserLocale(request.headers.get('accept-language'))}/dashboard/`;
    url.search = '';

    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for the ones starting with:
  // - api (API routes)
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - [^/]+\.[^/]+ (files with extensions, e.g. favicon.ico)
  matcher: ['/', '/(en|vi|ja)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
