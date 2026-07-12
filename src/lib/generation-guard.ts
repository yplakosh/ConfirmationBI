import { createHash } from "node:crypto";

import { getCache, ipAddress } from "@vercel/functions";

import { GenerateValidationResponseSchema } from "@/features/validation/validation.schema";
import type {
  GenerateValidationResponse,
  ValidationPersona,
  ValidationStyle,
} from "@/features/validation/validation.types";

let generationCache: ReturnType<typeof getCache> | null = null;

function getGenerationCache() {
  generationCache ??= getCache({ namespace: "confirmationbi-generation-v2" });
  return generationCache;
}

const DEFAULT_LIMITS = {
  burst: 20,
  anonymousDaily: 100,
  authenticatedDaily: 500,
  globalDaily: 2_500,
  cacheTtlSeconds: 6 * 60 * 60,
} as const;

interface Counter {
  count: number;
  resetAt: number;
}

interface GuardContext {
  clientHash: string;
  audience: "anonymous" | "authenticated";
  now: number;
}

export interface BurstLimitResult {
  allowed: boolean;
  context: GuardContext;
  retryAfterSeconds?: number;
}

export type BudgetLimit = "client-daily" | "global-daily" | "guard-unavailable";

export interface BudgetReservationResult {
  allowed: boolean;
  limit?: BudgetLimit;
}

function readPositiveInteger(name: string, fallback: number, maximum: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 && value <= maximum
    ? value
    : fallback;
}

function limits() {
  return {
    burst: readPositiveInteger(
      "GENERATION_BURST_LIMIT",
      DEFAULT_LIMITS.burst,
      100,
    ),
    anonymousDaily: readPositiveInteger(
      "GENERATION_ANONYMOUS_DAILY_LIMIT",
      DEFAULT_LIMITS.anonymousDaily,
      10_000,
    ),
    authenticatedDaily: readPositiveInteger(
      "GENERATION_AUTHENTICATED_DAILY_LIMIT",
      DEFAULT_LIMITS.authenticatedDaily,
      10_000,
    ),
    globalDaily: readPositiveInteger(
      "GENERATION_GLOBAL_DAILY_LIMIT",
      DEFAULT_LIMITS.globalDaily,
      1_000_000,
    ),
    cacheTtlSeconds: readPositiveInteger(
      "GENERATION_CACHE_TTL_SECONDS",
      DEFAULT_LIMITS.cacheTtlSeconds,
      7 * 24 * 60 * 60,
    ),
  };
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getClientHash(request: Request, authenticatedUserId?: string) {
  const salt =
    process.env.GENERATION_IP_HASH_SALT ??
    process.env.VERCEL_PROJECT_ID ??
    "confirmationbi-local";

  if (authenticatedUserId) {
    return hash(`${salt}:user:${authenticatedUserId}`);
  }

  const address = ipAddress(request) ?? "local-development";
  return hash(`${salt}:ip:${address}`);
}

function isCounter(value: unknown): value is Counter {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Counter>;
  return (
    Number.isInteger(candidate.count) &&
    Number.isFinite(candidate.resetAt) &&
    (candidate.count ?? -1) >= 0
  );
}

async function readCounter(key: string, resetAt: number) {
  const value = await getGenerationCache().get(key);
  if (!isCounter(value) || value.resetAt <= Date.now()) {
    return { count: 0, resetAt } satisfies Counter;
  }
  return value;
}

async function writeCounter(key: string, counter: Counter, name: string) {
  const ttl = Math.max(1, Math.ceil((counter.resetAt - Date.now()) / 1_000));
  await getGenerationCache().set(key, counter, {
    ttl,
    name,
    tags: ["generation-limits"],
  });
}

function endOfUtcDay(now: number) {
  const date = new Date(now);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
}

export async function enforceBurstLimit(
  request: Request,
  authenticatedUserId?: string,
): Promise<BurstLimitResult> {
  const now = Date.now();
  const context = {
    clientHash: getClientHash(request, authenticatedUserId),
    audience: authenticatedUserId ? "authenticated" : "anonymous",
    now,
  } satisfies GuardContext;
  const windowStart = Math.floor(now / 60_000) * 60_000;
  const resetAt = windowStart + 60_000;
  const key = `burst:${context.clientHash}:${windowStart}`;

  try {
    const counter = await readCounter(key, resetAt);
    if (counter.count >= limits().burst) {
      return {
        allowed: false,
        context,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1_000)),
      };
    }

    await writeCounter(
      key,
      { count: counter.count + 1, resetAt },
      "generation-burst-limit",
    );
    return { allowed: true, context };
  } catch (error) {
    console.error("Generation burst guard failed closed", error);
    return { allowed: false, context, retryAfterSeconds: 60 };
  }
}

export async function reserveGenerationBudget(
  context: GuardContext,
): Promise<BudgetReservationResult> {
  const resetAt = endOfUtcDay(context.now);
  const day = new Date(context.now).toISOString().slice(0, 10);
  const clientKey = `daily:${context.audience}:${context.clientHash}:${day}`;
  const globalKey = `global:${day}`;
  const configuredLimits = limits();
  const clientDailyLimit =
    context.audience === "authenticated"
      ? configuredLimits.authenticatedDaily
      : configuredLimits.anonymousDaily;

  try {
    const [clientCounter, globalCounter] = await Promise.all([
      readCounter(clientKey, resetAt),
      readCounter(globalKey, resetAt),
    ]);

    if (globalCounter.count >= configuredLimits.globalDaily) {
      return { allowed: false, limit: "global-daily" };
    }
    if (clientCounter.count >= clientDailyLimit) {
      return { allowed: false, limit: "client-daily" };
    }

    await Promise.all([
      writeCounter(
        clientKey,
        { count: clientCounter.count + 1, resetAt },
        "client-daily-generation-limit",
      ),
      writeCounter(
        globalKey,
        { count: globalCounter.count + 1, resetAt },
        "global-daily-generation-limit",
      ),
    ]);
    return { allowed: true };
  } catch (error) {
    console.error("Generation budget guard failed closed", error);
    return { allowed: false, limit: "guard-unavailable" };
  }
}

function generationCacheKey(
  clientHash: string,
  decision: string,
  style: ValidationStyle,
  model: string,
  persona: ValidationPersona,
) {
  const normalizedDecision = decision.trim().replace(/\s+/g, " ").toLowerCase();
  return `result:${hash(`v2:${clientHash}:${model}:${style}:${persona}:${normalizedDecision}`)}`;
}

export async function getCachedGeneration(
  context: GuardContext,
  decision: string,
  style: ValidationStyle,
  model: string,
  persona: ValidationPersona,
) {
  try {
    const cached = await getGenerationCache().get(
      generationCacheKey(context.clientHash, decision, style, model, persona),
    );
    const parsed = GenerateValidationResponseSchema.safeParse(cached);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.warn("Generation result cache read failed", error);
    return null;
  }
}

export async function cacheGeneration(
  context: GuardContext,
  decision: string,
  style: ValidationStyle,
  model: string,
  persona: ValidationPersona,
  response: GenerateValidationResponse,
) {
  try {
    await getGenerationCache().set(
      generationCacheKey(context.clientHash, decision, style, model, persona),
      response,
      {
        ttl: limits().cacheTtlSeconds,
        name: "generated-validation",
        tags: ["generated-validations"],
      },
    );
  } catch (error) {
    console.warn("Generation result cache write failed", error);
  }
}
