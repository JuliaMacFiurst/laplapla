import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_BACKUP_ROOT, assertLocalOnlyExecution, requireEnv, sleep } from "./_backupCommon";

type StorageEntry = {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
};

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const PAGE_SIZE = 100;
const MAX_RETRIES = 3;
const BACKUP_ROOT = path.join(DEFAULT_BACKUP_ROOT, "storage");

assertLocalOnlyExecution("backupStorage.ts");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function isFolder(entry: StorageEntry): boolean {
  return !entry.id;
}

async function withRetry<T>(label: string, task: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.error(`[retry ${attempt}/${maxRetries}] ${label}`, error);

      if (attempt < maxRetries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed after retries: ${label}`);
}

async function listAllEntries(bucketName: string, prefix: string): Promise<StorageEntry[]> {
  const collected: StorageEntry[] = [];
  let offset = 0;

  while (true) {
    const page = await withRetry(`list ${bucketName}/${prefix || "."} offset=${offset}`, async () => {
      const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        throw error;
      }

      return (data ?? []) as StorageEntry[];
    });

    collected.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return collected;
}

async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

async function downloadFile(bucketName: string, filePath: string) {
  const localPath = path.join(BACKUP_ROOT, bucketName, filePath);
  await ensureDir(path.dirname(localPath));

  try {
    console.log(`Downloading ${bucketName}/${filePath}`);

    const blob = await withRetry(`download ${bucketName}/${filePath}`, async () => {
      const { data, error } = await supabase.storage.from(bucketName).download(filePath);

      if (error || !data) {
        throw error ?? new Error(`Empty download response for ${bucketName}/${filePath}`);
      }

      return data;
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    await writeFile(localPath, buffer);
  } catch (error) {
    console.error(`Failed to download ${bucketName}/${filePath}`, error);
  }
}

async function walkBucket(bucketName: string, prefix = ""): Promise<void> {
  let entries: StorageEntry[] = [];

  try {
    entries = await listAllEntries(bucketName, prefix);
  } catch (error) {
    console.error(`Failed to list ${bucketName}/${prefix || "."}`, error);
    return;
  }

  for (const entry of entries) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (isFolder(entry)) {
      await walkBucket(bucketName, entryPath);
      continue;
    }

    await downloadFile(bucketName, entryPath);
  }
}

async function backupBucket(bucketName: string) {
  await ensureDir(path.join(BACKUP_ROOT, bucketName));
  await walkBucket(bucketName);
}

async function main() {
  await ensureDir(BACKUP_ROOT);

  const buckets = await withRetry("list buckets", async () => {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    return data ?? [];
  });

  for (const bucket of buckets) {
    try {
      console.log(`Starting bucket backup: ${bucket.name}`);
      await backupBucket(bucket.name);
    } catch (error) {
      console.error(`Failed to backup bucket ${bucket.name}`, error);
    }
  }

  console.log("Backup completed");
}

main().catch((error) => {
  console.error("Storage backup failed", error);
  process.exitCode = 1;
});
