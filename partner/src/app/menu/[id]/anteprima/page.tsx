'use client';

// Il menù a tutta pagina, senza il portale intorno: è la cosa che il cliente
// vedrà, guardata dal ristoratore. Si apre in una scheda a parte dall'editor.
//
// ⚠️ NON È ANCORA L'INDIRIZZO PUBBLICO. Questa pagina sta DENTRO il portale,
// quindi è dietro l'autenticazione e la vede solo chi ha fatto l'accesso.
// L'indirizzo vero — quello del QR sul tavolo — sarà
// allergiapp.com/menu/<slug>, servito da un progetto suo e generato al
// salvataggio (DIGITAL_MENU.md, Temi 6, 11 e 13). Quando quello esisterà,
// questa route può restare come "vedi come viene" o sparire: quello che non
// deve succedere è che qualcuno stampi un QR che punta qui.
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useDishes } from '@/lib/dishes';
import { useMenu, useMenus } from '@/lib/menus';
import { DEFAULT_ACCENT, type MenuBrand } from '@/lib/menuBrand';
import { useVenues } from '@/lib/venues';
import MenuPreview, { NO_NEEDS, type ViewerNeeds } from '@/components/menus/MenuPreview';

export default function FullPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { d } = useI18n();
  const { dishes } = useDishes();
  const { menus } = useMenus();
  const { venues } = useVenues();
  const { menu, loading } = useMenu(id);
  const [needs, setNeeds] = useState<ViewerNeeds>(NO_NEEDS);
  // I tre piatti finti, a comando come nell'editor. Questa pagina si apre in
  // una scheda a parte e non condivide niente con quella: lo stato è suo, e
  // parte spento.
  const [esempio, setEsempio] = useState(false);

  function toggleNeed(kind: 'allergens' | 'diets', code: string) {
    setNeeds((prev) => ({
      ...prev,
      [kind]: prev[kind].includes(code)
        ? prev[kind].filter((c) => c !== code)
        : [...prev[kind], code],
    }));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        {d.common.loading}
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-gray-500">{d.menuEditor.notFound}</p>
        <Link href="/menu" className="text-sm font-medium text-gray-900 underline">
          {d.menuEditor.back}
        </Link>
      </div>
    );
  }


  const locale = (venues ?? []).find((v) => v.id === menu.venueId) ?? null;
  const brand: MenuBrand = {
    name: locale?.venueName ?? '',
    logoUrl: locale?.logoUrl ?? '',
    accent: locale?.accent ?? DEFAULT_ACCENT,
  };

  return (
    // Fondo grigio dietro la colonna: su un monitor largo, bianco su bianco
    // farebbe sembrare il menù una pagina senza margini invece di una
    // schermata di telefono
    <div className="min-h-[100dvh] bg-gray-100">
      {/* Fascia di servizio: chi apre questa scheda deve sapere in ogni
          momento che sta guardando un'anteprima e non l'indirizzo pubblico,
          altrimenti prima o poi qualcuno lo copia e lo manda a un cliente.
          Sulla pagina pubblica vera non ci sarà. */}
      <div className="flex items-center justify-between gap-3 bg-gray-900 px-4 py-1.5 text-[11px] text-white">
        {/* Con l'esempio acceso la fascia lo dice: è l'unico posto che può
            farlo, perché dentro lo schermo simulato c'è solo quello che
            vedrebbe un cliente. */}
        <span>
          {esempio
            ? `${d.menuEditor.previewSampleCaption} ${d.menuEditor.fullPreviewNotice}`
            : d.menuEditor.fullPreviewNotice}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          {/* Solo a menù vuoto: con dei piatti dentro non c'è niente da
              dimostrare. */}
          {menu.sections.length === 0 && menu.loose.length === 0 && (
            <button onClick={() => setEsempio(!esempio)} className="underline underline-offset-2">
              {esempio ? d.menuEditor.previewSampleHide : d.menuEditor.previewSampleShow}
            </button>
          )}
          <Link href={`/menu/${menu.id}`} className="underline underline-offset-2">
            {d.menuEditor.fullPreviewBack}
          </Link>
        </div>
      </div>

      {/* La colonna resta stretta come un telefono anche su un monitor: il
          menù al tavolo si legge dal telefono, e allargarlo a tutto schermo
          farebbe giudicare al ristoratore un'impaginazione che nessuno dei
          suoi clienti vedrà mai. */}
      <div className="mx-auto min-h-[calc(100dvh-1.75rem)] w-full max-w-[420px] bg-white shadow-sm">
        {/* Altezza FISSA e non minima: MenuPreview ha già dentro di sé
            l'intestazione ferma e la lista che scorre (flex-1
            overflow-y-auto) — ma quello scorrimento interno funziona solo
            se questo contenitore ha un'altezza vera da passargli (h-full),
            non semplicemente un minimo. Senza, con pochi piatti la pagina
            prendeva l'altezza del contenuto e basta: un foglio aperto sopra
            un piatto (DishDetailSheet, absolute inset-0) si ritrovava
            schiacciato in cima invece di coprire tutto lo schermo. */}
        <div className="flex h-[calc(100dvh-1.75rem)] flex-col">
          <MenuPreview
            menu={menu}
            siblings={(menus ?? []).filter((m) => m.venueId === menu.venueId)}
            dishes={dishes ?? []}
            brand={brand}
            coverUrl={locale?.coverUrl ?? ''}
            venueName={brand.name.trim() || d.preview.venueName}
            tableConditions={locale?.tableConditions ?? ''}
            layout={locale?.menuLayout ?? 'row'}
            separator={locale?.dishSeparator ?? 'none'}
            showPhotos={locale?.showDishPhotos ?? true}
            photoShape={locale?.dishPhotoShape ?? 'square'}
            showDescriptions={locale?.showDishDescriptions ?? false}
            sectionStyle={locale?.sectionStyle ?? 'underline'}
            headingFont={locale?.headingFont ?? 'modern'}
            textScale={locale?.textScale ?? 'normal'}
            lineHeight={locale?.lineHeight ?? 'normal'}
            mostraEsempio={esempio}
            needs={needs}
            onToggleNeed={toggleNeed}
          />
        </div>
      </div>
    </div>
  );
}
