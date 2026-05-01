'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'announcements';
const PRIMARY = '#4CAF50';

const SUPPORTED_LANGS = [
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'es', label: 'ES', name: 'Español' },
] as const;

type LangCode = 'it' | 'en' | 'fr' | 'de' | 'es';

interface Announcement {
  id: string;
  title: Partial<Record<LangCode, string>>;
  body: Partial<Record<LangCode, string>>;
  image_url: string | null;
  button_label: Partial<Record<LangCode, string>> | null;
  button_action: 'share' | 'url' | null;
  button_url: string | null;
  share_text: Partial<Record<LangCode, string>> | null;
  is_active: boolean;
  view_count: number;
  button_click_count: number;
  created_at: string;
}

const EMPTY_FORM = {
  title: {} as Partial<Record<LangCode, string>>,
  body: {} as Partial<Record<LangCode, string>>,
  button_label: {} as Partial<Record<LangCode, string>>,
  share_text: {} as Partial<Record<LangCode, string>>,
  button_action: '' as '' | 'share' | 'url',
  button_url: '',
};

function resolveText(translations: Partial<Record<string, string>>, lang: string): string {
  return translations[lang] ?? translations['en'] ?? translations['it'] ?? Object.values(translations).find(v => !!v) ?? '';
}

function extractStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

async function deleteAnnouncementImage(imageUrl: string): Promise<void> {
  const path = extractStoragePath(imageUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('[announcements] Errore eliminazione immagine:', error.message);
}

function PopupPreview({
  title,
  body,
  imageUrl,
  buttonLabel,
  activeLangs,
  previewLang,
  onPreviewLangChange,
}: {
  title: Partial<Record<LangCode, string>>;
  body: Partial<Record<LangCode, string>>;
  imageUrl: string | null;
  buttonLabel: Partial<Record<LangCode, string>>;
  activeLangs: Set<LangCode>;
  previewLang: LangCode;
  onPreviewLangChange: (lang: LangCode) => void;
}) {
  const resolvedTitle = resolveText(title, previewLang);
  const resolvedBody = resolveText(body, previewLang);
  const resolvedButtonLabel = resolveText(buttonLabel, previewLang);
  const isEmpty = !resolvedTitle && !resolvedBody;

  return (
    <div className="sticky top-6">
      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Anteprima popup</p>

      {/* Switcher lingua preview */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {SUPPORTED_LANGS.filter(l => activeLangs.has(l.code)).map(lang => (
          <button
            key={lang.code}
            onClick={() => onPreviewLangChange(lang.code)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              previewLang === lang.code
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Schermo telefono */}
      <div
        className="rounded-[2rem] overflow-hidden border-4 border-gray-800 shadow-xl mx-auto"
        style={{ width: 260, background: '#1a1a2e' }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-16 h-1.5 bg-gray-700 rounded-full" />
        </div>

        <div
          className="relative flex items-center justify-center px-3 py-6"
          style={{ minHeight: 420, background: 'rgba(0,0,0,0.55)' }}
        >
          {isEmpty ? (
            <p className="text-white/40 text-xs text-center px-4">
              Inizia a scrivere per vedere l&apos;anteprima
            </p>
          ) : (
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: '#fff' }}
            >
              <div style={{ height: 4, background: PRIMARY }} />

              <div className="absolute top-2 right-3" style={{ fontSize: 16, color: '#666', zIndex: 1 }}>
                ✕
              </div>

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full object-contain"
                  style={{ maxHeight: 110 }}
                />
              )}

              <div className={`px-5 pb-5 flex flex-col items-center ${imageUrl ? 'pt-3' : 'pt-5'}`}>
                {resolvedTitle && (
                  <p className="font-bold text-center mb-2 leading-snug" style={{ fontSize: 14, color: '#333333' }}>
                    {resolvedTitle}
                  </p>
                )}
                {resolvedBody && (
                  <p className="text-center mb-4 leading-relaxed" style={{ fontSize: 11, color: '#666666' }}>
                    {resolvedBody}
                  </p>
                )}
                <div className="w-full flex flex-col gap-1.5">
                  {resolvedButtonLabel && (
                    <button
                      className="w-full py-2 rounded-xl text-white font-semibold"
                      style={{ fontSize: 12, background: PRIMARY }}
                    >
                      {resolvedButtonLabel}
                    </button>
                  )}
                  <button
                    className="w-full py-1.5 rounded-xl font-medium"
                    style={{
                      fontSize: 11,
                      color: resolvedButtonLabel ? '#666666' : '#fff',
                      background: resolvedButtonLabel ? 'transparent' : PRIMARY,
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center py-2" style={{ background: '#1a1a2e' }}>
          <div className="w-20 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeLangs, setActiveLangs] = useState<Set<LangCode>>(new Set<LangCode>());
  const [previewLang, setPreviewLang] = useState<LangCode>('it');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements((data ?? []) as Announcement[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleLang = (code: LangCode) => {
    setActiveLangs(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        setForm(f => {
          const title = { ...f.title };
          const body = { ...f.body };
          const button_label = { ...f.button_label };
          const share_text = { ...f.share_text };
          delete title[code];
          delete body[code];
          delete button_label[code];
          delete share_text[code];
          return { ...f, title, body, button_label, share_text };
        });
        if (previewLang === code) setPreviewLang('it');
      } else {
        next.add(code);
        setPreviewLang(code);
      }
      return next;
    });
  };

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    setRemoveImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    const langs = new Set<LangCode>(['it']);
    (Object.keys(a.title) as LangCode[]).forEach(l => langs.add(l));
    (Object.keys(a.body) as LangCode[]).forEach(l => langs.add(l));
    setActiveLangs(langs);
    setPreviewLang('it');
    setForm({
      title: { ...a.title },
      body: { ...a.body },
      button_label: a.button_label ? { ...a.button_label } : {},
      share_text: a.share_text ? { ...a.share_text } : {},
      button_action: a.button_action ?? '',
      button_url: a.button_url ?? '',
    });
    setCurrentImageUrl(a.image_url);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActiveLangs(new Set<LangCode>());
    setPreviewLang('it');
    setPublishNow(false);
    resetImageState();
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise(resolve => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 1200;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }) : file);
        }, 'image/webp', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0] ?? null;
    if (!raw) return;
    const compressed = await compressImage(raw);
    setImageFile(compressed);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(compressed));
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File, announcementId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${announcementId}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) { console.warn('[announcements] Errore upload immagine:', error.message); return null; }
    const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path).data;
    return `${publicUrl}?t=${Date.now()}`;
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);

    // Filtra traduzioni vuote
    const title: Partial<Record<LangCode, string>> = {};
    const body: Partial<Record<LangCode, string>> = {};
    for (const lang of activeLangs) {
      if (form.title[lang]?.trim()) title[lang] = form.title[lang]!.trim();
      if (form.body[lang]?.trim()) body[lang] = form.body[lang]!.trim();
    }

    const button_label: Partial<Record<LangCode, string>> = {};
    const share_text: Partial<Record<LangCode, string>> = {};
    for (const lang of activeLangs) {
      if (form.button_label[lang]?.trim()) button_label[lang] = form.button_label[lang]!.trim();
      if (form.share_text[lang]?.trim()) share_text[lang] = form.share_text[lang]!.trim();
    }

    const textPayload = {
      title,
      body,
      button_label: Object.keys(button_label).length ? button_label : null,
      button_action: form.button_action || null,
      button_url: (form.button_action === 'url' || form.button_action === 'share') ? (form.button_url.trim() || null) : null,
      share_text: form.button_action === 'share' && Object.keys(share_text).length ? share_text : null,
    };

    if (editingId) {
      let newImageUrl = currentImageUrl;
      if (removeImage && currentImageUrl) { await deleteAnnouncementImage(currentImageUrl); newImageUrl = null; }
      if (imageFile) { if (currentImageUrl && !removeImage) await deleteAnnouncementImage(currentImageUrl); newImageUrl = await uploadImage(imageFile, editingId); }
      await supabase.from('announcements').update({ ...textPayload, image_url: newImageUrl }).eq('id', editingId);
    } else {
      if (publishNow) await supabase.from('announcements').update({ is_active: false }).eq('is_active', true);
      const { data: inserted, error } = await supabase
        .from('announcements')
        .insert({ ...textPayload, is_active: publishNow, image_url: null })
        .select('id')
        .single();
      if (!error && inserted && imageFile) {
        const uploadedUrl = await uploadImage(imageFile, inserted.id);
        if (uploadedUrl) {
          const { error: updateError } = await supabase.from('announcements').update({ image_url: uploadedUrl }).eq('id', inserted.id);
          if (updateError) await deleteAnnouncementImage(uploadedUrl);
        }
      }
    }

    await load();
    cancelEdit();
    setSaving(false);
  };

  const toggleActive = async (a: Announcement) => {
    if (!a.is_active) await supabase.from('announcements').update({ is_active: false }).neq('id', a.id);
    await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id);
    load();
  };

  const remove = async (a: Announcement) => {
    if (!confirm('Eliminare questo annuncio?')) return;
    if (a.image_url) await deleteAnnouncementImage(a.image_url);
    await supabase.from('announcements').delete().eq('id', a.id);
    load();
  };

  const hasImage = imagePreview || (currentImageUrl && !removeImage);
  const previewImageUrl = imagePreview ?? (removeImage ? null : currentImageUrl) ?? null;
  const canSave = [...activeLangs].some(l => form.title[l]?.trim() && form.body[l]?.trim());

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Annunci in-app</h1>
      <p className="text-sm text-gray-500 mb-6">Crea popup che vengono mostrati agli utenti all&apos;apertura dell&apos;app. Solo un annuncio può essere attivo alla volta.</p>

      <div className="flex gap-6 mb-6 items-start">

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-5 flex-1 min-w-0">
          <h2 className="font-semibold mb-4 text-sm text-gray-700">
            {editingId ? 'Modifica annuncio' : 'Nuovo annuncio'}
          </h2>

          {/* Selettori lingua */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Lingue</p>
            <div className="flex gap-2 flex-wrap">
              {SUPPORTED_LANGS.map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLang(lang.code)}
                  title={lang.name}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeLangs.has(lang.code)
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Immagine */}
          <div className="flex items-start gap-2 mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 flex-shrink-0 pt-2">Immagine</span>
            <div>
              {hasImage ? (
                <div className="flex items-start gap-3">
                  <img src={imagePreview ?? currentImageUrl ?? ''} alt="" className="w-32 h-20 object-cover rounded border" />
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white border rounded text-xs hover:bg-gray-50">Sostituisci</button>
                    <button type="button" onClick={handleRemoveImage} className="px-3 py-1.5 text-red-600 border border-red-200 rounded text-xs hover:bg-red-50">Rimuovi</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 bg-white border rounded text-sm text-gray-500 hover:bg-gray-50">Scegli immagine...</button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
          </div>

          {/* Sezione per ogni lingua attiva */}
          <div className="grid gap-3 mb-3">
            {SUPPORTED_LANGS.filter(l => activeLangs.has(l.code)).map(lang => (
              <div
                key={lang.code}
                className="border rounded-lg p-3 grid gap-2"
                onClick={() => setPreviewLang(lang.code)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 flex-shrink-0">{lang.name}</span>
                  <input
                    value={form.title[lang.code] ?? ''}
                    onChange={e => setForm(f => ({ ...f, title: { ...f.title, [lang.code]: e.target.value } }))}
                    onFocus={() => setPreviewLang(lang.code)}
                    className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="Titolo"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-16 flex-shrink-0" />
                  <textarea
                    value={form.body[lang.code] ?? ''}
                    onChange={e => setForm(f => ({ ...f, body: { ...f.body, [lang.code]: e.target.value } }))}
                    onFocus={() => setPreviewLang(lang.code)}
                    rows={2}
                    className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                    placeholder="Messaggio"
                  />
                </div>
                {form.button_action && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 flex-shrink-0">Pulsante</span>
                    <input
                      value={form.button_label[lang.code] ?? ''}
                      onChange={e => setForm(f => ({ ...f, button_label: { ...f.button_label, [lang.code]: e.target.value } }))}
                      onFocus={() => setPreviewLang(lang.code)}
                      className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                      placeholder={form.button_action === 'share' ? 'es. Condividi' : 'es. Scopri di più'}
                    />
                  </div>
                )}
                {form.button_action === 'share' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 flex-shrink-0">Testo</span>
                    <input
                      value={form.share_text[lang.code] ?? ''}
                      onChange={e => setForm(f => ({ ...f, share_text: { ...f.share_text, [lang.code]: e.target.value } }))}
                      onFocus={() => setPreviewLang(lang.code)}
                      className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                      placeholder="es. Prova AllergiApp!"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Azione pulsante — globale */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Azione pulsante</label>
              <select
                value={form.button_action}
                onChange={e => setForm(f => ({ ...f, button_action: e.target.value as '' | 'share' | 'url' }))}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="">Nessuna</option>
                <option value="share">Condividi (nativo)</option>
                <option value="url">Apri link</option>
              </select>
            </div>
            {(form.button_action === 'url' || form.button_action === 'share') && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {form.button_action === 'share' ? 'Link da condividere (opzionale)' : 'URL'}
                </label>
                <input value={form.button_url} onChange={e => setForm(f => ({ ...f, button_url: e.target.value }))} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="https://..." />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button onClick={save} disabled={saving || !canSave} className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-40">
              {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea annuncio'}
            </button>
            {!editingId && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={e => setPublishNow(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-600">Pubblica subito</span>
              </label>
            )}
            {editingId && (
              <button onClick={cancelEdit} className="px-4 py-2 bg-white border rounded text-sm hover:bg-gray-50">Annulla</button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="w-72 flex-shrink-0">
          <PopupPreview
            title={form.title}
            body={form.body}
            imageUrl={previewImageUrl}
            buttonLabel={form.button_label}
            activeLangs={activeLangs}
            previewLang={previewLang}
            onPreviewLangChange={setPreviewLang}
          />
        </div>
      </div>

      {/* Lista annunci */}
      {loading ? (
        <p className="text-gray-500 text-sm">Caricamento...</p>
      ) : announcements.length === 0 ? (
        <p className="text-gray-400 text-sm">Nessun annuncio creato.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Annuncio</th>
                <th className="px-4 py-3 font-medium">Lingue</th>
                <th className="px-4 py-3 font-medium">Pulsante</th>
                <th className="px-4 py-3 font-medium">Statistiche</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(a => (
                <tr key={a.id} className={`border-t hover:bg-gray-50 ${editingId === a.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.image_url && <img src={a.image_url} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />}
                      <div>
                        <div className="font-medium">{a.title.it ?? Object.values(a.title)[0]}</div>
                        <div className="text-gray-400 text-xs truncate max-w-xs">{a.body.it ?? Object.values(a.body)[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(Object.keys(a.title) as LangCode[]).map(l => (
                        <span key={l} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium uppercase">{l}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.button_label ? <>{resolveText(a.button_label, 'it')}<span className="text-xs text-gray-400 ml-1">({a.button_action})</span></> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>{a.view_count} visualizzazioni</div>
                      {a.button_click_count > 0 && (
                        <div className="text-green-700 font-medium">
                          {a.button_click_count} click
                          {a.view_count > 0 && (
                            <span className="text-gray-400 font-normal ml-1">
                              ({Math.round((a.button_click_count / a.view_count) * 100)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(a)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${a.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {a.is_active ? 'Attivo' : 'Inattivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.created_at).toLocaleDateString('it-IT')}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => startEdit(a)} className="text-blue-600 hover:underline text-xs">Modifica</button>
                      <button onClick={() => remove(a)} className="text-red-600 hover:underline text-xs">Elimina</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
