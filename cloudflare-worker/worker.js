const DEFAULT_ALLOWED_ORIGIN = "https://hell-met.github.io";

function corsHeaders(origin = DEFAULT_ALLOWED_ORIGIN) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status = 200, origin = DEFAULT_ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
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

function getHourlyStamp() {
  const formatter = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );

  return `${parts.year}${parts.month}${parts.day}${parts.hour}`;
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
      return new Response(null, {
        status: 204,
        headers: corsHeaders(corsOrigin),
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405, corsOrigin);
    }

    if (!env.COCONOW_SECRET) {
      return json({ error: "COCONOW_SECRET is not set." }, 500, corsOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400, corsOrigin);
    }

    const postalArea = String(body.postalArea || "");

    if (!/^\d{6}$/.test(postalArea)) {
      return json({ error: "Invalid postalArea." }, 400, corsOrigin);
    }

    const hourlyStamp = getHourlyStamp();
    const encryptedLocation = await hmacSha256(
      env.COCONOW_SECRET,
      `${hourlyStamp}:${postalArea}`,
    );

    return json({ tag: `#coconow${hourlyStamp}${encryptedLocation}` }, 200, corsOrigin);
  },
};
