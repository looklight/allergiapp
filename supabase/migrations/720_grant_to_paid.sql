-- ============================================================
-- 720_grant_to_paid.sql
-- STATO: BOZZA, da applicare a mano dal SQL editor.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- DAL REGALO AL PAGATO SENZA CHE IL CLIENTE AL TAVOLO SE NE ACCORGA.
--
-- Il difetto, trovato guardando il passaggio (16/09): l'indice della 716
-- ammette UN SOLO abbonamento aperto per locale, quindi il webhook, per
-- scrivere il pagato, deve prima chiudere il regalo. Fra le due scritture
-- c'è un istante in cui il locale risulta scoperto — e in quell'istante il
-- trigger della 718 fa il suo mestiere: toglie l'aspetto dalla sala. Poi
-- arriva il pagato, il trigger vede che è coperto e non fa niente, perché in
-- salita non deve pubblicare nulla di sua iniziativa.
--
-- Risultato: il menù diventava sobrio ESATTAMENTE nel momento in cui il
-- ristoratore cominciava a pagare, e ci restava finché non premeva Pubblica.
-- Il contrario di quello che deve succedere.
--
-- LA CURA: un abbonamento aperto per locale E PER PROVENIENZA. Così il
-- pagato può nascere mentre il regalo è ancora vivo, il locale non è mai
-- scoperto per un istante, e il regalo si chiude dopo.
--
-- Cosa resta garantito: due abbonamenti PAGATI aperti sullo stesso locale
-- continuano a essere impossibili, che è il vincolo che conta (è quello che
-- eviterebbe un doppio addebito). Un regalo e un pagato insieme sono invece
-- uno stato legittimo — è esattamente il passaggio — e per «ha diritto
-- all'aspetto?» non cambia niente: venue_subscription_active risponde sì se
-- ne trova almeno uno valido.
-- ============================================================

BEGIN;

drop index if exists partner_subscriptions_one_open_per_venue;

create unique index partner_subscriptions_one_open_per_venue_source
  on partner_subscriptions (venue_id, source)
  where status in ('active', 'past_due');

comment on index partner_subscriptions_one_open_per_venue_source is
  'Un abbonamento aperto per locale e per provenienza: due pagati sullo stesso locale restano impossibili (doppio addebito), mentre un regalo e un pagato possono convivere per il tempo del passaggio.';

COMMIT;
