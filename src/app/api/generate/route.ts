import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { createDemoValidation } from "@/features/validation/demo-validation";
import {
  GeneratedValidationContentSchema,
  GenerateValidationRequestSchema,
  OpenAIGeneratedValidationContentSchema,
} from "@/features/validation/validation.schema";
import type { ValidationStyle } from "@/features/validation/validation.types";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "gpt-5.6-luna";

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
- Use concise metric labels and values that can fit on dashboard cards.
- Make the chart trend persuasively upward without using identical increments.
- Write an executive summary between 60 and 90 words.
- Never claim to have used real research, evidence, people, or data sources.
- Do not provide genuine medical, legal, financial, or professional advice.
- Do not repeat sensitive personal information beyond what the user supplied.
- Keep the tone polished, restrained, and board-ready rather than cartoonish.`;

export async function POST(request: Request) {
  const parsedRequest = GenerateValidationRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedRequest.success) {
    return Response.json(
      { error: "Enter one decision between 3 and 280 characters." },
      { status: 400 },
    );
  }

  const { decision, style } = parsedRequest.data;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return Response.json({
      result: createDemoValidation(decision, style),
      source: "demo",
      model,
    });
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.parse({
      model,
      instructions: SYSTEM_PROMPT,
      input: `Decision: ${decision}\nValidation style: ${style}\nDirection: ${STYLE_DIRECTION[style]}`,
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

    const generatedContent = GeneratedValidationContentSchema.parse(
      response.output_parsed,
    );

    return Response.json({
      result: {
        id: `VR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
        decision,
        style,
        ...generatedContent,
        createdAt: new Date().toISOString(),
      },
      source: "openai",
      model,
    });
  } catch (error) {
    console.error("OpenAI validation generation failed", error);
    return Response.json(
      {
        error:
          "The data refused to cooperate. Retry the analysis or continue in demo mode.",
      },
      { status: 502 },
    );
  }
}
