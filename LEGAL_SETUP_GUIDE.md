# Guida Setup Documenti Legali - AllergiApp

## ✅ Cosa è stato fatto

1. **✅ Privacy Policy** creata (IT + EN)
   - Versione minimale GDPR-compliant
   - Per app con solo analytics anonimi
   - File: `PRIVACY_POLICY.md` e `PRIVACY_POLICY_EN.md`

2. **✅ Terms of Service** creati (IT + EN)
   - Disclaimer responsabilità
   - Limitazione liability
   - File: `TERMS_OF_SERVICE.md` e `TERMS_OF_SERVICE_EN.md`

3. **✅ Disclaimer medico rafforzato**
   - Aggiornato in tutte le 5 lingue dell'app
   - Testo più forte e protettivo
   - File: `locales/*.json`

---

## 📋 Cosa devi fare TU

### 1. **Completa i documenti con le tue informazioni**

Nei file `PRIVACY_POLICY*.md` e `TERMS_OF_SERVICE*.md`, sostituisci:

```markdown
[Inserisci tua email]         → esempio: info@allergiapp.com
[Inserisci nome sviluppatore] → esempio: Mario Rossi o NomeTuaAzienda
[Inserisci città]              → esempio: Roma (per foro competente)
```

**Cerca nel file**: `[Inserisci` e sostituisci con i tuoi dati.

### 2. **Pubblica Privacy Policy online**

**OBBLIGATORIO** per App Store e Google Play.

**Opzioni:**

#### A) **Sito web tuo** (consigliato)
- Crea pagina sul tuo sito: `https://tuosito.com/allergiapp/privacy`
- Copia il contenuto di `PRIVACY_POLICY.md`
- Aggiungi link Terms of Service

#### B) **GitHub Pages** (gratuito)
```bash
# Se il tuo repo è pubblico
# Crea file privacy.html nel repo
# Attiva GitHub Pages nelle settings
# Link diventa: https://tuousername.github.io/allergiapp/privacy
```

#### C) **Servizi gratuiti**
- [Termly](https://termly.io) - Free tier
- [FreePrivacyPolicy](https://www.freeprivacypolicy.com/)
- Google Sites (gratuito)

**Importante**: Serve URL pubblico HTTPS accessibile da chiunque.

### 3. **Aggiungi URL documenti nel file constants/legalUrls.ts**

**File da modificare**: `constants/legalUrls.ts`

Sostituisci gli URL placeholder con i tuoi URL reali:

```typescript
export const LEGAL_URLS = {
  privacyPolicy: {
    it: 'https://TUOSITO.com/allergiapp/privacy',    // ← Cambia qui
    en: 'https://TUOSITO.com/allergiapp/privacy-en', // ← Cambia qui
    // ... altre lingue
  },
  termsOfService: {
    it: 'https://TUOSITO.com/allergiapp/terms',      // ← Cambia qui
    en: 'https://TUOSITO.com/allergiapp/terms-en',   // ← Cambia qui
    // ... altre lingue
  },
};
```

**Funziona così**:
- Quando l'utente clicca "Leggi documento completo" nell'app
- Si apre il browser con il documento completo
- Se URL è ancora placeholder, mostra messaggio "Non ancora pubblicato"

### 4. **Aggiungi link privacy policy in app.json**

```json
{
  "expo": {
    "name": "AllergiApp",
    "privacyPolicy": "https://tuosito.com/allergiapp/privacy",
    ...
  }
}
```

### 5. **Implementa schermata accettazione (opzionale ma raccomandato)**

Al primo avvio dell'app, mostra:
- Testo disclaimer medico
- Checkbox "Ho letto e accetto Privacy Policy e Termini di Servizio"
- Link a documenti completi
- Salva accettazione in AsyncStorage

**Esempio UI:**
```
┌────────────────────────────────────┐
│   Benvenuto in AllergiApp!         │
│                                     │
│   Prima di iniziare, leggi:        │
│                                     │
│   ⚠️ [Disclaimer Medico]           │
│   📄 [Privacy Policy]              │
│   📜 [Termini di Servizio]         │
│                                     │
│   ☑️ Ho letto e accetto           │
│                                     │
│   [Continua]                       │
└────────────────────────────────────┘
```

### 6. **Testare i link nell'app**

✅ **GIÀ IMPLEMENTATO!**

Nell'app, vai su:
- **Impostazioni → Privacy** → Clicca "Leggi documento completo"
- **Impostazioni → Disclaimer** → Clicca "Leggi documento completo"

**Prima di pubblicare gli URL:**
- Mostra alert "Non ancora pubblicato"

**Dopo aver aggiornato gli URL in `constants/legalUrls.ts`:**
- Si apre il browser con il documento completo

---

## 🚀 Checklist Pre-Lancio Legale

Prima di pubblicare su store:

- [ ] **Compilati dati personali** nei documenti (email, nome, città)
- [ ] **Privacy Policy pubblicata online** con URL HTTPS
- [ ] **URL aggiunto in app.json**
- [ ] **Disclaimer mostrato in app** (già fatto ✅)
- [ ] **(Opzionale) Schermata accettazione** al primo avvio
- [ ] **(Opzionale) Sezione legale** nelle impostazioni
- [ ] **Verificato marchio "AllergiApp"** non registrato da altri
- [ ] **File Firebase non su repository pubblico**

---

## 📱 Requisiti Store

### Apple App Store
✅ Privacy Policy URL obbligatorio
✅ Dichiarazione dati raccolti nel App Store Connect
✅ Età minima (puoi mettere 4+ se non raccogli dati sensibili)

### Google Play Store
✅ Privacy Policy URL obbligatorio
✅ Data Safety form (dichiari analytics anonimi)
✅ Categoria app: Salute e fitness

---

## 🔒 Consent Banner Analytics (raccomandato)

Anche se i dati sono anonimi, è buona pratica:

### Al primo avvio, mostra:
```
┌────────────────────────────────────┐
│   Aiutaci a migliorare AllergiApp  │
│                                     │
│   Raccogliamo dati anonimi di      │
│   utilizzo per capire come         │
│   migliorare l'app.                │
│                                     │
│   Nessun dato personale viene      │
│   raccolto.                        │
│                                     │
│   [Accetta]    [Rifiuta]          │
└────────────────────────────────────┘
```

### Nelle Impostazioni, aggiungi:
```
Analytics anonime: [ON/OFF]
```

Se l'utente rifiuta, disabilita Firebase Analytics con:
```typescript
await analytics().setAnalyticsCollectionEnabled(false);
```

---

## ⚖️ Consulenza Legale (opzionale)

I documenti creati sono **template generici** basati su best practices.

**Consigliato** (ma non obbligatorio per app piccole):
- Far revisionare da avvocato specializzato in privacy/tech
- Costo: €300-800 per revisione

**Quando serve DAVVERO un avvocato:**
- Se raccogli dati sensibili (es. dati sanitari dettagliati)
- Se l'app ha molti utenti (>10.000)
- Se monetizzi (acquisti in-app, abbonamenti)
- Se operi in USA (serve anche ToS USA-specific)

**Per AllergiApp** (gratuita, analytics anonimi):
- Documenti attuali sono sufficienti
- Puoi lanciarla tranquillamente
- Valuta avvocato se l'app cresce molto

---

## 📞 Contatti e Supporto

Se hai dubbi:
1. Leggi [GDPR.eu](https://gdpr.eu/) per info GDPR
2. Consulta [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
3. Consulta [Google Play Policy](https://play.google.com/about/developer-content-policy/)

---

## ✅ Stato Attuale

**PRONTO PER LANCIO** dal punto di vista legale, dopo che:
1. Compili i dati personali nei documenti
2. Pubblichi Privacy Policy online
3. Aggiungi URL in app.json

**Tempo stimato**: 1-2 ore

---

🎉 **Ottimo lavoro! Sei quasi pronto per il lancio!**
