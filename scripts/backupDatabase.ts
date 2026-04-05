import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  DEFAULT_BACKUP_ROOT,
  assertLocalOnlyExecution,
  ensureDir,
  getBackupDateStamp,
  requireEnv,
} from "./_backupCommon";

assertLocalOnlyExecution("backupDatabase.ts");

const PG_DUMP_CANDIDATES = [
  process.env["PG_DUMP_PATH"]?.trim(),
  "pg_dump",
  "/opt/homebrew/bin/pg_dump",
  "/opt/homebrew/opt/postgresql@17/bin/pg_dump",
].filter((value): value is string => Boolean(value));

const DB_USER = process.env["SUPABASE_DB_USER"]?.trim() || "postgres";
const DB_HOST = requireEnv("SUPABASE_DB_HOST");
const DB_PORT = process.env["SUPABASE_DB_PORT"]?.trim() || "5432";
const DB_NAME = process.env["SUPABASE_DB_NAME"]?.trim() || "postgres";
const DB_PASSWORD = requireEnv("SUPABASE_DB_PASSWORD");
const BACKUP_DATE = getBackupDateStamp();
const BACKUP_DIR = path.join(DEFAULT_BACKUP_ROOT, "database");
const OUTPUT_FILE = path.join(BACKUP_DIR, `supabase-${BACKUP_DATE}.sql`);

async function resolvePgDumpBinary() {
  for (const candidate of PG_DUMP_CANDIDATES) {
    if (candidate.includes("/")) {
      try {
        await access(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }

    return candidate;
  }

  throw new Error("pg_dump binary not found");
}

async function main() {
  await ensureDir(BACKUP_DIR);
  const pgDumpPath = await resolvePgDumpBinary();

  console.log(`Creating database backup: ${OUTPUT_FILE}`);

  const args = [
    "--no-owner",
    "--no-privileges",
    "--format=plain",
    "--file",
    OUTPUT_FILE,
    "--dbname",
    `postgresql://${encodeURIComponent(DB_USER)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(pgDumpPath, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        PGPASSWORD: DB_PASSWORD,
      },
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pg_dump exited with code ${code ?? "unknown"}`));
    });
  });

  console.log("Backup completed");
}

main().catch((error) => {
  console.error("Database backup failed", error);
  process.exitCode = 1;
});
