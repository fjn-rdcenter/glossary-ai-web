import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export const proxy = intlMiddleware;

export const config = {
  // Match all pathnames except for the ones starting with:
  // - api (API routes)
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - [^/]+\.[^/]+ (files with extensions, e.g. favicon.ico)
  matcher: ['/', '/(en|vi|ja)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};