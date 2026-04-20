export type StoredAttachment = {
  id: string;
  agentKey: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: number;
};

const DB_NAME = "oracle-pulse";
const DB_VERSION = 1;
const STORE = "attachments";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(new Error("indexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("agentKey", "agentKey", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function idbPutAttachment(a: StoredAttachment): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("indexedDB put failed"));
    tx.objectStore(STORE).put(a);
  });
  db.close();
}

export async function idbGetAttachments(ids: string[]): Promise<StoredAttachment[]> {
  if (!ids.length) return [];
  const db = await openDb();
  const results: StoredAttachment[] = [];
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("indexedDB get failed"));
    const store = tx.objectStore(STORE);
    for (const id of ids) {
      const r = store.get(id);
      r.onsuccess = () => {
        const v = r.result as StoredAttachment | undefined;
        if (v) results.push(v);
      };
    }
  });
  db.close();
  return results;
}

export async function idbDeleteAttachments(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error("indexedDB delete failed"));
    const store = tx.objectStore(STORE);
    for (const id of ids) store.delete(id);
  });
  db.close();
}

