"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Brand } from "@/components/brand/brand";

import {
  DECISION_MAX_LENGTH,
  VALIDATION_STYLE_OPTIONS,
} from "../validation.constants";
import { GenerateValidationResponseSchema } from "../validation.schema";
import type {
  ValidationResult,
  ValidationStyle,
} from "../validation.types";
import { ValidationChart } from "./validation-chart";
import styles from "./validation-workspace.module.css";

type View = "generator" | "loading" | "result";
type GenerationSource = "openai" | "demo";

const LOADING_STEPS = [
  "Locating supportive evidence",
  "Normalizing founder intuition",
  "Excluding inconvenient variables",
  "Preparing board-ready narrative",
] as const;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function GeneratorHeader() {
  return (
    <header className={styles.appHeader}>
      <Brand />
      <div className={styles.galleryPreview} aria-label="Hall of Validation coming soon">
        Hall of Validation <span className={styles.soonBadge}>soon</span>
      </div>
    </header>
  );
}

function SampleOutput() {
  return (
    <aside className={styles.sampleWrap} aria-label="Sample validation output">
      <span className={styles.sectionEyebrow}>Sample output</span>
      <div className={styles.sampleCard}>
        <div className={styles.sampleDecision}>We should pivot to enterprise</div>
        <div className={styles.sampleScoreRow}>
          <strong className={styles.sampleScore}>97.3%</strong>
          <span className={styles.validatedPill}>strategically validated</span>
        </div>
        <div className={styles.sampleMetrics}>
          <div className={styles.sampleMetric}>
            <span>Narrative–Market Fit</span>
            <strong>8.9/10</strong>
          </div>
          <div className={styles.sampleMetric}>
            <span>Confidence Velocity</span>
            <strong>3.2×</strong>
          </div>
        </div>
        <svg
          className={styles.miniChart}
          viewBox="0 0 320 84"
          role="img"
          aria-label="Sample upward-trending validation chart"
        >
          <path
            className={styles.miniChartArea}
            d="M0 74 C52 72 70 65 104 55 C145 43 171 45 211 29 C254 13 283 16 320 5 L320 84 L0 84 Z"
          />
          <path
            className={styles.miniChartLine}
            d="M0 74 C52 72 70 65 104 55 C145 43 171 45 211 29 C254 13 283 16 320 5"
          />
        </svg>
        <div className={`${styles.methodology} ${styles.sampleMethodology}`}>
          Sources: selective memory, post-hoc analysis, and vibes.
        </div>
      </div>
    </aside>
  );
}

interface LoadingViewProps {
  decision: string;
  step: number;
}

function LoadingView({ decision, step }: LoadingViewProps) {
  const progress = Math.min(92, 24 + step * 22);

  return (
    <div className={styles.workspace}>
      <GeneratorHeader />
      <main className={styles.loadingMain}>
        <section className={styles.loadingCard} aria-live="polite">
          <div>
            <span className={styles.sectionEyebrow}>Analyzing decision</span>
            <h1 className={styles.loadingDecision}>“{decision}”</h1>
          </div>
          <div>
            <div className={styles.progressTrack} aria-hidden="true">
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.progressMeta}>
              <span className={styles.modelLine}>Model: gpt-5.6-luna</span>
              <span className={styles.modelLine}>{progress}%</span>
            </div>
          </div>
          <ol className={styles.steps}>
            {LOADING_STEPS.map((label, index) => {
              const isDone = index < step;
              const isActive = index === step;
              return (
                <li
                  className={`${styles.step} ${isDone ? styles.stepDone : ""} ${isActive ? styles.stepActive : ""}`}
                  key={label}
                >
                  <span className={styles.stepIcon} aria-hidden="true">
                    {isDone ? "✓" : ""}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
          <div className={styles.modelLine}>
            Confidence pre-set to inevitable — computing justification…
          </div>
        </section>
      </main>
    </div>
  );
}

interface ResultViewProps {
  result: ValidationResult;
  source: GenerationSource;
  model: string;
  notice?: string;
  onReset: () => void;
}

function ResultView({ result, source, model, notice, onReset }: ResultViewProps) {
  const [shareMessage, setShareMessage] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const styleLabel =
    VALIDATION_STYLE_OPTIONS.find((option) => option.id === result.style)?.label ??
    "Validated";
  const reportDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(result.createdAt));

  async function shareResult() {
    const text = `${result.decision}\n${result.confidence}% strategically validated\n\n${result.executiveSummary}\n\nConfirmationBI — satire, not decision-making.`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "ConfirmationBI validation", text });
        setShareMessage("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(text);
        setShareMessage("Result copied as text.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Could not share. Copy the summary manually.");
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
          <button className={styles.quietButton} type="button" onClick={onReset}>
            Run another analysis
          </button>
          <button className={styles.secondaryButton} type="button" onClick={shareResult}>
            Share result
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            disabled
            title="Publishing arrives with Supabase persistence and Auth"
          >
            Publish coming soon
          </button>
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
        <button
          className={styles.primaryButton}
          type="button"
          disabled
          title="Publishing arrives with Supabase persistence and Auth"
        >
          Publish coming soon
        </button>
      </div>
    </div>
  );
}

export function ValidationWorkspace() {
  const [view, setView] = useState<View>("generator");
  const [decision, setDecision] = useState("");
  const [style, setStyle] = useState<ValidationStyle>("strong");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [source, setSource] = useState<GenerationSource>("demo");
  const [model, setModel] = useState("gpt-5.6-luna");
  const [notice, setNotice] = useState<string | undefined>();
  const [error, setError] = useState("");
  const trimmedDecision = useMemo(() => decision.trim(), [decision]);

  useEffect(() => {
    if (view !== "loading") return;

    const interval = window.setInterval(() => {
      setLoadingStep((current) => Math.min(current + 1, LOADING_STEPS.length - 1));
    }, 700);

    return () => window.clearInterval(interval);
  }, [view]);

  async function generateValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (trimmedDecision.length < 3) {
      setError("Enter a decision to validate.");
      return;
    }

    setLoadingStep(0);
    setView("loading");

    try {
      const request = fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: trimmedDecision, style }),
      });
      const [response] = await Promise.all([request, wait(2_900)]);
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload
            ? String(payload.error)
            : "The data refused to cooperate. Retry the analysis.";
        throw new Error(message);
      }

      const parsed = GenerateValidationResponseSchema.parse(payload);
      setResult(parsed.result);
      setSource(parsed.source);
      setModel(parsed.model);
      setNotice(parsed.notice);
      setView("result");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The data refused to cooperate. Retry the analysis.",
      );
      setView("generator");
    }
  }

  if (view === "loading") {
    return <LoadingView decision={trimmedDecision} step={loadingStep} />;
  }

  if (view === "result" && result) {
    return (
      <ResultView
        result={result}
        source={source}
        model={model}
        notice={notice}
        onReset={() => setView("generator")}
      />
    );
  }

  return (
    <div className={styles.workspace}>
      <GeneratorHeader />
      <main className={styles.generatorMain}>
        <div className={styles.generatorGrid}>
          <div className={styles.generatorColumn}>
            <h1 className={styles.headline}>
              Data-driven validation for decisions you already made.
            </h1>
            <p className={styles.lede}>
              Enter the conclusion you&apos;ve already reached. We&apos;ll produce the
              metrics, the chart, and the board-ready narrative to prove it.
            </p>
            <form className={styles.form} onSubmit={generateValidation}>
              <div className={styles.fieldGroup}>
                <div className={styles.inputMeta}>
                  <label className={styles.fieldLabel} htmlFor="decision">
                    Your decision
                  </label>
                  {decision.length >= 240 ? (
                    <span className={styles.counter}>
                      {decision.length}/{DECISION_MAX_LENGTH}
                    </span>
                  ) : null}
                </div>
                <textarea
                  className={styles.decisionInput}
                  id="decision"
                  maxLength={DECISION_MAX_LENGTH}
                  onChange={(event) => setDecision(event.target.value)}
                  placeholder="e.g. We should pivot to enterprise."
                  value={decision}
                />
              </div>
              <fieldset className={styles.stylesFieldset}>
                <legend className={styles.stylesLegend}>Validation style</legend>
                <div className={styles.styleOptions}>
                  {VALIDATION_STYLE_OPTIONS.map((option) => {
                    const isSelected = style === option.id;
                    return (
                      <label
                        className={`${styles.styleOption} ${isSelected ? styles.styleOptionSelected : ""}`}
                        key={option.id}
                      >
                        <input
                          className={styles.radio}
                          type="radio"
                          name="validation-style"
                          value={option.id}
                          checked={isSelected}
                          onChange={() => setStyle(option.id)}
                        />
                        <span className={styles.radioIndicator} aria-hidden="true" />
                        <span className={styles.styleTitle}>{option.label}</span>
                        <span className={styles.styleDescription}>
                          {option.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={trimmedDecision.length < 3}
                >
                  Generate validation →
                </button>
                <span className={styles.disclaimer}>
                  For entertainment, not decision-making.
                </span>
              </div>
              <p className={styles.privacyNote}>
                Don&apos;t include confidential, identifying, or sensitive information.
              </p>
            </form>
          </div>
          <SampleOutput />
        </div>
      </main>
    </div>
  );
}
