import type { MetadataRoute } from 'next';

// Il portale è in fase di test: fuori dai motori di ricerca finché non
// esiste il percorso di iscrizione partner vero (v. MONETIZATION.md).
// Da rimuovere quando il portale sarà davvero aperto ai ristoratori.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
