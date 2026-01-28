# AllergiApp

App gratuita per comunicare allergie alimentari in diverse lingue, pensata per chi viaggia o si trova all'estero e ha bisogno di comunicare le proprie allergie al personale di ristoranti, hotel e servizi alimentari.

## Caratteristiche

### Funzionalità Principali
- **Selezione allergie**: Scegli le tue allergie da una lista completa di allergeni comuni
- **Carta multilingua**: Mostra le tue allergie in 8 lingue diverse
- **Download lingue aggiuntive**: Scarica traduzioni per altre lingue tramite LibreTranslate
- **Privacy-first**: Tutti i dati salvati localmente sul dispositivo
- **Offline-ready**: Funziona completamente offline dopo il download delle lingue

### Lingue Supportate

**Lingue integrate (sempre disponibili):**
- Italiano (IT)
- English (EN)
- Español (ES)
- Deutsch (DE)
- Français (FR)

**Lingue scaricabili** (oltre 15 lingue tra cui):
- 中文 Cinese
- 日本語 Giapponese
- 한국어 Coreano
- العربية Arabo
- Русский Russo
- e molte altre...

### Allergeni Supportati
Latte, Uova, Pesce, Crostacei, Arachidi, Soia, Noci, Grano, Sedano, Senape, Sesamo, Solfiti, Lupini, Molluschi

## Tecnologie Utilizzate

- **Framework**: React Native + Expo Router
- **UI**: React Native Paper (Material Design)
- **Storage**: AsyncStorage (dati locali)
- **Traduzioni**: i18n-js + LibreTranslate API
- **Analytics**: Firebase Analytics (anonimi)
- **TypeScript**: Type-safe development

## Struttura Progetto

```
allergiapp/
├── app/                      # Screens (Expo Router)
│   ├── index.tsx            # Home screen
│   ├── add-allergy.tsx      # Selezione allergie
│   ├── card.tsx             # Carta multilingua
│   ├── settings.tsx         # Impostazioni
│   └── legal.tsx            # Privacy Policy & Terms
├── constants/               # Configurazioni e dati statici
│   ├── allergens.ts         # Lista allergeni
│   ├── cardTranslations.ts  # Traduzioni carta
│   ├── legalContent.ts      # Documenti legali
│   └── theme.ts             # Tema app
├── utils/                   # Utilities
│   ├── analytics.ts         # Firebase Analytics wrapper
│   ├── i18n.ts              # Internazionalizzazione
│   ├── storage.ts           # AsyncStorage wrapper
│   ├── translationService.ts # Download traduzioni
│   └── AppContext.tsx       # Context globale
├── locales/                 # File traduzioni UI
│   ├── it.json
│   ├── en.json
│   ├── es.json
│   ├── de.json
│   └── fr.json
└── types/                   # TypeScript types
    └── index.ts
```

## Setup Sviluppo

### Prerequisiti
- Node.js (v18+)
- npm o yarn
- Expo CLI
- Account Firebase (per analytics)

### Installazione

```bash
# Clone repository
git clone [url-repo]
cd allergiapp

# Installa dipendenze
npm install

# Avvia in development (Expo Go)
npx expo start
```

### Configurazione Firebase (opzionale)

Per abilitare Firebase Analytics in produzione:

1. Crea progetto su [Firebase Console](https://console.firebase.google.com/)
2. Scarica file di configurazione:
   - Android: `google-services.json` (nella root)
   - iOS: `GoogleService-Info.plist` (nella root)
3. Build nativa:
   ```bash
   npx expo prebuild
   npx expo run:ios
   # oppure
   npx expo run:android
   ```

**Nota**: In Expo Go, Firebase usa un mock (dati non inviati).

Vedi [FIREBASE_SETUP.md](FIREBASE_SETUP.md) per dettagli completi.

## Build per Produzione

### Expo Application Services (EAS)

```bash
# Installa EAS CLI
npm install -g eas-cli

# Login
eas login

# Configura progetto
eas build:configure

# Build per iOS
eas build --platform ios

# Build per Android
eas build --platform android

# Submit agli store
eas submit --platform ios
eas submit --platform android
```

### Build Locale

```bash
# iOS
npx expo prebuild
cd ios
pod install
npx expo run:ios --configuration Release

# Android
npx expo prebuild
npx expo run:android --variant release
```

## Privacy e GDPR

L'app è completamente conforme al GDPR:

- **Dati locali**: Allergie e preferenze salvate solo sul dispositivo
- **Analytics anonimi**: Solo statistiche aggregate tramite Firebase (paese, tipo dispositivo, funzioni usate)
- **Zero dati personali**: Nessuna raccolta di nome, email, o dati identificativi
- **Traduzioni**: Download da LibreTranslate senza invio dati personali

I documenti legali sono accessibili in-app in `/legal`:
- Privacy Policy (IT/EN)
- Terms of Service (IT/EN)

Vedi [LEGAL_SETUP_GUIDE.md](LEGAL_SETUP_GUIDE.md) per dettagli.

## Analytics

L'app traccia eventi anonimi per migliorare l'esperienza:

**Eventi tracciati:**
- Aggiunta/rimozione allergie
- Download/cancellazione lingue
- Visualizzazione carta
- Cambio lingua app/carta

Vedi [README_ANALYTICS.md](README_ANALYTICS.md) per lista completa eventi.

## Testing

```bash
# Type checking
npx tsc --noEmit

# Lint (se configurato)
npm run lint

# Test web build
npm run web
```

## Risoluzione Problemi

### Firebase non funziona in Expo Go
Normale! Firebase Analytics funziona solo in build native. In Expo Go usa un mock.

### Download lingue fallisce
Controlla connessione internet. LibreTranslate richiede connessione attiva.

### App si blocca all'avvio
Cancella cache: `npx expo start --clear`

## Licenza

Copyright © 2026 [Inserisci nome]

**DISCLAIMER**: Questa app NON è un dispositivo medico e non sostituisce il parere medico. Gli sviluppatori non sono responsabili per reazioni allergiche o danni derivanti dall'uso dell'app.

## Contatti

Per supporto o segnalazioni: [Inserisci email]

---

## Next Steps

- [ ] Aggiungere test automatici
- [ ] Implementare form demografico opzionale
- [ ] Aggiungere più allergeni
- [ ] Supportare più servizi di traduzione
- [ ] Implementare consent banner analytics
