# 🎁 Configurazione Donazioni - Ko-Fi

## Come configurare il tuo link Ko-Fi

### 1. Crea un account Ko-Fi

1. Vai su [ko-fi.com](https://ko-fi.com/)
2. Crea un account gratuito
3. Scegli il tuo username (es. `allergiapp`, `martadimuro`, ecc.)
4. Il tuo link sarà: `https://ko-fi.com/TUOUSERNAME`

### 2. Configura il link nell'app

Apri il file `constants/config.ts` e modifica:

```typescript
export const APP_CONFIG = {
  DONATION_LINK: 'https://ko-fi.com/TUOUSERNAME', // ← Cambia qui
  // ... resto del file
};
```

### 3. Testa il funzionamento

1. Riavvia l'app
2. Vai in **Impostazioni** → **Supporta**
3. Oppure apri **Impostazioni** → **Perché è gratuita?** e scorri fino al pulsante in fondo

Il pulsante aprirà il tuo profilo Ko-Fi nel browser.

## 🎨 Personalizzazione

### Cambiare il colore del pulsante

In `app/about.tsx`, modifica lo style `donationButton`:

```typescript
donationButton: {
  backgroundColor: '#FFDD00', // ← Colore giallo di Ko-Fi
  // Puoi cambiare con: '#FF5F5F' (rosso), '#5E72E4' (blu), ecc.
},
```

### Traduzioni del pulsante

Le traduzioni sono nei file `locales/*.json`:
- **IT**: "Supporta il progetto"
- **EN**: "Support the project"
- **ES**: "Apoya el proyecto"
- **DE**: "Unterstütze das Projekt"
- **FR**: "Soutenir le projet"

Puoi modificarle a piacimento.

## 📍 Dove appare il pulsante

Il pulsante "Supporta il progetto" appare in **2 posizioni**:

1. **Schermata "Perché è gratuita?"** - Pulsante grande in fondo alla storia
2. **Impostazioni** - Nella sezione "Informazioni", sotto "Perché è gratuita?"

## 🔍 Analytics

Quando un utente clicca sul pulsante nelle impostazioni, viene tracciato un evento:
```
donation_clicked (source: settings)
```

Puoi vedere questi eventi in Firebase Analytics.

## ⚠️ Note Importanti

- **Link attuale**: `https://ko-fi.com/allergiapp` è l'account ufficiale di AllergiApp
- **Se vuoi usare il tuo account**, modifica `constants/config.ts` con il tuo username
- Il pulsante funziona solo se l'utente ha un browser installato
