import { Modal } from 'react-native';
import ReportReviewPanel, { type ReviewReportReason } from './ReportReviewPanel';

export type { ReviewReportReason };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReviewReportReason) => Promise<void>;
};

/**
 * Wrapper <Modal> attorno a ReportReviewPanel, per il percorso "lista
 * recensioni" (dentro il bottom sheet inline, nessun altro <Modal> aperto).
 * Dalla galleria foto il panel viene invece renderizzato come overlay interno
 * al Modal della galleria, per non impilare due <Modal> nativi.
 */
export default function ReportReviewModal({ visible, onClose, onSubmit }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {visible && <ReportReviewPanel onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}
