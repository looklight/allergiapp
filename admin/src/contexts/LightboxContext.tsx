'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/** Una foto può essere passata come URL semplice o come oggetto {url, thumbnailUrl}. */
type PhotoInput = string | null | undefined | { url?: string | null; thumbnailUrl?: string | null };

interface LightboxContextValue {
  /** Apre il visualizzatore con l'elenco di foto, partendo dall'indice indicato. */
  open: (photos: PhotoInput[], startIndex?: number) => void;
}

const LightboxContext = createContext<LightboxContextValue>({ open: () => {} });

/** Hook per aprire il lightbox da qualsiasi componente client dell'admin. */
export function useLightbox() {
  return useContext(LightboxContext);
}

function toUrl(p: PhotoInput): string | null {
  if (!p) return null;
  if (typeof p === 'string') return p || null;
  return p.url ?? p.thumbnailUrl ?? null;
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((items: PhotoInput[], startIndex = 0) => {
    const urls = items.map(toUrl).filter((u): u is string => !!u);
    if (urls.length === 0) return;
    setPhotos(urls);
    setIndex(Math.min(Math.max(startIndex, 0), urls.length - 1));
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);

  // Tastiera (Esc / frecce) + blocco scroll del body mentre è aperto.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close, prev, next]);

  const hasMultiple = photos.length > 1;

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualizzatore foto"
          onClick={close}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          {/* Chiudi */}
          <button
            onClick={close}
            aria-label="Chiudi"
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Contatore */}
          {hasMultiple && (
            <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/80 tabular-nums">
              {index + 1} / {photos.length}
            </span>
          )}

          {/* Precedente */}
          {hasMultiple && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Foto precedente"
              className="absolute left-2 sm:left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* Immagine */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[index]}
            alt={`Foto ${index + 1} di ${photos.length}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded object-contain shadow-2xl"
          />

          {/* Successiva */}
          {hasMultiple && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Foto successiva"
              className="absolute right-2 sm:right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </LightboxContext.Provider>
  );
}
