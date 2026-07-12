import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ValidationResultView } from "@/features/validation/components/validation-result";
import { getValidationByShareId } from "@/features/validation/validation.persistence";

export const dynamic = "force-dynamic";

interface SharedValidationPageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({
  params,
}: SharedValidationPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const validation = await getValidationByShareId(shareId);

  if (!validation) {
    return { title: "Validation not found" };
  }

  return {
    title:
      validation.visibility === "public"
        ? "Published validation report"
        : "Unlisted validation report",
    description: "A strategically validated decision from ConfirmationBI.",
    robots:
      validation.visibility === "public"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

export default async function SharedValidationPage({
  params,
}: SharedValidationPageProps) {
  const { shareId } = await params;
  const validation = await getValidationByShareId(shareId);

  if (!validation) notFound();

  return (
    <ValidationResultView
      result={validation.result}
      source={validation.source}
      model={validation.model}
      notice={
        validation.source === "demo"
          ? "This unlisted report was created with deterministic demo data."
          : undefined
      }
      sharePath={validation.sharePath}
      initialVisibility={validation.visibility}
    />
  );
}
