'use client';

// Replica fedele della scheda ristorante dell'app (light theme).
// Token e misure da constants/theme.ts e componenti restaurants/* dell'app:
// nome 20/700 #333, chip radius 14 bordo #E0E0E0, pill cucina radius 20,
// banner compat #E8F5E9/#2E7D32, pill ambra #FFF8E1/#8D6E00, stelle #F5A623.
// Recensioni e rating sono DATI DI ESEMPIO; piatti e link arrivano dalla bozza.
import { useI18n } from '@/lib/i18n';
import { allergenName } from '@/lib/allergens';
import type { ShowcaseDraft } from '@/lib/draft';

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
  chevronRight: <path d="M9 6l6 6-6 6" />,
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

export default function SchedaPreview({ draft }: { draft: ShowcaseDraft }) {
  const { d, locale } = useI18n();
  const venueName = draft.venueName.trim() || d.editor.venueNamePlaceholder;

  const links = (['booking', 'delivery', 'menu', 'website'] as const)
    .filter((kind) => draft.links[kind].trim() !== '')
    .map((kind) => ({
      kind,
      label: {
        booking: d.editor.linkBooking,
        delivery: d.editor.linkDelivery,
        menu: d.editor.linkMenu,
        website: d.editor.linkWebsite,
      }[kind],
    }));

  return (
    <div style={{ fontFamily: SYSTEM_FONT, backgroundColor: '#FFFFFF' }}>
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

      {/* Indirizzo + prezzo (dati di esempio) */}
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

        {/* Link del partner (DALLA BOZZA) */}
        {links.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 12px' }}>
            {links.map(({ kind, label }) => (
              <span
                key={kind}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 14,
                  border: '1px solid #E0E0E0', backgroundColor: '#FFFFFF', padding: '4px 10px',
                }}
              >
                <Icon size={14} color="#4CAF50">{LINK_ICONS[kind]}</Icon>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#333333' }}>{label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Menù del ristoratore (DALLA BOZZA) */}
      <div style={{ padding: '12px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#333333' }}>
            {d.preview.menuTitle}
            {draft.dishes.length > 0 ? ` (${draft.dishes.length})` : ''}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#999999', marginTop: 2 }}>
          {d.preview.declaredBy} · {d.preview.updatedToday}
        </div>

        {/* Disclaimer contaminazione: sempre visibile */}
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

        {draft.dishes.length === 0 ? (
          <div
            style={{
              border: '1.5px dashed #E0E0E0', borderRadius: 10, padding: '18px 12px',
              marginTop: 8, textAlign: 'center', fontSize: 13, color: '#999999',
            }}
          >
            {d.preview.menuEmptyPlaceholder}
          </div>
        ) : (
          draft.dishes.map((dish, i) => (
            <div
              key={dish.id}
              style={{
                padding: '10px 0',
                borderTop: i > 0 ? '1px solid #E5E5E5' : 'none',
                marginTop: i === 0 ? 6 : 0,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333333' }}>{dish.name}</div>
              {dish.description.trim() !== '' && (
                <div style={{ fontSize: 13, color: '#666666', lineHeight: '18px', marginTop: 2 }}>
                  {dish.description}
                </div>
              )}
              {dish.allergens.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: '#999999' }}>{d.preview.contains}</span>
                  {dish.allergens.map((code) => (
                    <span
                      key={code}
                      style={{
                        borderRadius: 12, backgroundColor: '#FFF8E1', border: '1px solid #FFE082',
                        padding: '2px 8px', fontSize: 11, fontWeight: 500, color: '#8D6E00',
                      }}
                    >
                      {allergenName(code, locale)}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, fontStyle: 'italic', color: '#999999', marginTop: 6 }}>
                  {d.preview.noAllergensDeclared}
                </div>
              )}
            </div>
          ))
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
  );
}
