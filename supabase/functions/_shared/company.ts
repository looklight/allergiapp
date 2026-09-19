// L'AZIENDA DEL RISTORATORE: controllarla e salvarla, in un posto solo.
//
// La usano due funzioni, che ci arrivano da due strade:
//   - stripe-webhook   al pagamento: ragione sociale e P.IVA sono quelle che
//                      il ristoratore ha dato a Stripe per la fattura (19/09:
//                      si scrivono una volta sola, e chi paga è per forza chi
//                      poi dichiara di gestire il locale);
//   - partner-company  a mano, dal portale: quando non c'è Stripe dietro
//                      (abbonamento offerto da noi) o Stripe non l'ha chiesta.
//
// Il ristoratore la tabella `partner_companies` la LEGGE soltanto (721): se
// potesse scriverla si segnerebbe da solo «verificata». Qui si scrive col
// service role.
//
// VIES È UN CONTROLLO UFFICIALE PER IL NOSTRO TEAM, NON UN CANCELLO (19/09).
// La scheda compare in app solo dopo che l'admin ha guardato il collegamento
// (724); l'esito di VIES gli sta davanti per decidere in fretta. «Non trovata»
// non vuol dire «non esiste»: molte trattorie italiane e spagnole non sono
// iscritte agli scambi UE — la P.IVA vera di AllergiApp compresa, provato il
// 19/09. Allora l'admin la guarda sul sito dell'Agenzia delle Entrate.
//
// Il nome e la sede che VIES restituisce si tengono (19/09): la sede nella
// stessa città del locale è un indizio utile all'admin. ⚠️ Per una ditta
// individuale la sede è spesso la casa del titolare: la vede solo l'admin,
// non si mostra altrove e non si esporta.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// I paesi di VIES, col codice che usa VIES: ISO GR per la Grecia è EL.
const VIES: Record<string, string> = {
  AT: "AT", BE: "BE", BG: "BG", CY: "CY", CZ: "CZ", DE: "DE", DK: "DK",
  EE: "EE", GR: "EL", ES: "ES", FI: "FI", FR: "FR", HR: "HR", HU: "HU",
  IE: "IE", IT: "IT", LT: "LT", LU: "LU", LV: "LV", MT: "MT", NL: "NL",
  PL: "PL", PT: "PT", RO: "RO", SE: "SE", SI: "SI", SK: "SK",
};

// Un account non dichiara aziende a decine: il tetto impedisce di usare il
// nostro server per interrogare VIES su P.IVA a caso.
const MAX_AZIENDE_PER_ACCOUNT = 10;

// La cifra di controllo della partita IVA italiana (11 cifre): le cifre in
// posizione dispari si sommano, quelle in posizione pari si raddoppiano (meno
// 9 se superano 9); l'ultima fa arrivare il totale a un multiplo di 10. Vale
// per ogni P.IVA italiana, forfettaria o no: ferma gli errori di battitura
// senza chiedere niente a nessuno.
function partitaIvaValida(v: string): boolean {
  if (!/^\d{11}$/.test(v)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let d = Number(v[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    somma += d;
  }
  return (10 - (somma % 10)) % 10 === Number(v[10]);
}

// Maiuscole, niente spazi né punteggiatura, senza il prefisso del paese (che
// sta in country_code): «IT 0123…» e «0123…» sono la stessa azienda.
function pulisci(country: string, raw: string): string {
  let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const prefisso of new Set([country, VIES[country]].filter(Boolean))) {
    if (v.startsWith(prefisso) && v.length > prefisso.length + 1) {
      v = v.slice(prefisso.length);
      break;
    }
  }
  return v;
}

// VIES risponde «---» dove non ha il dato, e va a capo nella sede.
const dato = (s: unknown) => {
  const t = typeof s === "string" ? s.replace(/\s*\n\s*/g, ", ").replace(/,\s*$/, "").trim() : "";
  return t && t !== "---" ? t : null;
};

type EsitoVies =
  | { stato: "vies_valid"; nome: string | null; sede: string | null }
  | { stato: "vies_not_found" }
  | { stato: "unverified" };

async function chiediAVies(country: string, vat: string): Promise<EsitoVies> {
  try {
    const res = await fetch(
      "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: VIES[country], vatNumber: vat }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return { stato: "unverified" };
    const d = await res.json();
    // Con un errore (servizio del paese giù, troppe richieste) VIES risponde
    // senza `valid`: non sappiamo niente, quindi «da verificare».
    if (typeof d.valid !== "boolean") return { stato: "unverified" };
    if (!d.valid) return { stato: "vies_not_found" };
    return { stato: "vies_valid", nome: dato(d.name), sede: dato(d.address) };
  } catch (e) {
    console.error("[company] VIES non risponde:", e);
    return { stato: "unverified" };
  }
}

export type EsitoAzienda =
  | { company_id: string; vat_status: string }
  // Chiavi che il portale traduce
  | { error: "vat_invalid" | "name_invalid" | "country_invalid" | "too_many" | "save_failed" };

/**
 * Salva l'azienda di un account, o ritrova quella che c'è già (una per
 * account, paese e P.IVA: 721). Non collega nessun locale.
 */
export async function salvaAzienda(
  admin: SupabaseClient,
  ownerUserId: string,
  rawCountry: string,
  rawLegalName: string,
  rawVat: string,
): Promise<EsitoAzienda> {
  const country = rawCountry.toUpperCase();
  const legalName = rawLegalName.trim().replace(/\s+/g, " ");
  if (!/^[A-Z]{2}$/.test(country)) return { error: "country_invalid" };
  if (legalName.length < 2 || legalName.length > 200) return { error: "name_invalid" };

  const vat = pulisci(country, rawVat);
  if (vat.length < 4 || vat.length > 20) return { error: "vat_invalid" };
  if (country === "IT" && !partitaIvaValida(vat)) return { error: "vat_invalid" };

  // Già c'è: si riusa. La ragione sociale non si riscrive da qui — per
  // cambiarla ci sarà la modifica dall'Account, che rifà il controllo.
  const { data: esistente } = await admin
    .from("partner_companies")
    .select("id, vat_status")
    .eq("owner_user_id", ownerUserId)
    .eq("country_code", country)
    .eq("vat_number", vat)
    .maybeSingle();
  if (esistente) return { company_id: esistente.id, vat_status: esistente.vat_status };

  const { count } = await admin
    .from("partner_companies")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", ownerUserId);
  if ((count ?? 0) >= MAX_AZIENDE_PER_ACCOUNT) return { error: "too_many" };

  const esito: EsitoVies = VIES[country] ? await chiediAVies(country, vat) : { stato: "unverified" };

  const { data: creata, error } = await admin
    .from("partner_companies")
    .insert({
      owner_user_id: ownerUserId,
      country_code: country,
      legal_name: legalName,
      vat_number: vat,
      vat_status: esito.stato,
      vat_checked_at: esito.stato === "unverified" ? null : new Date().toISOString(),
      vies_name: esito.stato === "vies_valid" ? esito.nome : null,
      vies_address: esito.stato === "vies_valid" ? esito.sede : null,
    })
    .select("id, vat_status")
    .single();
  if (error) {
    // Due salvataggi della stessa azienda nello stesso istante (il webhook e
    // il portale, per dire): l'indice unico ne lascia passare uno, e l'altro
    // la ritrova invece di fallire.
    if (error.code === "23505") {
      const { data: gia } = await admin
        .from("partner_companies")
        .select("id, vat_status")
        .eq("owner_user_id", ownerUserId)
        .eq("country_code", country)
        .eq("vat_number", vat)
        .maybeSingle();
      if (gia) return { company_id: gia.id, vat_status: gia.vat_status };
    }
    console.error("[company] salvataggio fallito:", error);
    return { error: "save_failed" };
  }
  return { company_id: creata.id, vat_status: creata.vat_status };
}
