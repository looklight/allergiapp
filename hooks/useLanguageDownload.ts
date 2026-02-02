import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { DownloadableLanguageCode } from '../types';
import { downloadLanguageTranslations, checkTranslationServiceAvailable, DownloadProgress } from '../utils/translationService';
import { Analytics } from '../utils/analytics';
import i18n from '../utils/i18n';

interface UseLanguageDownloadReturn {
  downloadingLang: DownloadableLanguageCode | null;
  downloadProgress: DownloadProgress | null;
  isDownloading: (langCode: DownloadableLanguageCode) => boolean;
  handleDownloadLanguage: (
    langCode: DownloadableLanguageCode,
    onSuccess: (langCode: DownloadableLanguageCode, data: any) => Promise<void>
  ) => Promise<void>;
  cancelDownload: () => void;
}

/**
 * Hook riutilizzabile per gestire il download di lingue tradotte
 */
export function useLanguageDownload(): UseLanguageDownloadReturn {
  const [downloadingLang, setDownloadingLang] = useState<DownloadableLanguageCode | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);

  // Cleanup: annulla download in corso quando il componente viene smontato
  useEffect(() => {
    return () => {
      downloadAbortRef.current?.abort();
    };
  }, []);

  const isDownloading = (langCode: DownloadableLanguageCode): boolean => {
    return downloadingLang === langCode;
  };

  const cancelDownload = () => {
    downloadAbortRef.current?.abort();
    setDownloadingLang(null);
    setDownloadProgress(null);
  };

  const handleDownloadLanguage = async (
    langCode: DownloadableLanguageCode,
    onSuccess: (langCode: DownloadableLanguageCode, data: any) => Promise<void>
  ): Promise<void> => {
    // Previeni download multipli simultanei
    if (downloadingLang) return;

    // Controlla connettività prima di iniziare
    const isAvailable = await checkTranslationServiceAvailable();
    if (!isAvailable) {
      Alert.alert('', i18n.t('settings.noInternet'));
      return;
    }

    const abortController = new AbortController();
    downloadAbortRef.current = abortController;
    setDownloadingLang(langCode);
    setDownloadProgress(null);

    const startTime = Date.now();
    let success = false;

    try {
      const data = await downloadLanguageTranslations(
        langCode,
        (progress) => {
          setDownloadProgress(progress);
        },
        abortController.signal
      );

      await onSuccess(langCode, data);
      success = true;
    } catch (error) {
      if (error instanceof Error && error.message === 'Download cancelled') {
        Alert.alert('', i18n.t('settings.downloadCancelled'));
      } else {
        Alert.alert('', i18n.t('settings.downloadError'));
      }
    } finally {
      const duration = Date.now() - startTime;
      await Analytics.logLanguageDownloaded(langCode, success, duration);

      downloadAbortRef.current = null;
      setDownloadingLang(null);
      setDownloadProgress(null);
    }
  };

  return {
    downloadingLang,
    downloadProgress,
    isDownloading,
    handleDownloadLanguage,
    cancelDownload,
  };
}
