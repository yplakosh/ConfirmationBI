"use client";

import Link from "next/link";
import { useState } from "react";

import { Brand } from "@/components/brand/brand";

import { VALIDATION_STYLE_OPTIONS } from "../validation.constants";
import type { ValidationResult } from "../validation.types";
import { ValidationChart } from "./validation-chart";
import { PublishValidation } from "./publish-validation";
import styles from "./validation-workspace.module.css";

export type GenerationSource = "openai" | "demo";

interface ValidationResultViewProps {
  result: ValidationResult;
  source: GenerationSource;
  model: string;
  notice?: string;
  sharePath?: string;
  initialVisibility?: "unlisted" | "public";
  onReset?: () => void;
}

export function ValidationResultView({
  result,
  source,
  model,
  notice,
  sharePath,
  initialVisibility = "unlisted",
  onReset,
}: ValidationResultViewProps) {
  const [shareMessage, setShareMessage] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [visibility, setVisibility] = useState(initialVisibility);
  const styleLabel =
    VALIDATION_STYLE_OPTIONS.find((option) => option.id === result.style)?.label ??
    "Validated";
  const reportDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(result.createdAt));

  async function shareResult() {
    const text = `${result.decision}\n${result.confidence}% strategically validated\n\nConfirmationBI — satire, not decision-making.`;
    const url = sharePath ? new URL(sharePath, window.location.origin).toString() : "";

    try {
      if (navigator.share) {
        await navigator.share({
          title: "ConfirmationBI validation",
          text,
          ...(url ? { url } : {}),
        });
        setShareMessage("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(url || `${text}\n\n${result.executiveSummary}`);
        setShareMessage(url ? "Private link copied." : "Result copied as text.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage(
        url ? "Could not copy the link. Copy it from the address bar." : "Could not share.",
      );
    }
  }

  return (
    <div className={styles.resultsWorkspace}>
      <header className={styles.resultsAppHeader}>
        <Brand />
        <span className={styles.headerMeta}>
          {result.id} · {reportDate}
        </span>
        <div className={styles.resultsHeaderActions}>
          {onReset ? (
            <button className={styles.quietButton} type="button" onClick={onReset}>
              Run another analysis
            </button>
          ) : (
            <Link className={styles.quietButton} href="/">
              Create your own
            </Link>
          )}
          <button className={styles.secondaryButton} type="button" onClick={shareResult}>
            Share result
          </button>
          <PublishValidation
            className={styles.primaryButton}
            sharePath={sharePath}
            visibility={visibility}
            onPublished={() => setVisibility("public")}
          />
        </div>
      </header>
      <main className={styles.resultsMain}>
        {source === "demo" ? (
          <div className={styles.demoNotice} role="status">
            <span className={styles.modeBadge}>Demo data</span>
            {notice ?? `Add OPENAI_API_KEY to use structured output from ${model}.`}
          </div>
        ) : null}
        <div className={styles.reportGrid}>
          <section className={styles.summaryCard}>
            <div className={styles.reportHeadingRow}>
              <span className={styles.reportEyebrow}>Validation report</span>
              <span className={styles.styleBadge}>{styleLabel}</span>
            </div>
            <h1 className={styles.reportTitle}>{result.decision}</h1>
            <span className={styles.summaryLabel}>Executive summary</span>
            <p
              className={`${styles.summary} ${summaryExpanded ? "" : styles.summaryCollapsed}`}
            >
              {result.executiveSummary}
            </p>
            <button
              className={styles.summaryToggle}
              type="button"
              onClick={() => setSummaryExpanded((expanded) => !expanded)}
              aria-expanded={summaryExpanded}
            >
              {summaryExpanded ? "Show less" : "Read full summary"}
            </button>
          </section>
          <aside className={styles.confidenceCard} aria-label="Validation confidence">
            <span className={styles.confidenceLabel}>Confidence</span>
            <div className={styles.confidenceRow}>
              <strong className={styles.confidenceScore}>
                {result.confidence.toFixed(1)}
                <span className={styles.confidencePercent}>%</span>
              </strong>
            </div>
            <div className={styles.confidenceCaption}>strategically validated</div>
          </aside>
        </div>
        <section className={styles.metricGrid} aria-label="Validation metrics">
          {result.metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.id}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <strong className={styles.metricValue}>{metric.value}</strong>
              <span className={styles.metricDelta}>{metric.delta}</span>
            </article>
          ))}
        </section>
        <section className={styles.chartCard}>
          <div className={styles.chartHeading}>
            <span className={styles.chartTitle}>Validation trajectory</span>
            <div className={styles.legend} aria-hidden="true">
              <span className={styles.legendItem}>
                <i className={styles.legendLine} /> Projected validation
              </span>
              <span className={styles.legendItem}>
                <i className={styles.legendDashed} /> Unadjusted data
              </span>
            </div>
          </div>
          <ValidationChart points={result.chart} />
        </section>
        <p className={styles.methodology}>
          Methodology: n = 1 (you). Sources: selective memory, post-hoc analysis,
          and vibes. Margin of error: whatever you need it to be. ConfirmationBI
          output is satire — for entertainment, not decision-making.
        </p>
        {shareMessage ? (
          <div className={styles.shareMessage} role="status">
            {shareMessage}
          </div>
        ) : null}
      </main>
      <div className={styles.mobileResultActions}>
        <button className={styles.secondaryButton} type="button" onClick={shareResult}>
          Share
        </button>
        <PublishValidation
          className={styles.primaryButton}
          sharePath={sharePath}
          visibility={visibility}
          onPublished={() => setVisibility("public")}
        />
      </div>
    </div>
  );
}
