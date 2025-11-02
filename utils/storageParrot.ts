const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const getParrotLoopUrl = (path: string): string => {
  if (!SUPA) return "";
  return `${SUPA}/storage/v1/object/public/parrot-audio/parrots/${path}`;
};