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

## Titolare del trattamento
AllergiApp — contatto: info@allergiapp.com

## Dati che raccogliamo

### Dati locali (sul tuo dispositivo)
Le tue allergie, restrizioni e preferenze lingua sono salvate solo sul tuo dispositivo. Non vengono inviate a nessun server.

### Account (opzionale)
Se crei un account per recensire o aggiungere ristoranti raccogliamo la tua email, il nickname e i contenuti che pubblichi (recensioni, voti, foto, preferiti). Il nickname può essere anonimo: è l'unico identificativo visibile agli altri utenti. L'email serve solo per accedere e non viene mai mostrata pubblicamente né condivisa. L'app funziona senza account: la card allergeni e le traduzioni non lo richiedono.

### Allergie e restrizioni dietetiche
Se scegli di salvare le tue allergie e restrizioni sul profilo, le usiamo per personalizzare la ricerca dei ristoranti e per associarle alle recensioni che pubblichi. Questo è il cuore della community: chi ha le stesse esigenze trova consigli rilevanti.

Le allergie collegate a ciascuna recensione sono visibili pubblicamente come badge sotto il testo, insieme al tuo nickname (l'email non viene mai mostrata). Restano associate alla recensione anche se in seguito modifichi il profilo, salvo richiesta esplicita di rimozione.

Sono trattate come dati sulla salute (categoria speciale, art. 9 GDPR): la memorizzazione sul profilo richiede consenso esplicito (art. 9.2.a) modificabile dalle impostazioni; la pubblicazione tramite recensioni rende questi dati manifestamente pubblici (art. 9.2.e).

Senza consenso, l'app continua a funzionare e le tue allergie restano solo sul dispositivo per la card.

### Posizione
Se concedi il permesso, usiamo la posizione del dispositivo per mostrarti i ristoranti vicini. La posizione non viene salvata sui nostri server: serve solo per la ricerca in tempo reale.

### Foto
Quando aggiungi un ristorante o pubblichi una recensione puoi allegare foto da galleria o fotocamera. Le foto vengono mostrate insieme al ristorante o alla recensione a cui le alleghi.

### Dati analytics anonimi
Raccogliamo statistiche anonime di utilizzo (paese approssimativo, tipo di dispositivo, funzioni usate) e crash report per migliorare l'app. Nessun dato personale.

### Traduzioni
Le card sono già tradotte in 15 lingue principali e incluse nell'app: usarle non richiede internet né invia dati esterni. Per altre lingue puoi scaricare il pacchetto dal nostro server (solo i testi della card, nessun dato personale). Come riserva, se il nostro server non riesce a fornire la traduzione, l'app può ricorrere a un servizio esterno: vengono inviati solo i nomi degli allergeni, mai dati personali.

## Dove sono conservati i dati
- **Account, recensioni, foto, ristoranti**: hosting cloud in regione UE
- **Analytics e crash report**: Firebase (Google), server in USA — trasferimento basato su Standard Contractual Clauses
- **Traduzioni di fallback**: MyMemory API (solo testo, no dati personali)

## Base giuridica (GDPR)
- **Account e contenuti**: esecuzione del contratto (art. 6.1.b)
- **Allergie e restrizioni sul profilo**: consenso esplicito (art. 9.2.a) — modificabile dalle impostazioni
- **Posizione e foto**: consenso (art. 6.1.a) — modificabile dalle impostazioni del dispositivo
- **Analytics e crash report**: legittimo interesse (art. 6.1.f) — dati anonimi

## Conservazione
- Dati account: finché l'account esiste
- Recensioni e foto: restano visibili anche dopo cancellazione account in forma anonima, salvo richiesta esplicita di rimozione
- Analytics: 14 mesi (default Firebase)

## I tuoi diritti
- **Accesso, rettifica, cancellazione, portabilità**: scrivi a info@allergiapp.com
- **Cancellazione account**: dalle impostazioni dell'app o via email
- **Revoca posizione/foto**: impostazioni del sistema operativo
- **Reclamo**: Garante Privacy (garanteprivacy.it)

## Modifiche
In caso di modifiche sostanziali ti chiederemo di accettare la nuova versione.

---

*Conforme al GDPR (Regolamento UE 2016/679)*`,

    terms: `# Termini di Servizio

## Cos'è AllergiApp
App gratuita per comunicare allergie alimentari in diverse lingue e trovare ristoranti compatibili.

NON è un dispositivo medico. NON sostituisce il parere medico.

## DISCLAIMER MEDICO

### L'app NON garantisce:
- Completezza o accuratezza delle traduzioni
- Che il cibo sia completamente privo di tracce di allergeni
- Corretta comprensione da parte del personale
- Accuratezza delle informazioni sui ristoranti (orari, menu, allergeni serviti)

### In caso di allergie gravi:
- Porta sempre i farmaci prescritti
- Informa SEMPRE il personale verbalmente
- Non affidarti solo a questa app

## Account
- Devi avere almeno 14 anni per creare un account
- Le credenziali sono personali, sei responsabile della loro custodia
- Una sola persona per account

## Contenuti pubblicati dagli utenti

### Cosa puoi pubblicare
Recensioni, voti, foto e informazioni sui ristoranti che frequenti.

### Regole
- Contenuti accurati basati su esperienza personale
- No offese, discriminazioni, spam o contenuti illegali
- No foto di altre persone senza il loro consenso
- No contenuti promozionali o falsi

### Licenza
Pubblicando contenuti ci autorizzi a mostrarli nell'app. Puoi modificarli o rimuoverli in qualsiasi momento.

### Moderazione
Possiamo rimuovere contenuti che violano queste regole e sospendere account, anche senza preavviso in caso di violazioni gravi.

## Recensioni di altri utenti
Le recensioni e i voti pubblicati da altri utenti riflettono la loro opinione personale, non la nostra. Non garantiamo accuratezza o aggiornamento delle informazioni sui ristoranti.

## Esclusione di Responsabilità
L'app è fornita "COSÌ COM'È" senza garanzie.

Gli sviluppatori NON sono responsabili per:
- Reazioni allergiche
- Affidabilità di recensioni o informazioni sui ristoranti pubblicate da utenti
- Danni di qualsiasi tipo
- Errori o malfunzionamenti

L'utente si assume ogni responsabilità nell'uso dell'app.

## Uso consentito
- Uso personale: ✓
- Uso commerciale senza permesso: ✗
- Modifica/reverse engineering: ✗
- Scraping automatizzato: ✗

## Cancellazione account
Puoi cancellare l'account in qualsiasi momento dalle impostazioni o scrivendo a info@allergiapp.com.

## Modifiche
In caso di modifiche sostanziali ti chiederemo di accettare la nuova versione.

## Contatti
info@allergiapp.com

---

Usando l'app accetti questi termini e il disclaimer medico.`
  },

  en: {
    privacy: `# Privacy Policy

## Data Controller
AllergiApp — contact: info@allergiapp.com

## Data we collect

### Local data (on your device)
Your allergies, restrictions, and language preferences are saved only on your device. Not sent to any server.

### Account (optional)
If you create an account to review or add restaurants we collect your email, nickname, and the content you post (reviews, votes, photos, favorites). Your nickname can be anonymous: it's the only identifier visible to other users. Your email is used only for sign-in and is never shown publicly or shared. The app works without an account: the allergen card and translations don't require one.

### Allergies and dietary restrictions
If you choose to save your allergies and restrictions on your profile, we use them to personalize restaurant search and to associate them with the reviews you post. This is the core of the community: people with the same needs find relevant recommendations.

The allergies linked to each review are publicly visible as badges under the review text, alongside your nickname (your email is never shown). They remain attached to the review even if you later change your profile, unless you explicitly request removal.

They are treated as health data (special category, art. 9 GDPR): saving them on your profile requires explicit consent (art. 9.2.a) changeable from settings; publishing them through reviews makes this data manifestly public (art. 9.2.e).

Without consent, the app keeps working and your allergies stay only on-device for the card.

### Location
If you grant permission, we use the device location to show you nearby restaurants. Location is not stored on our servers: it's only used for real-time search.

### Photos
When you add a restaurant or post a review you can attach photos from gallery or camera. Photos are shown alongside the restaurant or review you attach them to.

### Anonymous analytics
We collect anonymous usage statistics (approximate country, device type, features used) and crash reports to improve the app. No personal data.

### Translations
Cards are pre-translated in 15 main languages bundled with the app: using them requires no internet and sends no external data. For other languages you can download the language pack from our server (card text only, no personal data). As a backup, if our server can't provide the translation, the app may use an external service: only allergen names are sent, never personal data.

## Where data is stored
- **Account, reviews, photos, restaurants**: cloud hosting in EU region
- **Analytics and crash reports**: Firebase (Google), servers in USA — transfer based on Standard Contractual Clauses
- **Fallback translations**: MyMemory API (text only, no personal data)

## Legal basis (GDPR)
- **Account and content**: contract performance (art. 6.1.b)
- **Allergies and restrictions on profile**: explicit consent (art. 9.2.a) — changeable from settings
- **Location and photos**: consent (art. 6.1.a) — changeable from device settings
- **Analytics and crash reports**: legitimate interest (art. 6.1.f) — anonymous data

## Retention
- Account data: while the account exists
- Reviews and photos: remain visible after account deletion in anonymous form, unless explicit removal is requested
- Analytics: 14 months (Firebase default)

## Your rights
- **Access, rectification, deletion, portability**: email info@allergiapp.com
- **Account deletion**: from app settings or via email
- **Revoke location/photos**: operating system settings
- **Complaint**: your local data protection authority

## Changes
For substantial changes we'll ask you to accept the new version.

---

*Complies with GDPR (EU Regulation 2016/679)*`,

    terms: `# Terms of Service

## What is AllergiApp
Free app to communicate food allergies in different languages and find compatible restaurants.

NOT a medical device. Does NOT replace medical advice.

## MEDICAL DISCLAIMER

### The app does NOT guarantee:
- Completeness or accuracy of translations
- That food is completely free from traces of allergens
- Correct understanding by staff
- Accuracy of restaurant information (hours, menu, allergens served)

### In case of severe allergies:
- Always carry prescribed medications
- ALWAYS inform staff verbally
- Don't rely only on this app

## Account
- You must be at least 14 years old to create an account
- Credentials are personal, you are responsible for keeping them safe
- One person per account

## User-generated content

### What you can post
Reviews, votes, photos, and restaurant information based on your personal experience.

### Rules
- Accurate content based on personal experience
- No offensive, discriminatory, spammy, or illegal content
- No photos of other people without their consent
- No promotional or false content

### License
By posting content, you allow us to show it in the app. You can edit or remove it at any time.

### Moderation
We can remove content that violates these rules and suspend accounts, even without notice in case of serious violations.

## Reviews from other users
Reviews and votes posted by other users reflect their personal opinion, not ours. We don't guarantee the accuracy or freshness of restaurant information.

## Disclaimer of Liability
The app is provided "AS IS" without warranties.

Developers are NOT liable for:
- Allergic reactions
- Reliability of reviews or restaurant information posted by users
- Any type of damage
- Errors or malfunctions

The user assumes all responsibility for using the app.

## Permitted Use
- Personal use: ✓
- Commercial use without permission: ✗
- Modification/reverse engineering: ✗
- Automated scraping: ✗

## Account deletion
You can delete your account at any time from settings or by emailing info@allergiapp.com.

## Changes
For substantial changes we'll ask you to accept the new version.

## Contact
info@allergiapp.com

---

By using the app you accept these terms and the medical disclaimer.`
  }
};
