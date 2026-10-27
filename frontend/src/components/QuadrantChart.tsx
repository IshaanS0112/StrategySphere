/**
 * The GE-McKinsey grid, drawn once. Three views plot different marks on the
 * same axes - a placement, a portfolio of bubbles, a migration path - and each
 * used to redraw the frame itself.
 */

export const MIN = 1;
export const MAX = 5;
export const LOW = 2.5;
export const HIGH = 3.5;

const MONO = "Geist Mono, ui-monospace, monospace";

export interface Scales {
  scaleX: (value: number) => number;
  scaleY: (value: number) => number;
}

export function makeScales(size: number, pad: number): Scales {
  const span = size - 2 * pad;
  return {
    scaleX: (value) => pad + ((value - MIN) / (MAX - MIN)) * span,
    // SVG y grows downward; attractiveness should grow upward.
    scaleY: (value) => size - pad - ((value - MIN) / (MAX - MIN)) * span,
  };
}

/** Corner labels rather than a detached legend, which is one more eye trip. */
const CORNERS: {
  text: string;
  x: number;
  y: number;
  anchor: "start" | "end";
  fill: string;
}[] = [
  { text: "SELECTIVE", x: MIN, y: MAX, anchor: "start", fill: "var(--text-subtle)" },
  { text: "INVEST / GROW", x: MAX, y: MAX, anchor: "end", fill: "var(--success)" },
  { text: "HARVEST / DIVEST", x: MIN, y: MIN, anchor: "start", fill: "var(--danger)" },
];

export function QuadrantFrame({
  size,
  pad,
  corners = true,
}: {
  size: number;
  pad: number;
  corners?: boolean;
}) {
  const { scaleX, scaleY } = makeScales(size, pad);

  return (
    <g>
      {/* A wash on the two decided quadrants, so the verdict reads at a glance. */}
      {[
        [MIN, LOW, MIN, LOW, "var(--danger)"],
        [HIGH, MAX, HIGH, MAX, "var(--success)"],
      ].map(([x0, x1, y0, y1, fill]) => (
        <rect
          key={String(fill)}
          x={scaleX(Number(x0))}
          y={scaleY(Number(y1))}
          width={scaleX(Number(x1)) - scaleX(Number(x0))}
          height={scaleY(Number(y0)) - scaleY(Number(y1))}
          fill={String(fill)}
          fillOpacity={0.06}
        />
      ))}

      <rect
        x={pad}
        y={pad}
        width={size - 2 * pad}
        height={size - 2 * pad}
        fill="none"
        stroke="var(--border)"
      />

      {/* Thresholds are the rule the verdict comes from, so they read stronger
          than the frame. */}
      {[LOW, HIGH].map((value) => (
        <g key={value} stroke="var(--border-strong)" strokeDasharray="2 4">
          <line x1={scaleX(value)} y1={pad} x2={scaleX(value)} y2={size - pad} />
          <line x1={pad} y1={scaleY(value)} x2={size - pad} y2={scaleY(value)} />
        </g>
      ))}

      {[MIN, LOW, HIGH, MAX].map((value) => (
        <g key={`tick-${value}`} fontSize="9" fill="var(--text-subtle)" fontFamily={MONO}>
          <text x={scaleX(value)} y={size - pad + 16} textAnchor="middle">
            {value}
          </text>
          <text x={pad - 9} y={scaleY(value) + 3} textAnchor="end">
            {value}
          </text>
        </g>
      ))}

      {corners
        ? CORNERS.map(({ text, x, y, anchor, fill }) => (
            <text
              key={text}
              x={anchor === "start" ? scaleX(x) + 6 : scaleX(x) - 6}
              y={y === MAX ? scaleY(y) + 14 : scaleY(y) - 8}
              textAnchor={anchor}
              fontSize="8.5"
              letterSpacing="1"
              fill={fill}
              opacity={fill === "var(--text-subtle)" ? 1 : 0.75}
            >
              {text}
            </text>
          ))
        : null}

      <text
        x={size / 2}
        y={size - 6}
        textAnchor="middle"
        fontSize="10"
        fill="var(--muted-foreground)"
      >
        Competitive strength →
      </text>
      <text
        x={14}
        y={size / 2}
        textAnchor="middle"
        fontSize="10"
        fill="var(--muted-foreground)"
        transform={`rotate(-90 14 ${size / 2})`}
      >
        Market attractiveness →
      </text>
    </g>
  );
}
