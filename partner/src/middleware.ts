import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Muro d'accesso temporaneo al portale in test.
//
// Perché non la protezione di Vercel: sul piano attuale copre solo gli URL
// di deployment, non il dominio pubblico. E il sottodominio non è un
// segreto — i certificati TLS finiscono nei log pubblici di Certificate
// Transparency, quindi partner.allergiapp.com è scopribile da chiunque.
//
// Da rimuovere quando esisterà il percorso di iscrizione partner vero
// (profilo partner + cancello sul database, v. MONETIZATION.md).
// Senza PARTNER_GATE_PASSWORD il muro non c'è: in locale si lavora normale.
export function middleware(req: NextRequest) {
  const expected = process.env.PARTNER_GATE_PASSWORD;
  if (!expected) return NextResponse.next();

  const header = req.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    const [, password] = atob(header.slice(6)).split(':');
    if (password === expected) return NextResponse.next();
  }

  return new NextResponse('Accesso riservato', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="AllergiApp Partner"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
