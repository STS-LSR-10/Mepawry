// lib/photo.ts — Browser-side photo helpers (shrink before upload, remember edit rights)

/** Shrinks a picked photo (phones give 5–10 MB) to a ~1000px JPEG data URL the API accepts. */
export async function photoToDataUrl(file: File): Promise<string> {
  const { default: imageCompression } = await import('browser-image-compression')
  const small = await imageCompression(file, { maxSizeMB: 0.4, maxWidthOrHeight: 1000, fileType: 'image/jpeg', useWebWorker: true })
  return imageCompression.getDataUrlFromFile(small)
}

// shortcut: edit token kept in this browser only; the emailed magic link should carry it once email is wired up
const key = (petId: string) => `pm-edit:${petId}`
export const saveEditToken = (petId: string, token: string) => { try { localStorage.setItem(key(petId), token) } catch {} }
export const getEditToken = (petId: string) => { try { return localStorage.getItem(key(petId)) } catch { return null } }
