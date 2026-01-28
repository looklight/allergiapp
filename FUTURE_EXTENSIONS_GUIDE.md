# Guida alle Estensioni Future - AllergiApp

Questa guida spiega come estendere AllergiApp con nuove funzionalità. L'app è stata ottimizzata per essere modulare e facilmente estendibile.

## 📁 Struttura File Ottimizzata

```
app/
├── components/               # Componenti riutilizzabili
│   ├── BannerCarousel.tsx    # Carousel con supporto ads
│   ├── DownloadableLanguagesSection.tsx
│   └── LegalDialogs.tsx
├── hooks/                    # Custom hooks
│   └── useLanguageDownload.ts
├── index.tsx                 # Home (696 righe)
├── settings.tsx              # Settings (581 righe) ✅ -34%
├── card.tsx                  # Card view (573 righe)
├── add-allergy.tsx          # Selezione allergie
├── legal.tsx                # Documenti legali
└── _layout.tsx              # Layout root
```

## 🎯 Estensioni Comuni

### 1. Aggiungere Banner Pubblicitari / Referral

Il `BannerCarousel` è pronto per includere pubblicità o link referral.

#### Esempio: Aggiungere un banner referral

```typescript
// In app/index.tsx

import BannerCarousel, { BannerItem } from './components/BannerCarousel';

export default function HomeScreen() {
  // Definisci i tuoi banner ads/referral
  const referralBanners: BannerItem[] = [
    {
      id: 'referral-1',
      type: 'ad',
      icon: '🎁',
      title: 'Prova Booking.com',
      subtitle: 'Ottieni il 10% di sconto sul tuo prossimo viaggio',
      adUrl: 'https://booking.com/ref=YOUR_REFERRAL_CODE',
      adButtonText: 'Scopri di più →',
    },
    {
      id: 'referral-2',
      type: 'ad',
      icon: '✈️',
      title: 'Viaggia sicuro con Airbnb',
      subtitle: 'Ricevi €25 di credito sul primo soggiorno',
      adUrl: 'https://airbnb.com/c/YOUR_REFERRAL',
      adButtonText: 'Registrati ora →',
    },
  ];

  return (
    <View>
      {/* Passa i banner ads al carousel */}
      <BannerCarousel extraBanners={referralBanners} />

      {/* Resto del componente */}
    </View>
  );
}
```

#### Personalizzazione

```typescript
// Cambia intervallo auto-scroll (default: 4000ms)
<BannerCarousel
  extraBanners={referralBanners}
  autoScrollInterval={6000} // 6 secondi
/>

// Banner custom con JSX personalizzato
const customBanner: BannerItem = {
  id: 'custom-1',
  type: 'custom',
  customContent: (
    <View style={{ padding: 20 }}>
      <Image source={require('./assets/promo.png')} />
      <Text>Contenuto personalizzato</Text>
    </View>
  ),
};
```

#### Analytics per Ads

✅ **Le analytics sono già integrate!** Il `BannerCarousel` traccia automaticamente:

- **`banner_viewed`**: Ogni volta che un banner viene visualizzato (solo la prima volta)
- **`ad_impression`**: Impressioni specifiche per gli ads (per calcolare CTR)
- **`banner_clicked`**: Click su qualsiasi banner (info o ad)

**Dati tracciati automaticamente:**
```typescript
// Quando un banner/ad viene visualizzato
banner_viewed: {
  banner_id: string,      // Es: "referral-1"
  banner_type: string,    // "info" | "ad" | "custom"
  banner_title: string,   // Titolo del banner
  timestamp: string
}

// Quando un ad viene visualizzato (in aggiunta a banner_viewed)
ad_impression: {
  ad_id: string,          // ID dell'ad
  ad_url: string,         // URL del referral
  ad_title: string,       // Titolo dell'ad
  timestamp: string
}

// Quando un banner/ad viene cliccato
banner_clicked: {
  banner_id: string,
  banner_type: string,
  banner_title: string,
  ad_url: string,         // URL se è un ad
  timestamp: string
}
```

**Vedere i dati su Firebase:**
1. Apri Firebase Console > Analytics > Events
2. Cerca eventi: `banner_viewed`, `ad_impression`, `banner_clicked`
3. Calcola CTR: `banner_clicked` / `ad_impression` × 100

### 2. Aggiungere Nuove Lingue Scaricabili

Per aggiungere nuove lingue al sistema di download:

#### Step 1: Aggiorna constants/downloadableLanguages.ts

```typescript
export const DOWNLOADABLE_LANGUAGES: DownloadableLanguageInfo[] = [
  // ... lingue esistenti
  {
    code: 'tr',  // Nuova lingua: Turco
    name: 'Turkish',
    nativeName: 'Türkçe',
    flag: '🇹🇷',
    region: 'other',
  },
];
```

#### Step 2: (Opzionale) Aggiungi traduzione del nome

In `constants/languageNames.ts`:

```typescript
export function getLocalizedLanguageName(
  langCode: string,
  currentLang: AppLanguage
): string | undefined {
  const names: Record<string, Record<AppLanguage, string>> = {
    // ... altre lingue
    tr: {
      it: 'Turco',
      en: 'Turkish',
      es: 'Turco',
      de: 'Türkisch',
      fr: 'Turc',
    },
  };
  return names[langCode]?.[currentLang];
}
```

La lingua sarà automaticamente disponibile nella sezione download!

### 3. Aggiungere Nuovi Allergeni

Per aggiungere un nuovo allergene (es. Kiwi):

#### Step 1: Aggiorna types/index.ts

```typescript
export type AllergenId =
  | 'gluten'
  | 'crustaceans'
  // ... altri
  | 'kiwi'; // Nuovo
```

#### Step 2: Aggiorna constants/allergens.ts

```typescript
export const ALLERGENS: Allergen[] = [
  // ... altri allergeni
  {
    id: 'kiwi',
    icon: '🥝',
    translations: {
      it: 'Kiwi',
      en: 'Kiwi',
      fr: 'Kiwi',
      de: 'Kiwi',
      es: 'Kiwi',
      // Aggiungi altre lingue se necessario
    },
  },
];
```

#### Step 3: Aggiorna constants/allergenImages.ts

```typescript
export const ALLERGEN_IMAGES: Record<AllergenId, AllergenImages> = {
  // ... altri
  kiwi: {
    examples: ['🥝', '🍈'],
    description: {
      it: 'Kiwi, frutta kiwi, succo di kiwi',
      en: 'Kiwi, kiwi fruit, kiwi juice',
      // ... altre lingue
    },
  },
};
```

L'allergene sarà automaticamente disponibile nell'app!

### 4. Aggiungere Analytics Personalizzati

Per tracciare nuovi eventi:

#### Step 1: Aggiungi evento in utils/analytics.ts

```typescript
export const Analytics = {
  // ... eventi esistenti

  async logFeatureUsed(featureName: string, details?: Record<string, any>) {
    if (!isFirebaseAvailable) return;
    try {
      await analytics().logEvent('feature_used', {
        feature_name: featureName,
        ...details,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[Analytics] Error logging feature_used:', error);
    }
  },
};
```

#### Step 2: Usa l'evento

```typescript
import { Analytics } from '../utils/analytics';

// Quando l'utente usa la funzione
Analytics.logFeatureUsed('export_allergies', {
  format: 'pdf',
  allergen_count: 5,
});
```

### 5. Aggiungere Nuove Sezioni in Settings

L'app è strutturata per facilitare l'aggiunta di nuove sezioni.

#### Esempio: Aggiungere sezione "Account"

```typescript
// In app/settings.tsx

<ScrollView>
  {/* Sezioni esistenti */}

  <Divider style={styles.sectionDivider} />

  {/* Nuova sezione Account */}
  <View>
    <View style={styles.sectionHeaderRow}>
      <MaterialCommunityIcons name="account" size={22} color={theme.colors.primary} />
      <Text style={styles.sectionHeaderTitle}>Account</Text>
    </View>

    <Pressable
      style={styles.settingRow}
      onPress={() => router.push('/profile')}
    >
      <Text style={styles.settingLabel}>Il tuo profilo</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} />
    </Pressable>
  </View>
</ScrollView>
```

### 6. Aggiungere Export/Import Allergie

Per permettere agli utenti di esportare/importare le proprie allergie:

#### Step 1: Crea funzioni export/import in utils/storage.ts

```typescript
export async function exportAllergies(): Promise<string> {
  const allergens = await getAllergens();
  const data = {
    version: '1.0',
    date: new Date().toISOString(),
    allergens,
  };
  return JSON.stringify(data);
}

export async function importAllergies(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (data.allergens) {
      await saveAllergens(data.allergens);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```

#### Step 2: Aggiungi UI in settings.tsx

```typescript
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const handleExport = async () => {
  const json = await exportAllergies();
  const fileUri = FileSystem.documentDirectory + 'allergie.json';
  await FileSystem.writeAsStringAsync(fileUri, json);
  await Sharing.shareAsync(fileUri);
};
```

## 🎨 Best Practices

### Quando Creare un Nuovo Componente

Crea un componente separato quando:
- **>200 righe**: Il componente supera 200 righe
- **Riutilizzabile**: La logica può essere riutilizzata altrove
- **Singola responsabilità**: Ha una singola funzione chiara
- **Testabile**: Deve essere testato indipendentemente

### Quando Creare un Custom Hook

Crea un hook quando:
- **Logica riutilizzabile**: La stessa logica è usata in più componenti
- **Stato complesso**: Gestisce stato con logica di business
- **Side effects**: Ha useEffect o gestisce API/storage
- **Test isolati**: La logica deve essere testabile separatamente

Esempio: `useLanguageDownload` è usato sia in `index.tsx` che in `settings.tsx`

### Struttura File Raccomandata

```
app/
├── components/          # UI components (< 300 righe)
├── hooks/              # Custom hooks
├── services/           # API calls, external services
├── contexts/           # React contexts (già esiste AppContext)
└── screens/            # File principali (< 700 righe)
```

## 📊 Metriche Attuali (Post-Ottimizzazione)

| File | Righe | Stato |
|------|-------|-------|
| app/settings.tsx | 581 | ✅ Ottimizzato (-34%) |
| app/index.tsx | 696 | ✅ Ottimizzato (-24%) |
| app/card.tsx | 573 | ✅ OK |
| app/components/BannerCarousel.tsx | 324 | ✅ Nuovo |
| app/components/DownloadableLanguagesSection.tsx | 414 | ✅ Nuovo |
| app/components/LegalDialogs.tsx | 58 | ✅ Nuovo |
| app/hooks/useLanguageDownload.ts | 103 | ✅ Nuovo |

**Risultato**: Codice più modulare, manutenibile e pronto per future estensioni!

## 🔍 Testing Nuove Funzionalità

### Test Locali

```bash
# Avvia in development
npx expo start

# Test TypeScript
npx tsc --noEmit

# Build di test
npx expo prebuild
```

### Test Build Nativa (per Firebase Analytics)

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## 📞 Supporto

Per domande o dubbi sulle estensioni, rivedi:
- Questo file (FUTURE_EXTENSIONS_GUIDE.md)
- README.md (panoramica generale)
- README_ANALYTICS.md (eventi analytics)
- FIREBASE_SETUP.md (configurazione Firebase)

---

🎉 **L'app è ora ottimizzata e pronta per future estensioni!**
