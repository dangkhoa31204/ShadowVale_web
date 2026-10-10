import { isDemoMode } from '../../config/environment';
import { storageService } from '../../services/storage/storageService';
import { validateEvidenceFile } from './reportValidation';
import type { EvidenceImage } from './types';

let database: Promise<IDBDatabase> | undefined;
function evidenceDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('shadowvale_review_evidence', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(new Error('Image storage is unavailable.')); };
    request.onblocked = () => { database = undefined; reject(new Error('Close older ShadowVale tabs and try again.')); };
  });
  return database;
}
async function storeImage(id: string, file: Blob) {
  const db = await evidenceDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('images', 'readwrite');
    transaction.objectStore('images').put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Could not store the evidence image.'));
    transaction.onabort = () => reject(new Error('Image storage is full or unavailable.'));
  });
}
export const evidenceService = {
  upload: async (draftId: string, file: File): Promise<EvidenceImage> => {
    const error = validateEvidenceFile(file);
    if (error) throw new Error(error);
    // Decode before accepting the file so a renamed non-image never becomes evidence.
    const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This file cannot be opened as an image.'); });
    bitmap.close();

    const image = { id: isDemoMode ? crypto.randomUUID() : storageService.getUser()!.id + ':' + draftId + ':' + crypto.randomUUID(), file_name: file.name, media_type: file.type, size_bytes: file.size };
    await storeImage(image.id, file);
    return image;
  },
  load: async (image: EvidenceImage): Promise<Blob> => {
    if (!isDemoMode && !image.id.startsWith(storageService.getUser()?.id + ':')) throw new Error('This image belongs to another local account.');
    const db = await evidenceDatabase();
    return new Promise<Blob>((resolve, reject) => {
      const request = db.transaction('images').objectStore('images').get(image.id);
      request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('Evidence image unavailable in this browser.'));
      request.onerror = () => reject(new Error('Could not load the evidence image.'));
    });
  },
};
