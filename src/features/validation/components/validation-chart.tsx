import type { ValidationChartPoint } from "../validation.types";

import styles from "./validation-chart.module.css";

interface ValidationChartProps {
  points: ValidationChartPoint[];
}

const WIDTH = 800;
const HEIGHT = 230;
const HORIZONTAL_PADDING = 34;
const TOP_PADDING = 28;
const BOTTOM_PADDING = 35;

export function ValidationChart({ points }: ValidationChartProps) {
  const drawableWidth = WIDTH - HORIZONTAL_PADDING * 2;
  const drawableHeight = HEIGHT - TOP_PADDING - BOTTOM_PADDING;
  const coordinates = points.map((point, index) => ({
    x:
      HORIZONTAL_PADDING +
      (index / Math.max(1, points.length - 1)) * drawableWidth,
    y: TOP_PADDING + ((100 - point.value) / 100) * drawableHeight,
  }));
  const linePath = coordinates
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");
  const areaPath = `${linePath} L${coordinates.at(-1)?.x ?? 0},${HEIGHT - BOTTOM_PADDING} L${coordinates[0]?.x ?? 0},${HEIGHT - BOTTOM_PADDING} Z`;
  const decisionIndex = Math.min(3, coordinates.length - 1);
  const decisionPoint = coordinates[decisionIndex];

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="A fabricated validation index trending upward after the decision"
    >
      {[25, 50, 75, 100].map((value) => {
        const y = TOP_PADDING + ((100 - value) / 100) * drawableHeight;
        return (
          <g key={value}>
            <line
              className={styles.gridLine}
              x1={HORIZONTAL_PADDING}
              x2={WIDTH - HORIZONTAL_PADDING}
              y1={y}
              y2={y}
            />
            <text className={styles.axisLabel} x={4} y={y + 4}>
              {value}
            </text>
          </g>
        );
      })}
      <path
        className={styles.baseline}
        d={`M${HORIZONTAL_PADDING},${HEIGHT - BOTTOM_PADDING - 52} L${WIDTH - HORIZONTAL_PADDING},${HEIGHT - BOTTOM_PADDING - 52}`}
      />
      <path className={styles.area} d={areaPath} />
      <path className={styles.line} d={linePath} />
      {decisionPoint ? (
        <g>
          <line
            className={styles.decisionLine}
            x1={decisionPoint.x}
            x2={decisionPoint.x}
            y1={TOP_PADDING}
            y2={HEIGHT - BOTTOM_PADDING}
          />
          <circle
            className={styles.decisionPoint}
            cx={decisionPoint.x}
            cy={decisionPoint.y}
            r={5}
          />
          <text
            className={styles.label}
            x={decisionPoint.x}
            y={18}
            textAnchor="middle"
          >
            decision made
          </text>
        </g>
      ) : null}
      {points.map((point, index) => (
        <text
          className={styles.axisLabel}
          key={`${point.label}-${index}`}
          x={coordinates[index]?.x}
          y={HEIGHT - 8}
          textAnchor={
            index === 0
              ? "start"
              : index === points.length - 1
                ? "end"
                : "middle"
          }
        >
          {index === 0 || index === points.length - 1 || index === decisionIndex
            ? point.label
            : ""}
        </text>
      ))}
    </svg>
  );
}
