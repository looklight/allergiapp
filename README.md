# AllergiApp

App gratuita per comunicare allergie alimentari in diverse lingue, pensata per chi viaggia all'estero.

## Setup Sviluppo

### Prerequisiti
- Node.js (v18+)
- Expo CLI
- Xcode (per iOS), Android Studio (per Android)

### Installazione

```bash
npm install
npx expo start
```

### Build nativa locale

```bash
npx expo prebuild --clean
npx expo run:ios       # iOS
npx expo run:android   # Android
```

La cartella `ios/` e `android/` sono generate da `prebuild` e non vanno commitate.

---

## Build per Produzione (EAS)

Vedere la guida rapida in `TODO.md` e nelle memorie del progetto. In sintesi:

```bash
npx eas-cli build --platform all --profile production --non-interactive
npx eas-cli submit --platform ios --latest --non-interactive
# Android: submit da Google Play Console
```

OTA update (solo JS/assets):

```bash
npx eas-cli update --branch production --message "descrizione"
```

---

## Struttura Repository

Repo unico `allergiapp/` che contiene app Expo/React Native + `admin/` (dashboard Next.js) + `supabase/` (rules, migrations).

Il sito pubblico `landing/` vive su un branch separato (`landing`) dello stesso repo, servito via Vercel.

---

## Privacy e GDPR

- Auth e dati su Supabase (Auth, Postgres + PostGIS, Storage)
- Analytics anonimi via Firebase Analytics (gated da consenso ATT su iOS)
- Crashlytics per crash reporting (gated da consenso ATT)
- Contenuti legali in-app in `app/legal.tsx` / `constants/legalContent.ts`
- Privacy manifest iOS in `ios/AllergiApp/PrivacyInfo.xcprivacy`

---

## Struttura Progetto

```
app/
├── index.tsx            # Home
├── add-allergy.tsx      # Selezione allergie
├── card.tsx             # Carta multilingua
├── settings.tsx         # Impostazioni
├── legal.tsx            # Privacy & Terms
├── (tabs)/              # Tab bar (restaurants, profile, ...)
├── restaurants/         # Schermate ristoranti
└── components/          # Componenti riutilizzabili
contexts/                # AppContext, AuthContext, ...
services/                # analytics, supabase, restaurantService, ...
hooks/                   # useRestaurantDetail, useLanguageDownload, ...
constants/               # Allergeni, tema, traduzioni card, ...
utils/                   # Utility pure: storage, i18n
locales/                 # Traduzioni UI app
supabase/migrations/     # Schema SQL versionato
admin/                   # Dashboard Next.js (deploy separato)
```

---

## Estendere l'App

### Aggiungere allergeni
1. `types/index.ts` — aggiungi ID
2. `constants/allergens.ts` — aggiungi allergene con traduzioni

### Aggiungere lingue scaricabili
1. `constants/downloadableLanguages.ts` — aggiungi lingua
2. Allineare la tabella `translations` su Supabase (script `scripts/uploadToSupabase.js`)

### Aggiungere analytics
1. `services/analytics.ts` — aggiungi nuovo evento

---

## Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Build fallisce con errore sandbox iOS | Disabilita "User Script Sandboxing" in Xcode |
| App schermo bianco su iPhone | Usa build Release, non Debug |
| Download lingue fallisce | Controlla connessione internet; cache fallback su MyMemory |
| Env var `EXPO_PUBLIC_*` undefined nel build EAS | Aggiungerla anche in `eas.json` → `build.<profile>.env` |

---

## Disclaimer

Questa app NON è un dispositivo medico. Gli sviluppatori non sono responsabili per reazioni allergiche derivanti dall'uso dell'app.
