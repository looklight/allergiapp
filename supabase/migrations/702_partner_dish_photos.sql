-- ============================================================
-- 702_partner_dish_photos.sql
-- STATO: APPLICATA il 2026-08-31 via SQL editor (il tracking
-- locale è fermo alla 045: questa, come tutte le 046+, è stata
-- eseguita a mano — MAI db push).
--
-- Le foto dei piatti passano da testo dentro la riga a file su
-- Supabase Storage.
--
-- COS'ERA: il portale salvava la foto come data-URL nella
-- colonna photo_url, cioè l'immagine intera codificata in testo
-- dentro il record. Costo: 50-100 KB per piatto riletti TUTTI a
-- ogni apertura del catalogo, dentro la stessa risposta JSON che
-- porta nomi e allergeni. Con quaranta piatti sono 3-4 MB per
-- aprire una lista, ogni volta, senza cache possibile.
--
-- COS'È ORA: due file per piatto sullo Storage, e nella riga
-- restano due indirizzi. Le immagini le serve la CDN, il browser
-- se le tiene, e la riga torna a pesare quello che pesa il testo.
--
-- ------------------------------------------------------------
-- PERCHÉ DUE MISURE, E PERCHÉ ADESSO
-- Sul piano gratuito Supabase NON esiste la trasformazione
-- immagini lato server (è una funzione del piano Pro). Quindi
-- una misura che non si genera al caricamento non si potrà più
-- ottenere: l'unico modo sarebbe far ricaricare le foto al
-- ristoratore, una per una.
-- Le due misure si generano nel browser al momento del
-- caricamento — la grande (900px) per la scheda e il tocco, la
-- miniatura (240px) per le liste, che è quella che si moltiplica
-- per quaranta. È il presupposto del menù digitale: v. Tema 11
-- in DIGITAL_MENU.md, dove le foto sono l'unico ordine di
-- grandezza che conta nel costo di una pagina pubblica.
--
-- Entrambe RITAGLIATE QUADRATE dal centro, come le foto delle
-- recensioni nell'app: il cerchio delle liste lo fa il CSS sopra
-- al quadrato, che resta intero e si potrà ingrandire premendo.
--
-- Colonna esplicita e non dedotta dal nome del file: un indirizzo
-- che si ricava con una regola è un indirizzo che si rompe il
-- giorno che la regola cambia. È anche come sono salvate le foto
-- delle recensioni nell'app (reviews.photos tiene url e
-- thumbnailUrl per intero).
-- ------------------------------------------------------------
--
-- ------------------------------------------------------------
-- PERCHÉ UN BUCKET A SÉ E NON 'images'
-- 1. Il bucket porta un tetto alla dimensione del file e l'elenco
--    dei tipi ammessi: un limite VERO, applicato dal server. Il
--    controllo sui 10 MB nel portale è cortesia lato client, e
--    chiunque può non farselo applicare. Mettere quel tetto su
--    'images' varrebbe anche per l'app.
-- 2. Utenti e partner sono due mondi distinti (v. la nota in
--    testa alla 700): tenerli in due bucket vuol dire che una
--    pulizia, una quota o una moderazione su uno non può
--    inciampare nei file dell'altro.
--
-- Bucket PUBBLICO in lettura, come 'images': la pagina pubblica
-- del menù (Tema 13) sarà generata e servita dalla cache, senza
-- nessuna connessione al database — indirizzi firmati da
-- rinnovare lì non funzionerebbero. Il nome del file è un UUID
-- casuale, quindi non si indovina, ma va detto chiaro: chi ha
-- l'indirizzo vede la foto, anche di un piatto in bozza. È la
-- stessa postura delle foto delle recensioni.
-- ------------------------------------------------------------

BEGIN;

-- ============================================================
-- COLONNA: partner_dishes.photo_thumb_url
-- La miniatura. Vuota per le foto vecchie (data-URL), che
-- continuano a funzionare come sono: l'interfaccia ripiega su
-- photo_url quando questa manca, e la miniatura arriva quando il
-- ristoratore ricarica quella foto. Nessuna conversione
-- automatica — sono i piatti di prova di un portale che non ha
-- ancora clienti (stessa scelta della 700 sul localStorage).
-- ============================================================
ALTER TABLE partner_dishes ADD COLUMN IF NOT EXISTS photo_thumb_url TEXT;

COMMENT ON COLUMN partner_dishes.photo_url IS
  'Indirizzo pubblico della foto grande (900px) sul bucket partner. Le righe scritte prima della 702 possono contenere un data-URL.';
COMMENT ON COLUMN partner_dishes.photo_thumb_url IS
  'Indirizzo pubblico della miniatura (240px), quella che si moltiplica nelle liste. NULL sulle foto anteriori alla 702.';

COMMIT;


-- ============================================================
-- IL BUCKET E LE SUE POLICY
-- Fuori dalla transazione di sopra e in due pezzi separati: qui
-- si scrive nello schema storage, che è di Supabase. Se questa
-- parte fallisse per un permesso, la colonna resta comunque
-- creata e non c'è niente da smontare a mano.
--
-- Va eseguita dal SQL editor (ruolo postgres). Se l'INSERT sul
-- bucket dà errore di permessi, il bucket si crea uguale dalla
-- Dashboard (Storage → New bucket, nome 'partner', Public,
-- limite 5 MB, tipi image/webp e image/jpeg) e poi si eseguono
-- solo le policy.
-- ============================================================

-- 5 MB: il portale carica WebP da 240px e 900px, che stanno sotto
-- i 150 KB. Il tetto non è la misura attesa ma il muro contro
-- l'abuso, e sta largo apposta: un limite stretto che rifiuta una
-- foto legittima è un ristoratore bloccato su un dato suo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('partner', 'partner', true, 5242880, ARRAY['image/webp', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- Ricreate pulite, come fa la 008 per 'images': le policy dello
-- storage possono essere già state create dalla Dashboard, e in
-- quel caso non si sa con quale testo.
DROP POLICY IF EXISTS "Partner can upload to own folder"   ON storage.objects;
DROP POLICY IF EXISTS "Partner can update own files"       ON storage.objects;
DROP POLICY IF EXISTS "Partner can delete own files"       ON storage.objects;
DROP POLICY IF EXISTS "Public read access for partner files" ON storage.objects;

-- La doppia condizione è deliberata: la cartella deve essere la
-- propria E chi scrive deve avere un profilo partner. È lo stesso
-- cancello strutturale delle tabelle della 700 (niente riga in
-- partner_accounts ⇒ niente contenuto partner), portato sui file:
-- senza, un qualunque utente dell'app autenticato potrebbe usare
-- il bucket come deposito.
-- Percorso: {userId}/dishes/{uuid}.webp e {uuid}_thumb.webp
CREATE POLICY "Partner can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'partner'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.partner_accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Partner can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'partner'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.partner_accounts WHERE user_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'partner'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.partner_accounts WHERE user_id = auth.uid())
  );

-- La cancellazione serve al portale per non lasciare file dietro:
-- foto sostituita, piatto eliminato, foto caricata e poi lasciata
-- perdere chiudendo la maschera.
CREATE POLICY "Partner can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'partner'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.partner_accounts WHERE user_id = auth.uid())
  );

-- Il bucket è pubblico, ma con RLS accesa serve comunque la
-- policy di lettura (stessa cosa notata nella 008).
CREATE POLICY "Public read access for partner files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner');


-- ============================================================
-- NON FATTO, e sono scelte
--
-- * Nessuna policy admin sui file partner. Nella 042 ne è stata
--   aggiunta una per 'images' perché la pulizia dell'admin ne
--   aveva bisogno davvero; qui non esiste ancora niente che tocchi
--   le foto dei partner dal pannello. Quando arriverà la
--   moderazione dei contenuti partner (DSA art. 17, già citato
--   nella 700), la policy si aggiunge lì insieme a chi la usa.
--
-- * Nessuna conversione delle foto data-URL già in tabella: v. la
--   nota sulla colonna qui sopra.
--
-- * Nessuna pulizia dei file rimasti orfani da scritture fallite.
--   Il portale cancella i propri file nei tre casi in cui sa di
--   doverlo fare, ma una scrittura persa a metà può lasciare un
--   file senza piatto. Sono byte, non dati sbagliati, e finché
--   non c'è un partner vero non c'è niente da spazzare.
-- ============================================================
