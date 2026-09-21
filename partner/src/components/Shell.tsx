'use client';

import { usePathname } from 'next/navigation';
import { AuthContext, useAuthState } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import AuthGuard from './AuthGuard';
import Nav from './Nav';
import RegisterSW from './RegisterSW';
import SaveStatus from './SaveStatus';

// Tutto ciò che ha bisogno del browser (sessione, lingua, nav). Sta fuori dal
// layout perché la radice deve restare un componente server: è l'unico posto
// da cui si possono esportare metadata e viewport.
export default function Shell({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  // L'anteprima a tutta pagina resta dietro l'autenticazione — è roba del
  // ristoratore — ma senza barra laterale né margini del pannello: mostra
  // quello che vedrà il cliente, e il portale intorno falserebbe il giudizio.
  const isFullPreview = pathname.startsWith('/menu/') && pathname.endsWith('/anteprima');

  return (
    <>
      <RegisterSW />
      <I18nProvider>
        <AuthContext.Provider value={authState}>
          {isLoginPage ? (
            children
          ) : (
            <AuthGuard>
              {isFullPreview ? (
                children
              ) : (
                <>
              {/* Fuori dal <main>: l'avviso vale per tutte le schermate e non
                  deve scorrere via col contenuto di quella che si sta guardando */}
              <SaveStatus />
              <div className="flex min-h-screen">
                <Nav />
                {/* min-w-0: un elemento di una flex row non scende sotto la
                    larghezza del suo contenuto, e una fila che scorre da sé
                    (le categorie in Piatti: chip che non si stringono) allargava
                    la colonna intera fino alla somma dei chip — su telefono la
                    pagina si muoveva di lato (21/09). Con min-w-0 la colonna
                    resta larga quanto lo schermo e scorre solo la fila. */}
                <main className="min-w-0 flex-1 pb-bottom-nav">
                  {/* Più aria in cima che in fondo: i titoli attaccati al
                      bordo sembravano schiacciati (richiesta dell'utente,
                      15/09) */}
                  <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 md:px-8 md:pt-14 md:pb-10">
                    {children}
                  </div>
                </main>
              </div>
                </>
              )}
            </AuthGuard>
          )}
        </AuthContext.Provider>
      </I18nProvider>
    </>
  );
}
