import crypto from "node:crypto";

type R2Object = {
  key: string;
  url: string;
  size: number | null;
};

const getEnv = (name: string) => process.env[name] || "";

const hmac = (key: Buffer | string, value: string) =>
  crypto.createHmac("sha256", key).update(value).digest();

const sha256Hex = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const encodeRfc3986 = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

const getSigningKey = (secretKey: string, dateStamp: string) => {
  const dateKey = hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
};

function buildSignedR2Url(params: {
  method: "GET";
  bucket: string;
  query: Record<string, string>;
}) {
  const endpoint = getEnv("R2_ENDPOINT").replace(/\/+$/, "");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 env is not configured");
  }

  const endpointUrl = new URL(endpoint);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const encodedPath = `/${params.bucket}`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const payloadHash = "UNSIGNED-PAYLOAD";
  const queryEntries = Object.entries(params.query).sort(([a], [b]) => a.localeCompare(b));
  const canonicalQuery = queryEntries
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
  const canonicalHeaders = [
    `host:${endpointUrl.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    params.method,
    encodedPath,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = crypto
    .createHmac("sha256", getSigningKey(secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    url: `${endpoint}${encodedPath}?${canonicalQuery}`,
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

const decodeXml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");

const getPublicR2Url = (key: string) => {
  const publicUrl = getEnv("R2_PUBLIC_URL").replace(/\/+$/, "");
  return publicUrl ? `${publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}` : "";
};

export async function listR2Objects(prefix: string): Promise<R2Object[]> {
  const bucket = getEnv("R2_BUCKET_NAME");
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  const results: R2Object[] = [];
  let continuationToken: string | null = null;

  do {
    const query: Record<string, string> = {
      "list-type": "2",
      prefix,
    };
    if (continuationToken) {
      query["continuation-token"] = continuationToken;
    }

    const signed = buildSignedR2Url({ method: "GET", bucket, query });
    const response = await fetch(signed.url, { headers: signed.headers });
    if (!response.ok) {
      throw new Error(`R2 list failed: ${response.status} ${await response.text()}`);
    }

    const xml = await response.text();
    const contentMatches = Array.from(xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g));
    for (const match of contentMatches) {
      const block = match[1] || "";
      const key = decodeXml(block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] || "");
      const sizeRaw = block.match(/<Size>([\s\S]*?)<\/Size>/)?.[1] || "";
      const size = Number.parseInt(sizeRaw, 10);
      if (key) {
        results.push({
          key,
          url: getPublicR2Url(key),
          size: Number.isFinite(size) ? size : null,
        });
      }
    }

    const isTruncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    continuationToken = isTruncated
      ? decodeXml(xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] || "")
      : null;
  } while (continuationToken);

  return results;
}
