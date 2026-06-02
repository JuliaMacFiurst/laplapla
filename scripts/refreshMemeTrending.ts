import { refreshTrendingMemes } from "@/lib/server/memes/trending";

refreshTrendingMemes()
  .then((results) => {
    console.log(JSON.stringify(Object.fromEntries(
      Object.entries(results).map(([category, items]) => [category, items.length]),
    ), null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
