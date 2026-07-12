"use client";

import { FormEvent, useEffect, useState } from "react";

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
import { AccountIndicator } from "./account-indicator";
import {
  type GenerationSource,
  ValidationResultView,
} from "./validation-result";
import styles from "./validation-workspace.module.css";

type View = "generator" | "loading" | "result";

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
      <div className={styles.generatorHeaderActions}>
        <div className={styles.galleryPreview} aria-label="Hall of Validation coming soon">
          Hall of Validation <span className={styles.soonBadge}>soon</span>
        </div>
        <AccountIndicator />
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

export function ValidationWorkspace() {
  const [view, setView] = useState<View>("generator");
  const [decision, setDecision] = useState("");
  const [style, setStyle] = useState<ValidationStyle>("strong");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [source, setSource] = useState<GenerationSource>("demo");
  const [model, setModel] = useState("gpt-5.6-luna");
  const [notice, setNotice] = useState<string | undefined>();
  const [sharePath, setSharePath] = useState<string | undefined>();
  const [error, setError] = useState("");
  const trimmedDecision = decision.trim();

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
      setSharePath(parsed.sharePath);
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
      <ValidationResultView
        result={result}
        source={source}
        model={model}
        notice={notice}
        sharePath={sharePath}
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
