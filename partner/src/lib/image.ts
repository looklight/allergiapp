// Ridimensiona una foto lato browser prima di salvarla
// (in localStorage ora, su Supabase Storage in futuro: mai originali,
// l'egress è contato).
export function fileToResizedDataUrl(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas non disponibile'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('immagine non leggibile'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('file non leggibile'));
    reader.readAsDataURL(file);
  });
}
