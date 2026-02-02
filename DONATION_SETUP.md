# 🌐 Configurazione Link Supporto

## Link attuale

Il pulsante "Visita il sito" nell'app apre la pagina di supporto sul sito web:
`https://allergiapp.com/support`

## Configurazione

Il link è definito in `constants/config.ts`:

```typescript
export const APP_CONFIG = {
  SUPPORT_LINK: 'https://allergiapp.com/support',
  // ... resto del file
};
```

## 📍 Dove appare il pulsante

Il pulsante "Visita il sito" appare nella schermata **"Perché è gratuita?"** in fondo alla storia.

## 🎨 Personalizzazione

### Traduzioni del pulsante

Le traduzioni sono nei file `locales/*.json` con la chiave `aboutStory.supportProject`:
- **IT**: "Scopri di più"
- **EN**: "Learn more"
- **ES**: "Descubre más"
- **DE**: "Mehr erfahren"
- **FR**: "En savoir plus"
