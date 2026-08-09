import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken, roleCanAccess } from '@/lib/auth';

/**
 * Protege /bar e /admin com o cookie de sessão assinado.
 * Páginas de login ficam sempre abertas. Admin também acessa /bar.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/bar/login' || pathname === '/admin/login') {
    return NextResponse.next();
  }

  const area: 'bar' | 'admin' = pathname.startsWith('/admin')
    ? 'admin'
    : 'bar';

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const role = await verifySessionToken(token);

  if (!roleCanAccess(role, area)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${area}/login`;
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/bar', '/bar/:path*', '/admin', '/admin/:path*'],
};
