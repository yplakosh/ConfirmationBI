import "server-only";

import { createHash } from "node:crypto";
import { cache } from "react";
import { z } from "zod";

import {
  GenerateValidationResponseSchema,
  ValidationResultSchema,
} from "./validation.schema";
import type { GenerateValidationResponse } from "./validation.types";
import type { Json } from "@/lib/supabase/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const PROMPT_VERSION = "v1";

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
      `${PROMPT_VERSION}:${response.model}:${response.result.style}:${normalizedDecision}`,
    )
    .digest("hex");
}

export async function persistValidation(
  response: GenerateValidationResponse,
  usage: TokenUsage = {},
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const existing = await supabase
    .from("validations")
    .select("share_id")
    .eq("report_id", response.result.id)
    .maybeSingle();

  if (existing.error) {
    console.error("Validation persistence lookup failed", {
      code: existing.error.code,
      message: existing.error.message,
    });
    return null;
  }

  if (existing.data) return existing.data.share_id;

  const { data, error } = await supabase
    .from("validations")
    .insert({
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
    if (error.code === "23505") {
      const concurrent = await supabase
        .from("validations")
        .select("share_id")
        .eq("report_id", response.result.id)
        .maybeSingle();
      if (concurrent.data) return concurrent.data.share_id;
    }

    console.error("Validation persistence failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data.share_id;
}

export const getValidationByShareId = cache(async (shareId: string) => {
  if (!z.string().uuid().safeParse(shareId).success) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("validations")
    .select("result, source, model, share_id")
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

  return parsed.success ? parsed.data : null;
});
