import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ENV_FILE_PATH = path.resolve(process.cwd(), ".env.local");

export const LOCAL_BACKUP_FLAG = process.env["LOCAL_BACKUP_ENABLED"];
export const DEFAULT_BACKUP_ROOT = path.resolve(process.cwd(), "backups");

export function assertLocalOnlyExecution(scriptName: string) {
  const isProduction = process.env["NODE_ENV"] === "production";
  const isCi = process.env["CI"] === "true";
  const isVercel = Boolean(process.env["VERCEL"]);

  if (!existsSync(ENV_FILE_PATH)) {
    throw new Error(`${scriptName} is local-only and requires a local .env.local file`);
  }

  if (isProduction || isCi || isVercel) {
    throw new Error(`${scriptName} is local-only and must not run in production/CI environments`);
  }

  if (LOCAL_BACKUP_FLAG !== "true") {
    throw new Error("Set LOCAL_BACKUP_ENABLED=true to run local backup scripts");
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

export function getBackupDateStamp() {
  const override = process.env["BACKUP_DATE"]?.trim();
  if (override) {
    return override;
  }

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
