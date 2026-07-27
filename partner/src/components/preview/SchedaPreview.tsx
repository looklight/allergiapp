'use client';

// Replica fedele della scheda ristorante dell'app (light theme).
// Token e misure da constants/theme.ts e componenti restaurants/* dell'app:
// nome 20/700 #333, chip radius 14 bordo #E0E0E0, pill cucina radius 20,
// banner compat #E8F5E9/#2E7D32, pill ambra #FFF8E1/#8D6E00, stelle #F5A623,
// carosello foto 110×110 con badge overlay rgba(255,255,255,0.85).
// Recensioni e rating sono DATI DI ESEMPIO; piatti e link arrivano dalla bozza.
// viewerNeeds = esigenze del visitatore simulato (per la compatibilità piatti).
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { allergenName } from '@/lib/allergens';
import { DISH_CATEGORIES, categoryName } from '@/lib/categories';
import { dietName, dietNeedName } from '@/lib/diets';
import { deliveryProviderName } from '@/lib/providers';
import type { DeliveryLink, DraftDish, ShowcaseDraft } from '@/lib/draft';

const SYSTEM_FONT =
  '-apple-system, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';

function Icon({
  size,
  color,
  children,
  fill = false,
}: {
  size: number;
  color: string;
  children: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? color : 'none'}
      stroke={fill ? 'none' : color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

const paths = {
  bookmark: <path d="M6 3h12v18l-6-4.2L6 21z" />,
  pin: (
    <>
      <path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  pinFilled: (
    <path d="M12 22s-7.5-6-7.5-11.5a7.5 7.5 0 1115 0C19.5 16 12 22 12 22zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
  ),
  shieldCheck: (
    <>
      <path d="M12 2l8 3v6c0 5-3.5 8.6-8 11-4.5-2.4-8-6-8-11V5z" />
      <path d="M8.5 12l2.3 2.3L15.5 9.5" />
    </>
  ),
  shieldFilled: (
    <path d="M12 2l8 3v6c0 5-3.5 8.6-8 11-4.5-2.4-8-6-8-11V5l8-3zm-1.2 13.3l5-5-1.4-1.4-3.6 3.6-1.7-1.7-1.4 1.4 3.1 3.1z" />
  ),
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  check: <path d="M20 6L9 17l-5-5" />,
  heart: (
    <path d="M12 20.5l-1.4-1.3C5.4 14.6 2 11.6 2 8.9 2 6.2 4.1 4 6.8 4c1.5 0 3 .7 3.9 1.8h2.6C14.2 4.7 15.7 4 17.2 4 19.9 4 22 6.2 22 8.9c0 2.7-3.4 5.7-8.6 10.3z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="M6 17l4-8h5l3 8M10 9h4M13 9l2-3h2" />
    </>
  ),
  bookOpen: (
    <>
      <path d="M2 5h7a3 3 0 013 3v13a3 3 0 00-3-3H2z" />
      <path d="M22 5h-7a3 3 0 00-3 3v13a3 3 0 013-3h7z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.9l7.6-4.5M8.2 13.1l7.6 4.5" />
    </>
  ),
};

function Star({ size, variant }: { size: number; variant: 'full' | 'half' | 'empty' }) {
  const starPath = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z';
  if (variant === 'half') {
    return (
      <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#D0D0D0">
          <path d={starPath} />
        </svg>
        <span style={{ position: 'absolute', inset: 0, width: size / 2, overflow: 'hidden' }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="#F5A623">
            <path d={starPath} />
          </svg>
        </span>
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={variant === 'full' ? '#F5A623' : '#D0D0D0'}>
      <path d={starPath} />
    </svg>
  );
}

function Stars({ size, value }: { size: number; value: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} variant={value >= i ? 'full' : value >= i - 0.5 ? 'half' : 'empty'} />
      ))}
    </span>
  );
}

function Separator() {
  return <div style={{ height: 8, backgroundColor: '#F5F5F5' }} />;
}

const LINK_ICONS: Record<string, React.ReactNode> = {
  booking: paths.calendar,
  delivery: paths.bike,
  menu: paths.bookOpen,
  website: paths.globe,
};

// Pill link colorate (tinta + colore pieno, stile Material) per
// differenziarle dai chip neutri della scheda e tra loro.
const LINK_COLORS: Record<string, { bg: string; fg: string }> = {
  booking: { bg: '#E3F2FD', fg: '#1976D2' },
  delivery: { bg: '#FFF3E0', fg: '#E65100' },
  menu: { bg: '#E8F5E9', fg: '#2E7D32' },
  website: { bg: '#F3E5F5', fg: '#7B1FA2' },
};

function deliveryDisplayName(del: DeliveryLink, fallback: string): string {
  if (del.provider === 'other') return del.label.trim() || fallback;
  return deliveryProviderName(del.provider) ?? (del.label.trim() || fallback);
}

export interface ViewerNeeds {
  allergens: string[];
  diets: string[];
}

export const NO_VIEWER: ViewerNeeds = { allergens: [], diets: [] };

// Compatibilità del piatto col visitatore simulato. null = nessun
// visitatore. Livelli: amber = contiene almeno un allergene del
// visitatore; gray = allergeni ok ma qualche sua dieta non è indicata
// (assenza di tag ≠ incompatibilità, resta neutro); green = tutto ok.
function dishCompat(dish: DraftDish, viewer: ViewerNeeds) {
  if (viewer.allergens.length === 0 && viewer.diets.length === 0) return null;
  const contained = viewer.allergens.filter((code) => dish.allergens.includes(code));
  const missingDiets = viewer.diets.filter((code) => !dish.dietTags.includes(code));
  const level: 'green' | 'gray' | 'amber' =
    contained.length > 0 ? 'amber' : missingDiets.length > 0 ? 'gray' : 'green';
  return { level, contained, missingDiets };
}

function DishPhoto({
  dish,
  size,
  radius,
  dimmed = false, // piatto non compatibile col visitatore → foto in trasparenza
}: {
  dish: DraftDish;
  size: { w: number; h: number };
  radius: number;
  dimmed?: boolean;
}) {
  if (dish.photoUrl) {
    return (
      <img
        src={dish.photoUrl}
        alt=""
        style={{
          width: size.w, height: size.h, borderRadius: radius,
          objectFit: 'cover', display: 'block', flexShrink: 0,
          opacity: dimmed ? 0.4 : 1,
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: size.w, height: size.h, borderRadius: radius, backgroundColor: '#F5F5F5',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <Icon size={Math.min(22, size.h / 3)} color="#BBBBBB">{paths.bookOpen}</Icon>
    </span>
  );
}

// Badge overlay stile carosello foto app: bg rgba bianca, shield colorata.
const BADGE_COLORS = { green: '#2E7D32', amber: '#E6A700', gray: '#999999' };

function CompatBadge({ level }: { level: 'green' | 'gray' | 'amber' }) {
  return (
    <span
      style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 2,
        borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.85)', padding: '2px 5px',
        display: 'inline-flex', alignItems: 'center',
      }}
    >
      <Icon size={12} color={BADGE_COLORS[level]} fill>
        {paths.shieldFilled}
      </Icon>
    </span>
  );
}

// Pill stile ReviewCard: verde #E8F5E9/#2E7D32, ambra #FFF8E1/#8D6E00,
// grigia #F5F5F5/#999 (pattern uncovered del banner compatibilità).
function GreenPill({ text, check = true }: { text: string; check?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 12,
        backgroundColor: '#E8F5E9', padding: '3px 8px',
      }}
    >
      {check && <Icon size={11} color="#2E7D32">{paths.check}</Icon>}
      <span style={{ fontSize: 11, fontWeight: 500, color: '#2E7D32' }}>{text}</span>
    </span>
  );
}

function AmberPill({ text, bordered = false }: { text: string; bordered?: boolean }) {
  return (
    <span
      style={{
        borderRadius: 12, backgroundColor: '#FFF8E1', padding: bordered ? '2px 8px' : '3px 8px',
        border: bordered ? '1px solid #FFE082' : 'none',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, color: '#8D6E00' }}>{text}</span>
    </span>
  );
}

function GrayPill({ text }: { text: string }) {
  return (
    <span
      style={{
        borderRadius: 12, backgroundColor: '#F5F5F5', border: '1px solid #E0E0E0',
        padding: '2px 8px',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, color: '#999999' }}>{text}</span>
    </span>
  );
}

// Le pill sotto un piatto. Senza visitatore simulato: "Contiene: …" +
// tag compatibilità dichiarati. Con visitatore: ambra se contiene le sue
// allergie, verde "Senza …" se no, e per ogni sua dieta verde (dichiarata)
// o grigia "non indicato".
function DishPills({ dish, viewer }: { dish: DraftDish; viewer: ViewerNeeds }) {
  const { d, locale } = useI18n();
  const compat = dishCompat(dish, viewer);

  if (!compat) {
    return (
      <>
        {dish.allergens.length > 0 ? (
          <>
            <span style={{ fontSize: 11, color: '#999999' }}>{d.preview.contains}</span>
            {dish.allergens.map((code) => (
              <AmberPill key={code} text={allergenName(code, locale)} bordered />
            ))}
          </>
        ) : (
          <span style={{ fontSize: 11, fontStyle: 'italic', color: '#999999' }}>
            {d.preview.noAllergensDeclared}
          </span>
        )}
        {dish.dietTags.map((code) => (
          <GreenPill key={code} text={dietName(code, locale)} />
        ))}
      </>
    );
  }

  return (
    <>
      {compat.contained.length > 0 ? (
        <AmberPill
          text={`${d.preview.containsPrefix} ${compat.contained
            .map((code) => allergenName(code, locale).toLowerCase())
            .join(', ')}`}
        />
      ) : (
        viewer.allergens.length > 0 && (
          <GreenPill
            text={`${d.preview.withoutPrefix} ${viewer.allergens
              .map((code) => allergenName(code, locale).toLowerCase())
              .join(', ')}`}
          />
        )
      )}
      {viewer.diets.map((code) =>
        // col visitatore attivo si parla della SUA esigenza → nome breve
        dish.dietTags.includes(code) ? (
          <GreenPill key={code} text={dietNeedName(code, locale)} />
        ) : (
          <GrayPill key={code} text={`${dietNeedName(code, locale)}: ${d.preview.notDeclared}`} />
        )
      )}
    </>
  );
}

function MenuAttribution() {
  const { d } = useI18n();
  return (
    <>
      <div style={{ fontSize: 11, color: '#999999', marginTop: 2 }}>
        {d.preview.declaredBy} · {d.preview.updatedToday}
      </div>
      <div
        style={{
          borderRadius: 8, border: '1px solid #FFE082', backgroundColor: '#FFF8E1',
          padding: '8px 10px', margin: '8px 0 4px',
        }}
      >
        <span style={{ fontSize: 11, fontStyle: 'italic', color: '#8D6E00', lineHeight: '15px', display: 'block' }}>
          {d.preview.disclaimer}
        </span>
      </div>
    </>
  );
}

// Schermata menù a pieno schermo (la "sezione dedicata" dell'app):
// piatti raggruppati per categoria, foto grandi, pill compatibilità.
function MenuScreen({
  draft,
  viewer,
  onBack,
}: {
  draft: ShowcaseDraft;
  viewer: ViewerNeeds;
  onBack: () => void;
}) {
  const { d, locale } = useI18n();

  // Senza categoria per primi (senza intestazione), poi le categorie
  const groups = [
    { cat: null, dishes: draft.dishes.filter((dish) => dish.category === '') },
    ...DISH_CATEGORIES.map((cat) => ({
      cat: cat as (typeof DISH_CATEGORIES)[number] | null,
      dishes: draft.dishes.filter((dish) => dish.category === cat.code),
    })),
  ].filter((g) => g.dishes.length > 0);

  return (
    <div style={{ fontFamily: SYSTEM_FONT, backgroundColor: '#FFFFFF' }}>
      {/* AppHeader: titolo centrato 20/600, icone 24 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', padding: '8px 12px 8px',
          borderBottom: '1px solid #E0E0E0',
        }}
      >
        <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'inline-flex' }}>
          <Icon size={24} color="#333333">{paths.chevronLeft}</Icon>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600, color: '#333333' }}>
          {d.preview.menuTitle}
        </span>
        <span style={{ width: 32 }} />
      </div>

      <div style={{ padding: '10px 16px 24px' }}>
        <MenuAttribution />

        {groups.map(({ cat, dishes }) => (
          <div key={cat?.code ?? 'none'} style={{ marginTop: 14 }}>
            {cat && (
              <div style={{ fontSize: 16, fontWeight: 600, color: '#333333', marginBottom: 8 }}>
                {categoryName(cat.code, locale)}
              </div>
            )}
            {dishes.map((dish, i) => (
              <div
                key={dish.id}
                style={{
                  display: 'flex', gap: 10, padding: '10px 0',
                  borderTop: i > 0 ? '1px solid #E5E5E5' : 'none',
                }}
              >
                {/* Foto piatti TONDE: le distingue dalle foto quadrate della community */}
                <DishPhoto
                  dish={dish}
                  size={{ w: 72, h: 72 }}
                  radius={36}
                  dimmed={dishCompat(dish, viewer)?.level === 'amber'}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333333' }}>{dish.name}</div>
                  {dish.description.trim() !== '' && (
                    <div style={{ fontSize: 13, color: '#666666', lineHeight: '18px', marginTop: 2 }}>
                      {dish.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <DishPills dish={dish} viewer={viewer} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SchedaPreview({
  draft,
  viewer = NO_VIEWER,
}: {
  draft: ShowcaseDraft;
  viewer?: ViewerNeeds;
}) {
  const { d, locale } = useI18n();
  const [screen, setScreen] = useState<'scheda' | 'menu'>('scheda');
  const [sheet, setSheet] = useState<'delivery' | null>(null);
  const venueName = draft.venueName.trim() || d.editor.venueNamePlaceholder;

  if (screen === 'menu') {
    return (
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <MenuScreen draft={draft} viewer={viewer} onBack={() => setScreen('scheda')} />
      </div>
    );
  }

  const deliveries = draft.links.deliveries.filter((del) => del.url.trim() !== '');

  const links: { kind: string; label: string }[] = [];
  if (draft.links.booking.trim() !== '') links.push({ kind: 'booking', label: d.editor.linkBooking });
  // un solo bottone Delivery: con più servizi si apre il bottom sheet
  if (deliveries.length > 0) links.push({ kind: 'delivery', label: d.editor.linkDelivery });
  // un solo bottone Menù: l'app sceglie il link nella lingua dell'utente
  if (draft.links.menus.some((m) => m.url.trim() !== '')) links.push({ kind: 'menu', label: d.editor.linkMenu });
  if (draft.links.website.trim() !== '') links.push({ kind: 'website', label: d.editor.linkWebsite });

  return (
    <div style={{ position: 'relative', height: '100%' }}>
    <div style={{ height: '100%', overflowY: 'auto', fontFamily: SYSTEM_FONT, backgroundColor: '#FFFFFF' }}>
      {/* Header: nome + azioni */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 16px 8px' }}>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 700, lineHeight: '26px', color: '#333333' }}>
          {venueName}
        </span>
        <span style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
          <Icon size={22} color="#666666">{paths.bookmark}</Icon>
          <Icon size={22} color="#666666">{paths.share}</Icon>
        </span>
      </div>

      {/* Rating + Indicazioni (dati di esempio) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 4px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          <Stars size={16} value={4.5} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#666666' }}>4,5</span>
          <span style={{ fontSize: 13, color: '#666666' }}>{d.preview.reviewsCount}</span>
        </span>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 14,
            border: '1px solid #E0E0E0', backgroundColor: '#FFFFFF', padding: '4px 10px',
          }}
        >
          <Icon size={15} color="#EA4335" fill>{paths.pinFilled}</Icon>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#333333' }}>{d.preview.directions}</span>
        </span>
      </div>

      {/* Indirizzo (dati di esempio) */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Icon size={16} color="#666666">{paths.pin}</Icon>
          <span style={{ fontSize: 14, color: '#666666' }}>{d.preview.address}</span>
        </div>

        {/* Pill cucina (esempio) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 20,
              border: '1.5px solid #E0E0E0', backgroundColor: '#FFFFFF', padding: '3px 4px 3px 10px',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: '#333333' }}>{d.preview.cuisine}</span>
            <span
              style={{
                minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#F5F5F5',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: '#666666', padding: '0 4px',
              }}
            >
              12
            </span>
          </span>
        </div>

        {/* Banner compatibilità (esempio) */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8,
            backgroundColor: '#E8F5E9', padding: '8px 10px', margin: '4px 0 8px',
          }}
        >
          <Icon size={16} color="#2E7D32">{paths.shieldCheck}</Icon>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#2E7D32' }}>
            {d.preview.compat}
          </span>
          <Icon size={18} color="#2E7D32">{paths.chevronRight}</Icon>
        </div>

        {/* Link del partner (DALLA BOZZA). Nell'anteprima si mostrano
            tutte (wrap); nell'app vera saranno una riga singola
            scorrevole come le pill "Salvato in" (CollectionPills). */}
        {links.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 12px' }}>
            {links.map(({ kind, label }) => {
              const interactive = kind === 'delivery' && deliveries.length > 1;
              const pillStyle: React.CSSProperties = {
                display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 14,
                backgroundColor: LINK_COLORS[kind].bg, padding: '5px 11px',
                flexShrink: 0, whiteSpace: 'nowrap', border: 'none',
              };
              const content = (
                <>
                  <Icon size={14} color={LINK_COLORS[kind].fg}>{LINK_ICONS[kind]}</Icon>
                  <span style={{ fontSize: 12, fontWeight: 500, color: LINK_COLORS[kind].fg }}>{label}</span>
                </>
              );
              return interactive ? (
                <button key={kind} onClick={() => setSheet('delivery')} style={{ ...pillStyle, cursor: 'pointer' }}>
                  {content}
                </button>
              ) : (
                <span key={kind} style={pillStyle}>{content}</span>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Menù del ristoratore (DALLA BOZZA): carosello orizzontale */}
      <div style={{ padding: '12px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#333333' }}>
            {d.preview.menuTitle}
            {draft.dishes.length > 0 ? ` (${draft.dishes.length})` : ''}
          </span>
          {draft.dishes.length > 0 && (
            <button
              onClick={() => setScreen('menu')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#4CAF50' }}>{d.preview.seeAll}</span>
              <Icon size={16} color="#4CAF50">{paths.chevronRight}</Icon>
            </button>
          )}
        </div>
        <div style={{ padding: '0 16px' }}>
          <MenuAttribution />
        </div>

        {draft.dishes.length === 0 ? (
          <div style={{ padding: '0 16px' }}>
            <div
              style={{
                border: '1.5px dashed #E0E0E0', borderRadius: 10, padding: '18px 12px',
                marginTop: 8, textAlign: 'center', fontSize: 13, color: '#999999',
              }}
            >
              {d.preview.menuEmptyPlaceholder}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px 4px',
            }}
          >
            {draft.dishes.map((dish) => {
              const compat = dishCompat(dish, viewer);
              return (
                <button
                  key={dish.id}
                  onClick={() => setScreen('menu')}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    width: 110, flexShrink: 0, textAlign: 'left',
                  }}
                >
                  <span style={{ position: 'relative', display: 'block' }}>
                    {/* Foto piatti TONDE: le distingue dalle foto quadrate della community */}
                    <DishPhoto dish={dish} size={{ w: 110, h: 110 }} radius={55} dimmed={compat?.level === 'amber'} />
                    {compat && <CompatBadge level={compat.level} />}
                  </span>
                  <span
                    style={{
                      display: 'block', fontSize: 12, fontWeight: 600, color: '#333333',
                      lineHeight: '15px', marginTop: 5, textAlign: 'center',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dish.name}
                  </span>
                  {dish.category !== '' && (
                    <span style={{ display: 'block', fontSize: 11, color: '#999999', marginTop: 1, textAlign: 'center' }}>
                      {categoryName(dish.category, locale)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Recensioni (dati di esempio) */}
      <div style={{ padding: '16px 16px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#333333', marginBottom: 12 }}>
          {d.preview.reviewsTitle} {d.preview.reviewsCount.replace('(', '').replace(')', '')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 600, color: '#2E7D32', flexShrink: 0,
            }}
          >
            {d.preview.sampleReviewerName.charAt(0)}
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#333333' }}>
              {d.preview.sampleReviewerName}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: '#666666' }}>
              {d.preview.sampleReviewDate}
            </span>
          </span>
          <Stars size={14} value={5} />
        </div>

        <div style={{ fontSize: 14, color: '#333333', lineHeight: '20px', marginTop: 6 }}>
          {d.preview.sampleReviewText}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 12,
              backgroundColor: '#E8F5E9', padding: '3px 8px',
            }}
          >
            <Icon size={11} color="#2E7D32">{paths.check}</Icon>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#2E7D32' }}>{d.preview.samplePillGreen}</span>
          </span>
          <span style={{ borderRadius: 12, backgroundColor: '#FFF8E1', padding: '3px 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#8D6E00' }}>{d.preview.samplePillAmber}</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
          <Icon size={16} color="#666666">{paths.heart}</Icon>
          <span style={{ fontSize: 13, color: '#666666' }}>3</span>
        </div>
      </div>
    </div>

      {/* Bottom sheet scelta delivery (mock, pattern sheet dell'app) */}
      {sheet === 'delivery' && (
        <div
          onClick={() => setSheet(null)}
          style={{
            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16,
              padding: '10px 16px 24px', fontFamily: SYSTEM_FONT,
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333333', marginBottom: 4 }}>
              {d.preview.orderWith}
            </div>
            {deliveries.map((del, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0',
                  borderTop: i > 0 ? '1px solid #E5E5E5' : 'none',
                }}
              >
                <Icon size={18} color="#E65100">{paths.bike}</Icon>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#333333' }}>
                  {deliveryDisplayName(del, d.editor.linkDelivery)}
                </span>
                <Icon size={18} color="#999999">{paths.chevronRight}</Icon>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
