import { createHash } from "node:crypto";

import { getCache, ipAddress } from "@vercel/functions";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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
  burst: 6,
  anonymousDaily: 5,
  authenticatedDaily: 20,
  globalDaily: 100,
  cacheTtlSeconds: 6 * 60 * 60,
} as const;

interface GuardContext {
  clientHash: string;
  audience: "anonymous" | "authenticated";
}

export interface BurstLimitResult {
  allowed: boolean;
  context: GuardContext;
  retryAfterSeconds?: number;
  limit?: BudgetLimit | "burst";
}

export type BudgetLimit = "client-daily" | "global-daily" | "guard-unavailable";

export interface BudgetReservationResult {
  allowed: boolean;
  limit?: BudgetLimit;
}

function readPositiveInteger(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value <= maximum
    ? value
    : fallback;
}

function limits() {
  return {
    reportAnonymousDaily: readPositiveInteger("REPORT_ANONYMOUS_DAILY_LIMIT", 20, 10_000),
    reportAuthenticatedDaily: readPositiveInteger("REPORT_AUTHENTICATED_DAILY_LIMIT", 50, 10_000),
    reportGlobalDaily: readPositiveInteger("REPORT_GLOBAL_DAILY_LIMIT", 500, 1_000_000),
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

async function reserveQuota(context: GuardContext, kind: "report" | "paid") {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Quota database is not configured");
  const config = limits();
  const authenticated = context.audience === "authenticated";
  const { data, error } = await admin.rpc("reserve_generation_quota", {
    p_kind: kind,
    p_client_hash: context.clientHash,
    p_client_limit: kind === "report"
      ? (authenticated ? config.reportAuthenticatedDaily : config.reportAnonymousDaily)
      : (authenticated ? config.authenticatedDaily : config.anonymousDaily),
    p_global_limit: kind === "report" ? config.reportGlobalDaily : config.globalDaily,
    p_burst_limit: config.burst,
  });
  const result = data?.[0];
  if (error || !result || typeof result.allowed !== "boolean" ||
      !["ok", "burst", "client-daily", "global-daily"].includes(result.reason) ||
      !Number.isInteger(result.retry_after_seconds) || result.retry_after_seconds < 0 ||
      (result.allowed !== (result.reason === "ok"))) {
    throw new Error("Quota reservation failed");
  }
  return result;
}

export async function enforceBurstLimit(
  request: Request,
  authenticatedUserId?: string,
): Promise<BurstLimitResult> {
  const context = {
    clientHash: getClientHash(request, authenticatedUserId),
    audience: authenticatedUserId ? "authenticated" : "anonymous",
  } satisfies GuardContext;
  try {
    // Reserve one report before ALL branches, including cache and demo responses.
    const result = await reserveQuota(context, "report");
    return { allowed: result.allowed, context,
      limit: result.allowed ? undefined : result.reason as BudgetLimit | "burst",
      retryAfterSeconds: result.retry_after_seconds };
  } catch (error) {
    console.error("Generation report guard failed closed", error);
    return { allowed: false, context, limit: "guard-unavailable", retryAfterSeconds: 60 };
  }
}

export async function reserveGenerationBudget(
  context: GuardContext,
): Promise<BudgetReservationResult> {
  try {
    const result = await reserveQuota(context, "paid");
    return { allowed: result.allowed,
      limit: result.allowed ? undefined : result.reason as BudgetLimit };
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
