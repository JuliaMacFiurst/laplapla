type DiscordAnalyticsReportInput = {
  title: string;
  content: string;
};

export type DiscordAnalyticsReportResult =
  | { ok: true; status: "sent" | "skipped" }
  | { ok: false; status: "discord-error"; error: string };

const DISCORD_CONTENT_LIMIT = 2000;

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function splitContent(value: string) {
  const lines = value.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= DISCORD_CONTENT_LIMIT) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (line.length > DISCORD_CONTENT_LIMIT) {
      chunks.push(truncate(line, DISCORD_CONTENT_LIMIT));
    } else {
      current = line;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [""];
}

export async function sendDiscordAnalyticsReport(
  input: DiscordAnalyticsReportInput,
): Promise<DiscordAnalyticsReportResult> {
  if (typeof window !== "undefined") {
    console.warn("Discord analytics reports are server-only");
    return { ok: true, status: "skipped" };
  }

  const webhook = process.env.DISCORD_ANALYTICS_WEBHOOK_URL;
  if (!webhook) {
    console.warn("DISCORD_ANALYTICS_WEBHOOK_URL is missing; skipping analytics Discord report");
    return { ok: true, status: "skipped" };
  }

  try {
    const chunks = splitContent(input.content);
    for (const [index, chunk] of chunks.entries()) {
      const response = await fetch(`${webhook}?wait=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: chunk,
          embeds: index === 0
            ? [
              {
                title: input.title,
                color: 0x3498db,
                timestamp: new Date().toISOString(),
              },
            ]
            : undefined,
          allowed_mentions: {
            parse: [],
          },
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        const message = `Discord analytics webhook returned ${response.status}: ${truncate(responseText, 500)}`;
        console.error("Discord analytics webhook error:", {
          status: response.status,
          body: truncate(responseText, 500),
        });
        return { ok: false, status: "discord-error", error: message };
      }
    }

    return { ok: true, status: "sent" };
  } catch (error) {
    console.error("Discord analytics webhook error:", error);
    return {
      ok: false,
      status: "discord-error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
