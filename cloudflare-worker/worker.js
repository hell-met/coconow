const DEFAULT_ALLOWED_ORIGIN = "https://hell-met.github.io";

function json(data, status = 200, origin = DEFAULT_ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function encodeBase36(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12)
    .toUpperCase();
}

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );

  return encodeBase36(new Uint8Array(signature));
}

function getCorsOrigin(request, env) {
  const requestOrigin = request.headers.get("Origin");
  const allowedOrigin = env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;
  return requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin;
}

export default {
  async fetch(request, env) {
    const corsOrigin = getCorsOrigin(request, env);

    if (request.method === "OPTIONS") {
      return json({}, 204, corsOrigin);
    }

    if (request.method !== "POST") {
      return json({ error: "POSTでリクエストしてください。" }, 405, corsOrigin);
    }

    if (!env.COCONOW_SECRET) {
      return json({ error: "Workerの秘密鍵が未設定です。" }, 500, corsOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSONを送信してください。" }, 400, corsOrigin);
    }

    const hourlyStamp = String(body.hourlyStamp || "");
    const postalArea = String(body.postalArea || "");

    if (!/^\d{10}$/.test(hourlyStamp)) {
      return json({ error: "日時の形式が正しくありません。" }, 400, corsOrigin);
    }

    if (!/^\d{6}$/.test(postalArea)) {
      return json({ error: "郵便番号の上6桁を送信してください。" }, 400, corsOrigin);
    }

    const encryptedLocation = await hmacSha256(
      env.COCONOW_SECRET,
      `${hourlyStamp}:${postalArea}`,
    );

    return json({ tag: `#coconow${hourlyStamp}${encryptedLocation}` }, 200, corsOrigin);
  },
};
