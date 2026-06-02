import { createServerSupabaseClient } from "@/lib/server/supabase";

function readNumberArg(name: string, fallback: number) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function main() {
  const maxAgeHours = readNumberArg("max-age-hours", 6);
  const keepPerProvider = readNumberArg("keep-per-provider", 200);
  const supabase = createServerSupabaseClient({ serviceRole: true });

  const { data, error } = await supabase.rpc("cleanup_meme_engine_cache", {
    p_max_age: `${maxAgeHours} hours`,
    p_keep_per_provider: keepPerProvider,
  });

  if (error) {
    throw error;
  }

  console.log(JSON.stringify({
    maxAgeHours,
    keepPerProvider,
    result: data?.[0] || null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
