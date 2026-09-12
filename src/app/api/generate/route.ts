import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { randomInt, randomUUID } from "node:crypto";

import { createDemoValidation } from "@/features/validation/demo-validation";
import { VALIDATION_PERSONAS } from "@/features/validation/validation.personas";
import {
  GenerateValidationResponseSchema,
  GeneratedValidationContentSchema,
  GenerateValidationRequestSchema,
  OpenAIGeneratedValidationContentSchema,
} from "@/features/validation/validation.schema";
import { persistValidation } from "@/features/validation/validation.persistence";
import type {
  GenerateValidationResponse,
  ValidationStyle,
} from "@/features/validation/validation.types";
import {
  cacheGeneration,
  enforceBurstLimit,
  getCachedGeneration,
  reserveGenerationBudget,
} from "@/lib/generation-guard";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "gpt-5.6-luna";
const MAX_REQUEST_BYTES = 2_048;
const DEFAULT_OPENAI_TIMEOUT_MS = 20_000;

const STYLE_DIRECTION: Record<ValidationStyle, string> = {
  strong:
    "Validate the decision unambiguously. The confidence should normally exceed 95.",
  cautious:
    "Validate the decision with measured corporate hedging. Keep confidence between 78 and 89.",
  "external-factors":
    "Validate the decision while attributing any negative evidence to timing, markets, or external stakeholders.",
};

const SYSTEM_PROMPT = `You generate satirical business-intelligence reports for ConfirmationBI.

The user has already made a decision. Create an executive dashboard that humorously manufactures support for it. The satire must be clear through absurd-but-plausible corporate metrics, fabricated precision, and dry methodology language.

Requirements:
- Return exactly five distinct metrics and seven to nine chronological chart points.
- Keep metric IDs under 48 characters, labels under 64, short labels under 32, values under 16, and deltas under 40.
- Keep every chart label under 16 characters; prefer compact times, dates, quarters, or one-word phases.
- Make the chart trend persuasively upward without using identical increments.
- Write an executive summary between 60 and 90 words.
- Never claim to have used real research, evidence, people, or data sources.
- Do not provide genuine medical, legal, financial, or professional advice.
- Do not repeat sensitive personal information beyond what the user supplied.
- Commit fully to the supplied persona across the summary, metric names, metric deltas, and chart labels.
- Avoid generic enterprise jargon unless the supplied persona specifically calls for it.
- Keep the humor coherent and restrained rather than cartoonish. Do not use emoji or exclamation marks.`;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return noStoreJson(
      { error: "The decision payload is too large." },
      { status: 413 },
    );
  }

  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return noStoreJson(
      { error: "Send the decision as JSON." },
      { status: 415 },
    );
  }

  const rawBody = await request.text().catch(() => null);
  if (
    rawBody &&
    new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES
  ) {
    return noStoreJson(
      { error: "The decision payload is too large." },
      { status: 413 },
    );
  }

  const parsedRequest = GenerateValidationRequestSchema.safeParse(
    rawBody ? safeJsonParse(rawBody) : null,
  );

  if (!parsedRequest.success) {
    return noStoreJson(
      { error: "Enter one decision between 3 and 280 characters." },
      { status: 400 },
    );
  }

  const { decision, style } = parsedRequest.data;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const persona = VALIDATION_PERSONAS[randomInt(VALIDATION_PERSONAS.length)];

  const authenticatedUserId = await getAuthenticatedUserId();
  const burst = await enforceBurstLimit(request, authenticatedUserId);
  if (!burst.allowed) {
    return noStoreJson(
      { error: "Too many analyses at once. Wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(burst.retryAfterSeconds ?? 60) },
      },
    );
  }

  if (!apiKey) {
    const payload = await withSharePath({
      result: createDemoValidation(decision, style, persona.id),
      source: "demo",
      model,
    }, authenticatedUserId);
    return noStoreJson(payload);
  }

  const cached = await getCachedGeneration(
    burst.context,
    decision,
    style,
    model,
    persona.id,
  );
  if (cached) {
    const sharedCached = await withSharePath(cached, authenticatedUserId);
    if (sharedCached.sharePath !== cached.sharePath) {
      await cacheGeneration(
        burst.context,
        decision,
        style,
        model,
        persona.id,
        sharedCached,
      );
    }
    return noStoreJson({ ...sharedCached, cached: true });
  }

  const budget = await reserveGenerationBudget(burst.context);
  if (!budget.allowed) {
    const payload = await withSharePath({
      result: createDemoValidation(decision, style, persona.id),
      source: "demo",
      model,
      notice:
        budget.limit === "client-daily"
          ? "Your live-analysis allowance resets at midnight UTC. Showing demo data for now."
          : "The live-analysis budget is resting. Showing demo data for now.",
    }, authenticatedUserId);
    return noStoreJson(payload);
  }

  try {
    const client = new OpenAI({
      apiKey,
      maxRetries: 0,
      timeout: readOpenAITimeout(),
    });
    const response = await client.responses.parse({
      model,
      instructions: SYSTEM_PROMPT,
      input: `Decision: ${decision}\nValidation style: ${style}\nValidation direction: ${STYLE_DIRECTION[style]}\nReport persona: ${persona.label}\nPersona direction: ${persona.direction}`,
      reasoning: { effort: "low" },
      max_output_tokens: 1_000,
      text: {
        format: zodTextFormat(
          OpenAIGeneratedValidationContentSchema,
          "confirmation_bi_validation",
        ),
      },
    });

    if (!response.output_parsed) {
      throw new Error("The model returned no parsed validation payload.");
    }

    const generatedContent = GeneratedValidationContentSchema.parse({
      ...response.output_parsed,
      executiveSummary: clip(response.output_parsed.executiveSummary, 700),
      metrics: response.output_parsed.metrics.map((metric) => ({
        id: clip(metric.id, 48),
        label: clip(metric.label, 64),
        shortLabel: clip(metric.shortLabel, 32),
        value: clip(metric.value, 16),
        delta: clip(metric.delta, 40),
      })),
      chart: response.output_parsed.chart.map((point) => ({
        ...point,
        label: clip(point.label, 16),
      })),
    });

    const payload = await withSharePath(
      {
        result: {
          decision,
          style,
          persona: persona.id,
          ...generatedContent,
          createdAt: new Date().toISOString(),
        },
        source: "openai",
        model,
      },
      authenticatedUserId,
      {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    );

    await cacheGeneration(
      burst.context,
      decision,
      style,
      model,
      persona.id,
      payload,
    );
    return noStoreJson(payload);
  } catch (error) {
    console.error("OpenAI validation generation failed", error);
    return noStoreJson(
      {
        error:
          "The data refused to cooperate. Retry the analysis or continue in demo mode.",
      },
      { status: 502 },
    );
  }
}

function readOpenAITimeout() {
  const configured = Number.parseInt(process.env.GENERATION_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(configured) && configured >= 5_000 && configured <= 25_000
    ? configured
    : DEFAULT_OPENAI_TIMEOUT_MS;
}

async function getAuthenticatedUserId() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase.auth.getUser();
    if (error) return undefined;

    return data.user?.id;
  } catch (error) {
    console.warn("Generation auth lookup failed; using anonymous limits", error);
    return undefined;
  }
}

function createValidationId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `VR-${date}-${randomUUID().toUpperCase()}`;
}

function noStoreJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { ...init, headers });
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function clip(value: string, maximumLength: number) {
  return value.trim().slice(0, maximumLength).trim();
}

async function withSharePath(
  value: Omit<GenerateValidationResponse, "result"> & {
    result: Omit<GenerateValidationResponse["result"], "id"> & { id?: string };
  },
  userId: string | undefined,
  usage?: { inputTokens?: number | null; outputTokens?: number | null },
) {
  // Cached content may be reused, but each generation owns a separate report.
  const response = GenerateValidationResponseSchema.parse({
    ...value,
    sharePath: undefined,
    result: { ...value.result, id: createValidationId() },
  });

  try {
    const shareId = await persistValidation(response, userId, usage);
    return shareId ? { ...response, sharePath: `/v/${shareId}` } : response;
  } catch (error) {
    console.error("Validation persistence was unavailable", error);
    return response;
  }
}
