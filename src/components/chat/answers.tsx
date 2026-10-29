import { Badge } from '../catalyst/badge';
import type { Answer } from '../../api/types';

export function ConfidenceBadge({ value }: { value: number }) {
  const level = value >= 0.75 ? 'High' : value >= 0.45 ? 'Medium' : 'Low';
  const color = level === 'High' ? 'emerald' : level === 'Medium' ? 'amber' : 'rose';
  return (
    <Badge color={color}>
      {level} confidence {value.toFixed(2)}
    </Badge>
  );
}

export function ProbabilityBar({
  label,
  detail,
  probability,
  selected,
  color,
}: {
  label: string;
  detail?: string;
  probability: number;
  selected: boolean;
  color: 'indigo' | 'amber';
}) {
  const percent = Math.round(probability * 1000) / 10;
  const width = `${Math.min(100, Math.max(0, probability * 100))}%`;
  const fill = color === 'indigo' ? 'bg-indigo-500' : 'bg-amber-500';
  const ring = color === 'indigo' ? 'ring-indigo-500/70' : 'ring-amber-500/70';

  return (
    <div
      className={`rounded-lg px-2 py-1.5 ${selected ? `bg-zinc-950/5 ring-1 dark:bg-white/5 ${ring}` : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-950 dark:text-white">
              {label}
            </span>
            {selected ? <Badge color={color}>Selected</Badge> : null}
          </div>
          {detail ? (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm text-zinc-600 tabular-nums dark:text-zinc-300">
          {percent}%
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10"
        aria-hidden="true"
      >
        <div className={`h-full rounded-full ${fill}`} style={{ width }} />
      </div>
    </div>
  );
}

export function NoulGauge({ value }: { value: number }) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-4xl font-semibold tracking-tight text-zinc-950 tabular-nums dark:text-white">
          {clamped.toFixed(2)}
        </p>
        <p className="pb-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {noulWord(clamped)}
        </p>
      </div>
      <div
        className="relative mt-3 h-2.5 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={clamped}
        aria-label="Probability of yes"
      >
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-950 shadow-sm dark:border-zinc-900"
          style={{ left: `${clamped * 100}%` }}
        />
      </div>
      <div className="relative mt-2 h-4 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="absolute left-0">No · 0</span>
        <span className="absolute left-[30%] -translate-x-1/2">0.3</span>
        <span className="absolute left-[70%] -translate-x-1/2">0.7</span>
        <span className="absolute right-0">1 · Yes</span>
      </div>
    </div>
  );
}

function noulWord(value: number): string {
  if (value >= 0.85) return 'Strong yes';
  if (value >= 0.7) return 'Leaning yes';
  if (value <= 0.15) return 'Strong no';
  if (value <= 0.3) return 'Leaning no';
  return 'Uncertain';
}

export function AnswerBody({ answer }: { answer: Answer }) {
  if (answer.type === 'choice') {
    const entries = Object.entries(answer.probabilities);
    return (
      <div className="space-y-2">
        <ConfidenceBadge value={answer.confidence} />
        <div className="space-y-1">
          {entries.map(([name, probability]) => (
            <ProbabilityBar
              key={name}
              label={name}
              probability={probability}
              selected={name === answer.choice}
              color="indigo"
            />
          ))}
        </div>
      </div>
    );
  }

  if (answer.type === 'score') {
    const keys = Object.keys(answer.probabilities);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-4xl font-semibold tracking-tight text-zinc-950 tabular-nums dark:text-white">
            {answer.score.toFixed(2)}
          </p>
          <ConfidenceBadge value={answer.confidence} />
        </div>
        <div className="space-y-1">
          {keys.map((key) => (
            <ProbabilityBar
              key={key}
              label={`${key}. ${answer.legend[key] ?? ''}`}
              probability={answer.probabilities[key] ?? 0}
              selected={key === winningKey(answer.probabilities)}
              color="amber"
            />
          ))}
        </div>
      </div>
    );
  }

  if (answer.type === 'noul') {
    return <NoulGauge value={answer.noul} />;
  }

  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">Box answers are outside this app.</p>
  );
}

function winningKey(probabilities: Record<string, number>): string {
  let best = '';
  let bestValue = -1;
  for (const [key, value] of Object.entries(probabilities)) {
    if (value > bestValue) {
      best = key;
      bestValue = value;
    }
  }
  return best;
}
