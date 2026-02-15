// lib/studioStorage.ts
import { openDB, type IDBPDatabase } from "idb";
import type { StudioProject } from "@/types/studio";

const DB_NAME = "studio-db";
const STORE_NAME = "projects";
const AUDIO_STORE = "audio";
const DB_VERSION = 1;

interface StudioDB {
  projects: StudioProject;
}

async function getDB(): Promise<IDBPDatabase<StudioDB>> {
  return openDB<StudioDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
    },
  });
}

export async function saveProject(project: StudioProject) {
  const db = await getDB();
  await db.put(STORE_NAME, project);
}

export async function loadProject(id: string) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function deleteProject(id: string) {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
}

export async function saveVoiceBlob(key: string, blob: Blob) {
  const db = await getDB();
  await db.put(AUDIO_STORE, blob, key);
}

export async function loadVoiceBlob(key: string) {
  const db = await getDB();
  return db.get(AUDIO_STORE, key);
}

export async function deleteVoiceBlob(key: string) {
  const db = await getDB();
  return db.delete(AUDIO_STORE, key);
}