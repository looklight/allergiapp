import { supabase } from './supabase';

export type AnnouncementLang = 'it' | 'en' | 'fr' | 'de' | 'es';

export interface Announcement {
  id: string;
  title: Partial<Record<AnnouncementLang, string>>;
  body: Partial<Record<AnnouncementLang, string>>;
  image_url: string | null;
  button_label: Partial<Record<AnnouncementLang, string>> | null;
  button_action: 'share' | 'url' | null;
  button_url: string | null;
  share_text: Partial<Record<AnnouncementLang, string>> | null;
  is_active: boolean;
  created_at: string;
}

export function resolveText(
  translations: Partial<Record<string, string>>,
  lang: string
): string {
  return (
    translations[lang] ??
    translations['en'] ??
    translations['it'] ??
    Object.values(translations).find(v => !!v) ??
    ''
  );
}

export async function fetchActiveAnnouncement(): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Announcement;
}

export async function trackAnnouncementView(id: string): Promise<void> {
  await supabase.rpc('track_announcement_view', { announcement_id: id });
}

export async function trackAnnouncementClick(id: string): Promise<void> {
  await supabase.rpc('track_announcement_click', { announcement_id: id });
}
