# AllergiApp

App gratuita per comunicare allergie alimentari in diverse lingue, pensata per chi viaggia all'estero.

## Setup Sviluppo

### Prerequisiti
- Node.js (v18+)
- Expo CLI
- Xcode (per iOS)

### Installazione

```bash
npm install
npx expo start
```

### Build iOS locale (senza Apple Developer Program)

1. `npx expo prebuild --platform ios`
2. Apri `ios/AllergiApp.xcworkspace` in Xcode
3. Configura Signing & Capabilities con il tuo Apple ID
4. Product → Scheme → Edit Scheme → Run → Build Configuration: **Release**
5. Seleziona il tuo iPhone e premi ▶️

**Nota:** L'app scade dopo 7 giorni, poi reinstalla con ▶️

### Configurazioni manuali dopo `expo prebuild`

Ogni volta che esegui `npx expo prebuild --clean`:

1. Apri `ios/AllergiApp.xcworkspace` in Xcode
2. Build Settings → cerca "User Script Sandboxing" → imposta su **No**

Questo è necessario per evitare errori di build con React Native.

---

## Firebase Analytics

L'app usa Firebase Analytics per statistiche anonime.

### Setup
1. Crea progetto su [Firebase Console](https://console.firebase.google.com/)
2. Scarica `google-services.json` (Android) e `GoogleService-Info.plist` (iOS)
3. Posiziona i file nella root del progetto
4. I file sono già in `.gitignore`

**Nota:** Firebase funziona solo in build native, non in Expo Go.

### Eventi tracciati
- Allergie: aggiunte, rimosse, salvate
- Lingue: download, cambio lingua app/card
- Card: visualizzazioni
- App: apertura, reset dati

---

## Build per Produzione

### EAS Build (consigliato)

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

### Build Locale

```bash
npx expo prebuild
cd ios && pod install
npx expo run:ios --configuration Release
```

---

## Struttura Repository

Il progetto usa `git worktree`:

```
/AllergiApp/
├── allergiapp/     ← branch main (app React Native)
└── landing/        ← branch landing (sito web)
```

---

## Privacy e GDPR

- Dati salvati solo localmente sul dispositivo
- Analytics anonimi (paese, dispositivo, funzioni usate)
- Nessun dato personale raccolto
- Documenti legali: `PRIVACY_POLICY.md`, `PRIVACY_POLICY_EN.md`

---

## Struttura Progetto

```
app/
├── index.tsx           # Home
├── add-allergy.tsx     # Selezione allergie
├── card.tsx            # Carta multilingua
├── settings.tsx        # Impostazioni
├── legal.tsx           # Privacy & Terms
└── components/         # Componenti riutilizzabili
constants/              # Allergeni, traduzioni, tema
utils/                  # Analytics, i18n, storage
locales/                # Traduzioni UI (it, en, es, de, fr)
```

---

## Estendere l'App

### Aggiungere allergeni
1. `types/index.ts` - aggiungi ID
2. `constants/allergens.ts` - aggiungi allergene con traduzioni

### Aggiungere lingue scaricabili
1. `constants/downloadableLanguages.ts` - aggiungi lingua

### Aggiungere analytics
1. `utils/analytics.ts` - aggiungi nuovo evento

---

## Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Firebase non funziona in Expo Go | Normale, serve build nativa |
| Build fallisce con errore sandbox | Disabilita "User Script Sandboxing" in Xcode |
| App schermo bianco su iPhone | Usa build Release, non Debug |
| Download lingue fallisce | Controlla connessione internet |

---

## Disclaimer

Questa app NON è un dispositivo medico. Gli sviluppatori non sono responsabili per reazioni allergiche derivanti dall'uso dell'app.
