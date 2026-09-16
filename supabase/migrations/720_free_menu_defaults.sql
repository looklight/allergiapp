-- ============================================================
-- 720_free_menu_defaults.sql
-- STATO: BOZZA, da applicare a mano dal SQL editor.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- I VALORI DI PARTENZA DEL MENÙ GRATUITO.
--
-- ⚠️ IL NUMERO 720 ERA RIMASTO LIBERO: la 720 di ieri (l'indice per locale e
-- provenienza) è stata rifusa nella 719 prima che venisse applicata, e il
-- file è sparito lasciando un buco. Qui si riusa il numero, che non è mai
-- stato eseguito da nessuna parte.
--
-- Perché adesso: con la 718 il colore di partenza ha cambiato mestiere. Non
-- è più «com'è un menù prima che il ristoratore lo sistemi» — è il colore di
-- TUTTI i menù senza abbonamento, cioè la faccia più vista del prodotto.
-- Merita di essere scelto, e la scelta dell'utente (2026-09-16) è il verde.
--
-- IL COLORE DIVENTA IL VERDE BOSCO.
--
-- ⚠️ TRE POSTI DEVONO DIRE LA STESSA COSA, o il portale mostra un colore e
-- il tavolo un altro:
--   1. il default della colonna (chi nasce da adesso)
--   2. venue_appearance_defaults() (cosa arriva al tavolo senza abbonamento)
--   3. DEFAULT_ACCENT nel portale (partner/src/lib/menuBrand.ts, dove il
--      verde è ora in posizione 0)
--
-- E IL FILO FRA UN PIATTO E L'ALTRO SI ACCENDE. Su una carta lunga letta a
-- tavola da un telefono è il segno che impedisce di perdere la riga, e la
-- scelta di partenza «nessun segno» veniva da quando questi valori erano
-- solo il punto da cui il ristoratore cominciava a sistemare. Adesso sono
-- il menù di chi non paga, cioè quasi tutti: meglio che siano leggibili.
-- Chi vuole la carta nuda toglie il filo in un tocco.
--
-- ⚠️ COSA CAMBIA NEI MENÙ GIÀ IN SALA: per i locali SENZA abbonamento
-- l'aspetto pubblicato è fatto di questi valori, quindi al prossimo giro (o
-- alla prossima pubblicazione) il loro menù passa da carbone a verde. È
-- voluto: è il colore dei menù gratuiti, e cambiarlo è il senso di questa
-- migration. I locali abbonati non si muovono di un pixel.
--
-- ⚠️ I LOCALI CHE ESISTONO GIÀ NON SI TOCCANO. Un UPDATE di massa
-- cambierebbe il colore a chi l'aveva scelto — e anche a chi si era tenuto
-- il carbone, che è una scelta pure quella. Chi ha `charcoal` scritto in
-- riga se lo tiene: il default vale per i nuovi, e i nuovi sono tutti quelli
-- che contano (gli unici locali di oggi sono nostre prove, e spariranno).
-- ============================================================

BEGIN;

alter table partner_venues
  alter column accent set default 'forest';

alter table partner_venues
  alter column dish_separator set default 'rule';

create or replace function venue_appearance_defaults()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
           'logoUrl', '',
           'accent', 'forest',
           'coverUrl', '',
           'headingFont', 'modern',
           'sectionStyle', 'underline',
           'showPhotos', true,
           'dishPhotoShape', 'square',
           'showDescriptions', false,
           'textScale', 'normal',
           'lineHeight', 'normal',
           'menuLayout', 'row',
           'dishSeparator', 'rule',
           'allergenDisplay', 'text'
         );
$$;

COMMIT;
