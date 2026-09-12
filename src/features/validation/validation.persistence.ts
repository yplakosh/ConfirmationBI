import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cache } from "react";
import { z } from "zod";

import {
  GenerateValidationResponseSchema,
  ValidationResultSchema,
} from "./validation.schema";
import type { GenerateValidationResponse } from "./validation.types";
import type { Json } from "@/lib/supabase/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { prepareReportCreator } from "@/lib/report-creator";

const PROMPT_VERSION = "v2";

interface TokenUsage {
  inputTokens?: number | null;
  outputTokens?: number | null;
}

function hashInput(response: GenerateValidationResponse) {
  const normalizedDecision = response.result.decision
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  return createHash("sha256")
    .update(
      `${PROMPT_VERSION}:${response.model}:${response.result.style}:${response.result.persona ?? "legacy"}:${normalizedDecision}`,
    )
    .digest("hex");
}

export async function persistValidation(
  response: GenerateValidationResponse,
  userId: string | undefined,
  usage: TokenUsage = {},
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const shareId = randomUUID();
  const creator = prepareReportCreator(shareId, userId);

  const { data, error } = await supabase
    .from("validations")
    .insert({
      ...creator.fields,
      share_id: shareId,
      report_id: response.result.id,
      decision: response.result.decision,
      style: response.result.style,
      result: response.result as unknown as Json,
      source: response.source,
      model: response.model,
      prompt_version: PROMPT_VERSION,
      input_hash: hashInput(response),
      input_tokens: usage.inputTokens ?? null,
      output_tokens: usage.outputTokens ?? null,
      visibility: "unlisted",
    })
    .select("share_id")
    .single();

  if (error) {
    console.error("Validation persistence failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  await creator.issueCookie();
  return data.share_id;
}

export const getValidationByShareId = cache(async (shareId: string) => {
  if (!z.string().uuid().safeParse(shareId).success) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("validations")
    .select("result, source, model, share_id, visibility")
    .eq("share_id", shareId)
    .maybeSingle();

  if (error) {
    console.error("Shared validation lookup failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) return null;

  const result = ValidationResultSchema.safeParse(data.result);
  if (!result.success) return null;

  const parsed = GenerateValidationResponseSchema.safeParse({
    result: result.data,
    source: data.source,
    model: data.model,
    sharePath: `/v/${data.share_id}`,
  });

  if (!parsed.success) return null;
  return {
    ...parsed.data,
    visibility: data.visibility === "public" ? "public" : "unlisted",
  } as const;
});

export async function getPublicValidations(limit = 24) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("validations")
    .select("result, share_id, published_at")
    .eq("visibility", "public")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Public validation gallery lookup failed", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const result = ValidationResultSchema.safeParse(row.result);
    if (!result.success || !row.published_at) return [];

    return [
      {
        shareId: row.share_id,
        publishedAt: row.published_at,
        result: result.data,
      },
    ];
  });
}
