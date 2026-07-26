/**
 * Fixed categorical order (validated palette — see dataviz skill,
 * references/palette.md). Assign by a stable entity key, never by sort
 * rank, so a category keeps its color as data changes.
 */
export const CATEGORICAL_CHART_COLORS = [
  "var(--chart-1)", // blue
  "var(--chart-2)", // orange
  "var(--chart-3)", // aqua
  "var(--chart-4)", // yellow
  "var(--chart-5)", // magenta
  "var(--chart-6)", // green
  "var(--chart-7)", // violet
  "var(--chart-8)", // red
] as const

export function getCategoricalColor(index: number) {
  return CATEGORICAL_CHART_COLORS[index % CATEGORICAL_CHART_COLORS.length]
}
