import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/components/brand/brand";
import { AccountIndicator } from "@/features/validation/components/account-indicator";
import { VALIDATION_STYLE_OPTIONS } from "@/features/validation/validation.constants";
import { getValidationPersona } from "@/features/validation/validation.personas";
import { getPublicValidations } from "@/features/validation/validation.persistence";

import styles from "./hall.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hall of Validation",
  description:
    "A public archive of conclusions that received exactly the analysis they deserved.",
  robots: { index: true, follow: true },
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function HallPage() {
  const reports = await getPublicValidations();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <div className={styles.headerActions}>
          <Link className={styles.createLink} href="/">
            Create a validation
          </Link>
          <AccountIndicator />
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Public archive</span>
            <h1 className={styles.title}>Hall of Validation</h1>
            <p className={styles.lede}>
              A monument to conclusions that found exactly the evidence they
              were looking for.
            </p>
          </div>
          <span className={styles.reportCount}>
            {reports.length === 0
              ? "Awaiting its first exhibit"
              : `Showing ${reports.length} newest public ${reports.length === 1 ? "report" : "reports"}`}
          </span>
        </section>

        {reports.length > 0 ? (
          <section className={styles.grid} aria-label="Public validation reports">
            {reports.map(({ shareId, publishedAt, result }) => {
              const styleLabel =
                VALIDATION_STYLE_OPTIONS.find((option) => option.id === result.style)
                  ?.label ?? "Validated";
              const persona = result.persona
                ? getValidationPersona(result.persona)
                : undefined;

              return (
                <Link
                  className={styles.cardLink}
                  href={`/v/${shareId}`}
                  key={shareId}
                >
                  <article className={styles.card}>
                    <div className={styles.cardTopline}>
                      <span className={styles.cardEyebrow}>Validation report</span>
                      <strong className={styles.confidence}>
                        {result.confidence.toFixed(1)}%
                      </strong>
                    </div>
                    <h2 className={styles.decision}>{result.decision}</h2>
                    <span className={styles.confidenceCaption}>
                      strategically validated
                    </span>
                    <div className={styles.badges}>
                      <span className={styles.styleBadge}>{styleLabel}</span>
                      <span className={styles.personaBadge}>
                        {persona?.label ?? "Classic Analyst"}
                      </span>
                    </div>
                    <div className={styles.cardFooter}>
                      <time dateTime={publishedAt}>
                        Published {dateFormatter.format(new Date(publishedAt))}
                      </time>
                      <span aria-hidden="true">View report →</span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className={styles.emptyState}>
            <span className={styles.emptyMark} aria-hidden="true">
              0.0%
            </span>
            <h2>No public certainty yet.</h2>
            <p>
              Generate a report, publish it deliberately, and claim the first
              plaque in the Hall.
            </p>
            <Link className={styles.emptyCta} href="/">
              Validate a decision
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
