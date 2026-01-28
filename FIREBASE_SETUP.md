# Configurazione Firebase Analytics per AllergiApp

Questa guida ti spiega come configurare Firebase Analytics per raccogliere dati analitici senza richiedere login agli utenti.

## Prerequisiti

- Account Google/Firebase
- Progetto Firebase creato su [Firebase Console](https://console.firebase.google.com/)

## Passi per la configurazione

### 1. Crea un progetto Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Clicca su "Aggiungi progetto" o "Add project"
3. Inserisci il nome del progetto (es. "AllergiApp")
4. Disabilita Google Analytics se non necessario (o abilitalo per ulteriori statistiche)
5. Clicca su "Crea progetto"

### 2. Configura l'app per Android

1. Nella console Firebase, clicca sull'icona Android
2. Inserisci il package name: `com.allergiapp` (deve corrispondere a quello in `app.json`)
3. Scarica il file `google-services.json`
4. Posiziona il file nella root del progetto: `/google-services.json`
5. **IMPORTANTE**: Aggiungi `google-services.json` al file `.gitignore` per non condividerlo pubblicamente

### 3. Configura l'app per iOS

1. Nella console Firebase, clicca sull'icona iOS
2. Inserisci il bundle ID: `com.allergiapp` (deve corrispondere a quello in `app.json`)
3. Scarica il file `GoogleService-Info.plist`
4. Posiziona il file nella root del progetto: `/GoogleService-Info.plist`
5. **IMPORTANTE**: Aggiungi `GoogleService-Info.plist` al file `.gitignore` per non condividerlo pubblicamente

### 4. Configura .gitignore

Aggiungi queste righe al tuo `.gitignore`:

```
# Firebase
google-services.json
GoogleService-Info.plist
```

### 5. Build del progetto con EAS

Se usi EAS Build, assicurati che i file `google-services.json` e `GoogleService-Info.plist` siano presenti localmente durante il build.

Per EAS Build, puoi usare i secrets:

```bash
# Android
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json

# iOS
eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
```

E configura `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "credentialsSource": "local"
      },
      "ios": {
        "credentialsSource": "local"
      }
    }
  }
}
```

### 6. Test locale

#### Development con Expo Go (senza Firebase)

L'app è configurata per funzionare in **Expo Go** durante lo sviluppo. Firebase Analytics sarà disabilitato e vedrai un messaggio in console:

```
[Analytics] Firebase non disponibile (probabilmente Expo Go), usando mock
```

Gli eventi analytics semplicemente non verranno inviati, ma l'app funzionerà normalmente.

#### Test con Firebase (build nativo richiesto)

Per testare Firebase Analytics, devi fare un **build nativo**:

```bash
# Android
npx expo prebuild --platform android
npx expo run:android

# iOS
npx expo prebuild --platform ios
npx expo run:ios
```

Vedrai in console:
```
[Analytics] Firebase Analytics disponibile
```

**NOTA**: Firebase Analytics richiede moduli nativi e **non funziona in Expo Go**.

## Eventi Analytics tracciati

L'app traccia automaticamente i seguenti eventi:

### Eventi Allergie
- `allergy_added` - Quando un'allergia viene aggiunta
- `allergy_removed` - Quando un'allergia viene rimossa
- `allergies_saved` - Quando le allergie vengono salvate

### Eventi Lingue
- `language_downloaded` - Quando una lingua viene scaricata
- `language_deleted` - Quando una lingua viene eliminata
- `app_language_changed` - Quando la lingua dell'app viene cambiata
- `card_language_changed` - Quando la lingua della card viene cambiata

### Eventi Card
- `card_viewed` - Quando la card viene visualizzata
- `card_language_toggled` - Quando l'utente cambia lingua nella card

### Eventi App
- `app_opened` - Quando l'app viene aperta
- `data_cleared` - Quando i dati vengono cancellati

## Proprietà Analytics automatiche

Firebase raccoglie automaticamente:
- **Paese**: dalla posizione IP
- **Città**: approssimativa dalla posizione IP
- **Lingua dispositivo**: dalla configurazione del dispositivo
- **Tipo dispositivo**: iOS/Android, modello, versione OS
- **Versione app**
- **Session duration**
- **Retention**

## Proprietà custom opzionali

Se vuoi raccogliere dati demografici (età, sesso), puoi usare:

```typescript
import { Analytics } from './utils/analytics';

// Esempio: durante onboarding opzionale
Analytics.setDemographics(
  '25-34', // age range
  'female', // gender
  'IT' // country (ISO code)
);
```

## Privacy e GDPR

- ✅ I dati raccolti sono anonimi e aggregati
- ✅ Nessun dato personale identificabile (PII) viene tracciato
- ✅ Conforme al GDPR per analytics anonime
- ⚠️ Aggiungi una privacy policy nell'app che spiega quali dati raccogli
- ⚠️ Considera di aggiungere un opt-out nelle impostazioni

## Visualizzare i dati

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il tuo progetto
3. Vai su "Analytics" > "Dashboard"
4. Vai su "Analytics" > "Events" per vedere gli eventi custom

**NOTA**: I dati analytics possono richiedere 24-48 ore per apparire nella console Firebase.

## Troubleshooting

### Gli eventi non appaiono nella console

1. Verifica che i file di configurazione siano corretti
2. Assicurati di usare un build reale (non Expo Go)
3. Aspetta almeno 24 ore
4. Controlla i log dell'app per errori Firebase

### Build fallisce

- Verifica che i file `google-services.json` e `GoogleService-Info.plist` siano nella root del progetto
- Verifica che il package name/bundle ID corrisponda a quello configurato su Firebase
- Pulisci la cache: `npx expo prebuild --clean`

## Risorse

- [Firebase Analytics Docs](https://firebase.google.com/docs/analytics)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
