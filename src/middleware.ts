import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Protege /bar e /admin — checagem LEVE aqui (só "está logado?"), rodando
 * no Edge a cada request. A checagem fina (canViewBar/canManageBarCardapio
 * + resolução da unidade) acontece uma vez por carregamento de página via
 * requireRole() (src/lib/session.ts), que já lê o perfil completo — fazer
 * isso de novo aqui duplicaria a consulta a public.profiles sem necessidade.
 *
 * Segue o padrão oficial do @supabase/ssr: o middleware SEMPRE chama
 * supabase.auth.getUser() (não só lê o cookie) porque é isso que renova o
 * token de sessão a cada request.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/bar/login' || pathname === '/admin/login') {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) req.cookies.set(name, value);
          response = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const area: 'bar' | 'admin' = pathname.startsWith('/admin') ? 'admin' : 'bar';
    const url = req.nextUrl.clone();
    url.pathname = `/${area}/login`;
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/bar', '/bar/:path*', '/admin', '/admin/:path*'],
};
