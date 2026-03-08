import { Modal, Pressable, Image, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

interface ImageFullscreenModalProps {
  visible: boolean;
  imageUrl?: string | null;
  onClose: () => void;
  /** Optional overlay content (e.g. dish name/description) */
  children?: ReactNode;
  /** Placeholder content when no image */
  placeholder?: ReactNode;
  overlayStyle?: ViewStyle;
}

export default function ImageFullscreenModal({
  visible,
  imageUrl,
  onClose,
  children,
  placeholder,
  overlayStyle,
}: ImageFullscreenModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={[styles.overlay, overlayStyle]} onPress={onClose}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        ) : placeholder ?? null}
        {children}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: '80%',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
