import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Verificando ruta: ${pathname}`);

  const token = request.cookies.get('authToken')?.value;
  console.log(`[Middleware] Token encontrado: ${!!token}`);

  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.includes(pathname);

  // Si no hay token y la ruta NO es pública, redirige a /login
  if (!token && !isPublicPath) {
    console.log('[Middleware] ACCIÓN: Redirigiendo a /login (ruta protegida sin token).');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay token y la ruta ES pública (ej. /login), redirige al dashboard (/)
  if (token && isPublicPath) {
    console.log('[Middleware] ACCIÓN: Redirigiendo a / (ruta pública con token).');
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  console.log('[Middleware] ACCIÓN: Permitiendo acceso a la ruta.');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};