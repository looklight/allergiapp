/**
 * =============================================================================
 * SEED USERS — Profili fittizi per l'import massivo ristoranti
 * =============================================================================
 *
 * Questi profili vengono creati automaticamente su Supabase la prima volta
 * che si lancia import-restaurants.js. Sono utenti realistici con nomi
 * italiani/europei, tutti con almeno intolleranza al glutine.
 *
 * COME AGGIUNGERE UN NUOVO UTENTE:
 *   - Formato vecchio (file con colonna "Utente"): usa una lettera come chiave
 *   - Formato nuovo (file con colonna "Nickname"): usa il Nickname come chiave
 *   1. Aggiungi la riga con username, allergens e diets
 *   2. Nel file Excel, usa la lettera/nickname nella colonna "Utente"/"Nickname"
 *   3. Lancia lo script: il profilo verrà creato automaticamente
 *
 * CONVENZIONE USERNAME:
 *   - Formato: NomeCognome_ oppure Nome_Soprannome_ (con underscore finale)
 *   - Devono sembrare reali ma non essere riconducibili a persone esistenti
 *
 * ALLERGIE DISPONIBILI (da constants/allergens.ts):
 *   gluten, crustaceans, eggs, fish, peanuts, soy, milk,
 *   nuts, celery, mustard, sesame, sulfites, lupin, mollusks, fava_beans
 *
 * DIETE DISPONIBILI:
 *   vegetarian, vegan, diabetes
 *
 * NOTE:
 *   - I dati di accesso (email/password) vengono salvati in seed-users-log.json
 *     nella stessa cartella (file gitignored — non committare mai)
 *   - Se un profilo viene eliminato dal DB, le sue recensioni diventano anonime
 *     (ON DELETE SET NULL) ma rimangono visibili nell'app
 * =============================================================================
 */

module.exports = {
  // ── Formato vecchio (chiave = lettera, colonna Excel "Utente") ─────────────
  a: { username: 'CimiAndrea_',       allergens: ['gluten'],              diets: [] },
  b: { username: 'Beatrice_GF_',      allergens: ['gluten'],              diets: [] },
  c: { username: 'Chiara_87_',        allergens: ['gluten'],              diets: [] },
  d: { username: 'Dadess_84a_',       allergens: ['gluten', 'crustaceans'], diets: [] },
  e: { username: 'Elena_Mrz_',        allergens: ['gluten'],              diets: [] },
  f: { username: 'FedericaBrig_',     allergens: ['gluten', 'lupin'],     diets: [] },
  g: { username: 'GiugiaGFree_',      allergens: ['gluten'],              diets: [] },
  m: { username: 'MarcoSau93L_',      allergens: ['gluten'],              diets: [] },
  n: { username: 'Nicovico99_',       allergens: ['gluten', 'soy'],       diets: [] },
  r: { username: 'Robertina95ita_',   allergens: ['gluten'],              diets: [] },
  s: { username: 'Saravvl93_',        allergens: ['gluten'],              diets: [] },

  // ── Formato nuovo (chiave = Nickname, colonna Excel "Nickname") ────────────

  // gf_europa_nuove_citta.xlsx
  AnnaPace:             { username: 'AnnaPace',             allergens: ['gluten'], diets: [] },
  PallaAlCentro:        { username: 'PallaAlCentro',        allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  chiaraveronese:       { username: 'chiaraveronese',       allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  ines_pt:              { username: 'ines_pt',              allergens: ['gluten'], diets: ['vegetarian'] },
  lapo82:               { username: 'lapo82',               allergens: ['gluten'], diets: [] },
  luka10:               { username: 'luka10',               allergens: ['gluten'], diets: ['vegetarian'] },
  marco_to:             { username: 'marco_to',             allergens: ['gluten'], diets: [] },
  mariekeH:             { username: 'mariekeH',             allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  ondre_p:              { username: 'ondre_p',              allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  rosa_vlc:             { username: 'rosa_vlc',             allergens: ['gluten'], diets: [] },
  ruhr_felix:           { username: 'ruhr_felix',           allergens: ['gluten'], diets: [] },
  signe_d:              { username: 'signe_d',              allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  stevem:               { username: 'stevem',               allergens: ['gluten'], diets: ['vegetarian'] },
  tobias_n:             { username: 'tobias_n',             allergens: ['gluten'], diets: [] },
  wagata:               { username: 'wagata',               allergens: ['gluten'], diets: ['vegetarian'] },

  // Precedenti file
  Angelldn:             { username: 'Angelldn',             allergens: ['gluten'], diets: [] },
  AntonioParos:         { username: 'AntonioParos',         allergens: ['gluten'], diets: [] },
  barnard69:            { username: 'barnard69',            allergens: ['gluten'], diets: ['vegetarian'] },
  bontonne:             { username: 'bontonne',             allergens: ['gluten'], diets: ['vegetarian'] },
  Bspeczial:            { username: 'Bspeczial',            allergens: ['gluten'], diets: [] },
  celeste77:            { username: 'celeste77',            allergens: ['gluten'], diets: ['vegetarian'] },
  DaliaFormale:         { username: 'DaliaFormale',         allergens: ['gluten'], diets: [] },
  Kreuzerg:             { username: 'Kreuzerg',             allergens: ['gluten'], diets: ['vegetarian'] },
  madrileno_sg:         { username: 'madrileno_sg',         allergens: ['gluten'], diets: ['vegetarian'] },
  michiamanolucenz:     { username: 'michiamanolucenz',     allergens: ['gluten'], diets: [] },
  PerriOscar:           { username: 'PerriOscar',           allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  Piramisu:             { username: 'Piramisu',             allergens: ['gluten'], diets: ['vegetarian'] },
  rhone_sg:             { username: 'rhone_sg',             allergens: ['gluten'], diets: [] },
  Rossi_Cristiano_DE:   { username: 'Rossi_Cristiano_DE',   allergens: ['gluten'], diets: ['vegetarian'] },
  Sarah_Lisetti:        { username: 'Sarah_Lisetti',        allergens: ['gluten'], diets: ['vegetarian'] },
  TravelFabio:          { username: 'TravelFabio',          allergens: ['gluten'], diets: ['vegetarian'] },

  // gf_usa.xlsx
  AlbertoC92:           { username: 'AlbertoC92',           allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  carlos_95:            { username: 'carlos_95',            allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  miku_fku:             { username: 'miku_fku',             allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  mia_maria:            { username: 'mia_maria',            allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  beatricebebe:         { username: 'beatricebebe',         allergens: ['gluten'], diets: ['vegetarian'] },
  sofia_88:             { username: 'sofia_88',             allergens: ['gluten'], diets: ['vegetarian'] },
  laguardini:           { username: 'laguardini',           allergens: ['gluten'], diets: ['vegetarian'] },
  ash_ketchup:          { username: 'ash_ketchup',          allergens: ['gluten'], diets: [] },
  Lancetti2:            { username: 'Lancetti2',            allergens: ['gluten'], diets: [] },
  cigaflavio:           { username: 'cigaflavio',           allergens: ['gluten'], diets: [] },
  bossi_noemi:          { username: 'bossi_noemi',          allergens: ['gluten'], diets: [] },
  LaShuri:              { username: 'LaShuri',              allergens: ['gluten'], diets: [] },
  'celiachia_portami_via_3': { username: 'celiachia_portami_via_3', allergens: ['gluten'], diets: [] },

  // gf_asia2.xlsx
  '3graces':            { username: '3graces',              allergens: ['gluten'], diets: ['vegetarian'] },
  agnesegrazie:         { username: 'agnesegrazie',         allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  AnnaDeLuc:            { username: 'AnnaDeLuc',            allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  dewin_CC:             { username: 'dewin_CC',             allergens: ['gluten'], diets: [] },
  Gabriette7:           { username: 'Gabriette7',           allergens: ['gluten'], diets: [] },
  GomuGomuDan:          { username: 'GomuGomuDan',          allergens: ['gluten'], diets: [] },
  its_Sara:             { username: 'its_Sara',             allergens: ['gluten'], diets: [] },
  Jack_GF:              { username: 'Jack_GF',              allergens: ['gluten'], diets: [] },
  Jhonny5Jack:          { username: 'Jhonny5Jack',          allergens: ['gluten'], diets: ['vegetarian'] },
  LeleStories:          { username: 'LeleStories',          allergens: ['gluten'], diets: ['vegetarian'] },
  LolloLOL:             { username: 'LolloLOL',             allergens: ['gluten'], diets: ['vegetarian'] },
  marcocolombini:       { username: 'marcocolombini',       allergens: ['gluten'], diets: ['vegetarian'] },
  nana_osaka:           { username: 'nana_osaka',           allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  delfoandrea:          { username: 'delfoandrea',          allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  somchai:              { username: 'somchai',              allergens: ['gluten'], diets: ['vegetarian', 'vegan'] },
  VivianaGastaldi:      { username: 'VivianaGastaldi',      allergens: ['gluten'], diets: [] },
};
