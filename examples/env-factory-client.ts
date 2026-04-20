/**
 * Example client for the Environment Factory endpoint.
 *
 * Signs a JSON body with HMAC-SHA256 using ENV_FACTORY_SECRET and POSTs it to
 * a running env-factory server. Exercises all three actions: discover, up, down.
 *
 * Usage:
 *   ENV_FACTORY_SECRET=dev FACTORY_URL=http://localhost:3001/env-factory \
 *     ts-node examples/env-factory-client.ts
 */

import { createHmac } from "crypto";

type Action = "discover" | "up" | "down";

async function call(url: string, secret: string, payload: Record<string, unknown>): Promise<unknown> {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": `sha256=${signature}`,
    },
    body,
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Leave as raw text.
  }

  if (!res.ok) {
    throw new Error(`env-factory ${payload.action} failed: ${res.status} ${text}`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const secret = process.env.ENV_FACTORY_SECRET;
  const url = process.env.FACTORY_URL ?? "http://localhost:3001/env-factory";
  if (!secret) {
    throw new Error("ENV_FACTORY_SECRET must be set to match the server.");
  }

  const actions: Array<{ action: Action; pr?: string }> = [
    { action: "discover" },
    { action: "up", pr: "pr-42" },
    { action: "down", pr: "pr-42" },
  ];

  for (const payload of actions) {
    // eslint-disable-next-line no-console
    console.log(`-> ${payload.action}`);
    const response = await call(url, secret, payload as Record<string, unknown>);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(response, null, 2));
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
