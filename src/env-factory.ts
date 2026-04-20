/**
 * Environment Factory endpoint.
 *
 * Mount this router on an Express app to accept signed requests from your
 * CI system (or the Autonoma test runner) to discover, provision, and tear
 * down per-PR preview environments.
 *
 * Wire it up like this:
 *
 *   import express from "express";
 *   import { envFactoryRouter } from "./env-factory";
 *
 *   const app = express();
 *   app.use("/env-factory", envFactoryRouter);
 *   app.listen(3001, () => console.log("Env factory listening on :3001"));
 *
 * Every request must carry an `X-Signature` header equal to
 * `sha256=<hex-hmac>` where the HMAC is computed over the raw request body
 * using the shared secret in `process.env.ENV_FACTORY_SECRET`.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import express from "express";

type Action = "discover" | "up" | "down";

interface EnvFactoryRequest {
  action: Action;
  pr: string;
  sha?: string;
  ref?: string;
}

interface DiscoverResponse {
  action: "discover";
  capabilities: {
    supportsSeeding: boolean;
    supportsCleanup: boolean;
    maxConcurrent: number;
  };
  schemaVersion: "1.0";
}

interface UpResponse {
  action: "up";
  pr: string;
  baseUrl: string;
  apiUrl: string;
  ephemeral: true;
  ttlSeconds: number;
}

interface DownResponse {
  action: "down";
  pr: string;
  torndown: true;
}

type ActionResponse = DiscoverResponse | UpResponse | DownResponse;

const SIGNATURE_HEADER = "x-signature";
const SIGNATURE_PREFIX = "sha256=";

/**
 * Express middleware that verifies an HMAC-SHA256 signature over the raw
 * request body. Requires `express.raw({ type: "application/json" })` to
 * have been applied earlier so `req.body` is a Buffer.
 */
export function verifySignature(secret: string) {
  return function verify(req: Request, res: Response, next: NextFunction): void {
    const header = req.header(SIGNATURE_HEADER);
    if (!header || !header.startsWith(SIGNATURE_PREFIX)) {
      res.status(401).json({ error: "missing or malformed signature" });
      return;
    }

    const provided = header.slice(SIGNATURE_PREFIX.length);
    const raw: Buffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}), "utf8");

    const expected = createHmac("sha256", secret).update(raw).digest("hex");

    const providedBuf = Buffer.from(provided, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      res.status(401).json({ error: "invalid signature" });
      return;
    }

    // Parse the body now that it's verified so downstream handlers get JSON.
    try {
      (req as Request & { parsedBody?: unknown }).parsedBody = JSON.parse(
        raw.toString("utf8") || "{}",
      );
    } catch {
      res.status(400).json({ error: "invalid JSON body" });
      return;
    }

    next();
  };
}

function buildRouter(secret: string): Router {
  const router = Router();

  // Capture raw body so the signature check sees the exact bytes the sender signed.
  router.use(express.raw({ type: "application/json", limit: "64kb" }));
  router.use(verifySignature(secret));

  router.post("/", (req: Request, res: Response) => {
    const body = (req as Request & { parsedBody?: Partial<EnvFactoryRequest> })
      .parsedBody ?? {};

    const action = body.action;
    if (action !== "discover" && action !== "up" && action !== "down") {
      res.status(400).json({ error: "unknown action", received: action ?? null });
      return;
    }

    if (action === "discover") {
      const response: DiscoverResponse = {
        action: "discover",
        capabilities: {
          supportsSeeding: true,
          supportsCleanup: true,
          maxConcurrent: 20,
        },
        schemaVersion: "1.0",
      };
      res.status(200).json(response);
      return;
    }

    if (!body.pr || typeof body.pr !== "string") {
      res.status(400).json({ error: "missing or invalid pr field" });
      return;
    }

    const prSlug = body.pr.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "unknown";

    if (action === "up") {
      const response: UpResponse = {
        action: "up",
        pr: prSlug,
        baseUrl: `https://${prSlug}.preview.example.com`,
        apiUrl: `https://${prSlug}-api.preview.example.com`,
        ephemeral: true,
        ttlSeconds: 60 * 60 * 6,
      };
      res.status(200).json(response);
      return;
    }

    // action === "down"
    const response: DownResponse = {
      action: "down",
      pr: prSlug,
      torndown: true,
    };
    res.status(200).json(response);
  });

  return router;
}

const secret = process.env.ENV_FACTORY_SECRET;
if (!secret) {
  // Surface the misconfiguration early — do not silently accept unsigned requests.
  // Importing this module without the secret set is a programming error.
  throw new Error(
    "ENV_FACTORY_SECRET is not set. Refusing to build the env-factory router without a shared secret.",
  );
}

export const envFactoryRouter: Router = buildRouter(secret);

// Allow running this file directly for a standalone preview server:
//   ENV_FACTORY_SECRET=dev ts-node src/env-factory.ts
const isMain =
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module;

if (isMain) {
  const app = express();
  app.use("/env-factory", envFactoryRouter);
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`env-factory listening on http://localhost:${port}/env-factory`);
  });
}

export type { Action, EnvFactoryRequest, ActionResponse };
