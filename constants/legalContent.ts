/**
 * Contenuto completo dei documenti legali
 * Questi documenti sono mostrati nella schermata /legal
 */

export interface LegalDocument {
  privacy: string;
  terms: string;
}

export const LEGAL_CONTENT: Record<'it' | 'en', LegalDocument> = {
  it: {
    privacy: `# Privacy Policy

## Raccolta dati

### Dati locali (sul tuo dispositivo)
Le tue allergie e preferenze lingua sono salvate solo sul tuo dispositivo. Non vengono mai inviate a nessun server.

### Dati analytics anonimi
Raccogliamo solo statistiche anonime di utilizzo tramite Google Firebase Analytics per migliorare l'app:
- Paese approssimativo
- Tipo di dispositivo
- Funzioni utilizzate

Zero dati personali: non raccogliamo nome, email, indirizzo o qualsiasi dato che ti identifichi.

### Traduzioni
Le traduzioni vengono scaricate da servizi esterni. Nessun dato personale viene inviato.

## I tuoi diritti
- Disinstalla l'app → cancelli tutti i dati locali
- Impostazioni → Reset → cancelli tutto

## Base giuridica
Legittimo interesse a migliorare l'app (dati completamente anonimi).

---

*Conforme al GDPR (Regolamento UE 2016/679)*`,

    terms: `# Termini di Servizio

## Cos'è AllergiApp
App gratuita per comunicare allergie alimentari in diverse lingue.

NON è un dispositivo medico. NON sostituisce il parere medico.

## DISCLAIMER MEDICO

### L'app NON garantisce:
- Completezza o accuratezza delle traduzioni
- Che il cibo sia completamente privo di tracce di allergeni
- Corretta comprensione da parte del personale

### In caso di allergie gravi:
- Porta sempre i farmaci prescritti
- Informa SEMPRE il personale verbalmente
- Non affidarti solo a questa app

## Esclusione di Responsabilità
L'app è fornita "COSÌ COM'È" senza garanzie.

Gli sviluppatori NON sono responsabili per:
- Reazioni allergiche
- Danni di qualsiasi tipo
- Errori o malfunzionamenti

L'utente si assume ogni responsabilità nell'uso dell'app.

## Uso consentito
- Uso personale: ✓
- Uso commerciale senza permesso: ✗
- Modifica/reverse engineering: ✗

---

Usando l'app accetti questi termini e il disclaimer medico.`
  },

  en: {
    privacy: `# Privacy Policy

## Data Collection

### Local data (on your device)
Your allergies and language preferences are saved only on your device. Never sent to any server.

### Anonymous analytics
We collect only anonymous usage statistics via Google Firebase Analytics to improve the app:
- Approximate country
- Device type
- Features used

Zero personal data: we don't collect name, email, address, or anything that identifies you.

### Translations
Translations are downloaded from external services. No personal data is sent.

## Your Rights
- Uninstall the app → delete all local data
- Settings → Reset → delete everything

## Legal Basis
Legitimate interest to improve the app (completely anonymous data).

---

*Complies with GDPR (EU Regulation 2016/679)*`,

    terms: `# Terms of Service

## What is AllergiApp
Free app to communicate food allergies in different languages.

NOT a medical device. Does NOT replace medical advice.

## MEDICAL DISCLAIMER

### The app does NOT guarantee:
- Completeness or accuracy of translations
- That food is completely free from traces of allergens
- Correct understanding by staff

### In case of severe allergies:
- Always carry prescribed medications
- ALWAYS inform staff verbally
- Don't rely only on this app

## Disclaimer of Liability
The app is provided "AS IS" without warranties.

Developers are NOT liable for:
- Allergic reactions
- Any type of damage
- Errors or malfunctions

The user assumes all responsibility for using the app.

## Permitted Use
- Personal use: ✓
- Commercial use without permission: ✗
- Modification/reverse engineering: ✗

---

By using the app you accept these terms and the medical disclaimer.`
  }
};
