import type { Project, Settings } from "./types";
import { projectSchema, settingsSchema } from "./schema";
const DB = "tomi-workshop-v1";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      for (const name of ["projects", "files", "meta"])
        request.result.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(
  name: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode),
      req = action(tx.objectStore(name));
    tx.oncomplete = () => {
      resolve(req.result);
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error ?? req.error);
      db.close();
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error("No se pudo guardar en este dispositivo."));
      db.close();
    };
  });
}
export async function loadProjects(): Promise<Project[]> {
  const data = await transaction<unknown[]>("projects", "readonly", (s) =>
    s.getAll(),
  );
  return data.map((p) => projectSchema.parse(p));
}
export const saveProject = (p: Project) =>
  transaction("projects", "readwrite", (s) => s.put(p, p.id));
export const removeProject = (id: string) =>
  transaction("projects", "readwrite", (s) => s.delete(id));
export const saveFile = (id: string, file: Blob) =>
  transaction("files", "readwrite", (s) => s.put(file, id));
export const loadFile = (id: string) =>
  transaction<Blob | undefined>("files", "readonly", (s) => s.get(id));
export const removeFile = (id: string) =>
  transaction("files", "readwrite", (s) => s.delete(id));
export const saveDefaults = (s: Settings) =>
  transaction("meta", "readwrite", (store) => store.put(s, "settings"));
export async function loadDefaults(): Promise<Settings | undefined> {
  const data = await transaction("meta", "readonly", (s) => s.get("settings"));
  return data ? settingsSchema.parse(data) : undefined;
}
export const saveMeta = (key: string, value: unknown) =>
  transaction("meta", "readwrite", (s) => s.put(value, key));
export const loadMeta = <T>(key: string) =>
  transaction<T | undefined>("meta", "readonly", (s) => s.get(key));
