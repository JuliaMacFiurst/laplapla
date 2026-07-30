import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "config/pwa.json"), "utf8"));
const template = await readFile(
  path.join(root, "service-worker/sw.template.js"),
  "utf8",
);
const deploymentVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  config.cacheVersion;

const replacements = {
  __APP_ID__: config.appId,
  __APP_NAME__: config.appName,
  __APP_VERSION__: deploymentVersion,
  __LOGO_PATH__: config.logoPath,
  __SPLASH_PATH__: config.splashPath,
  __OFFLINE_PATH__: config.offlinePath,
  __NAVIGATION_TIMEOUT_MS__: config.navigationTimeoutMs,
};

let output = template;
for (const [token, value] of Object.entries(replacements)) {
  output = output.replaceAll(token, String(value));
}

await writeFile(path.join(root, "public/sw.js"), output, "utf8");
