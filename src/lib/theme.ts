import { cn } from '@/lib/utils';

/* ============================================================================
 * Semantic design tokens.
 * A tiny subset of CSS custom properties is defined in index.css and consumed
 * here so status colours stay consistent across badges, dots, bars and charts.
 * ==========================================================================*/

export const STATUS_STYLES = {
  Good: {
    label: 'Good',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    hex: '#10b981',
    soft: '#d1fae5',
  },
  'Attention Required': {
    label: 'Attention Required',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    solid: 'bg-amber-500',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
    soft: '#fef3c7',
  },
  Critical: {
    label: 'Critical',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    solid: 'bg-red-500',
    dot: 'bg-red-500',
    hex: '#ef4444',
    soft: '#fee2e2',
  },
} as const;

export type StatusKey = keyof typeof STATUS_STYLES;

/* ----------------------------- generic tones ------------------------------ */

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export const TONE_STYLES: Record<
  Tone,
  { text: string; bg: string; border: string; hex: string; soft: string; solid: string; dot: string }
> = {
  neutral: {
    text: 'text-ink-700',
    bg: 'bg-ink-100',
    border: 'border-ink-200',
    hex: '#66738c',
    soft: '#eceef2',
    solid: 'bg-ink-500',
    dot: 'bg-ink-400',
  },
  info: {
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hex: '#2563eb',
    soft: '#dbeafe',
    solid: 'bg-blue-500',
    dot: 'bg-blue-500',
  },
  success: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hex: '#10b981',
    soft: '#d1fae5',
    solid: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  warning: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hex: '#f59e0b',
    soft: '#fef3c7',
    solid: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  danger: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    hex: '#ef4444',
    soft: '#fee2e2',
    solid: 'bg-red-500',
    dot: 'bg-red-500',
  },
  accent: {
    text: 'text-safety-700',
    bg: 'bg-safety-50',
    border: 'border-safety-200',
    hex: '#f97316',
    soft: '#ffedd5',
    solid: 'bg-safety-500',
    dot: 'bg-safety-500',
  },
};

/* --------------------- value → tone mapping (tables) ---------------------
 * Rules are evaluated top-down; the first match wins, so the most specific
 * (and most severe) values must be listed first. A single alternation regex
 * per tone keeps precedence explicit and avoids the duplicate-alternation bugs
 * that arise from overlapping per-value rules.
 * ------------------------------------------------------------------------*/

const TONE_RULES: { match: RegExp; tone: Tone }[] = [
  {
    match: /^(critical|critical status|overdue|failed|fail|defective|rejected|non-?compliant|breach)$/i,
    tone: 'danger',
  },
  {
    match: /^(high|attention required|attention|required|conditional pass|due|under repair|expired|not started|pending approval|partially compliant|major non-?compliance)$/i,
    tone: 'warning',
  },
  {
    match: /^(good|completed|complete|closed|verified|serviceable|pass|passed|satisfactory|effective|active|on track|compliant|resolved|acceptable)$/i,
    tone: 'success',
  },
  {
    match: /^(open|in progress|pending|pending approval|scheduled|not conducted|under review|in review|medium|awaiting verification|upcoming|planned)$/i,
    tone: 'info',
  },
  {
    match: /^(low|minor|informational|information|positive observation|informative|informational only|observation|low risk)$/i,
    tone: 'neutral',
  },
];

export function toneForValue(value: string | null | undefined): Tone {
  if (!value) return 'neutral';
  for (const rule of TONE_RULES) {
    if (rule.match.test(value.trim())) return rule.tone;
  }
  return 'neutral';
}

export function statusTone(status: string | null | undefined): Tone {
  return toneForValue(status);
}

/* ------------------------------ chart palette ----------------------------- */

export const CHART_COLORS = {
  navy: '#1e3a5f',
  blue: '#2563eb',
  teal: '#0d9488',
  safety: '#f97316',
  amber: '#f59e0b',
  red: '#ef4444',
  green: '#10b981',
  violet: '#7c3aed',
  pink: '#db2777',
  slate: '#66738c',
};

export const SERIES_COLORS: Record<string, string> = {
  accidents: CHART_COLORS.red,
  nearMisses: CHART_COLORS.amber,
  safetyObservations: CHART_COLORS.blue,
  lostTimeInjuries: CHART_COLORS.safety,
  firstAid: CHART_COLORS.violet,
  recordable: CHART_COLORS.navy,
  inspections: CHART_COLORS.teal,
  capaRaised: CHART_COLORS.blue,
  capaOverdue: CHART_COLORS.red,
  trainingCompliance: CHART_COLORS.green,
  ppeCompliance: CHART_COLORS.blue,
};

export const AXIS_STYLE = {
  stroke: '#b0b8c8',
  fontSize: 11,
  tick: { fill: '#66738c' },
} as const;

export const GRID_STYLE = {
  stroke: '#eceef2',
  strokeDasharray: '3 3',
} as const;

/* --------------------------- chart surface tokens ------------------------ */

export const SURFACE = cn('bg-white');
