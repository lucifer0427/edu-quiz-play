import { useState } from 'react';
import type { Question, VisualDiagramSpec } from '../types/quiz';

interface QuestionVisualProps {
  question: Question;
}

function toSafeNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function FractionBarSvg({ params }: { params: Record<string, number | string> }) {
  const denominator = Math.max(1, Math.min(12, Math.round(toSafeNumber(params.denominator, 4))));
  const numerator = Math.max(0, Math.min(denominator, Math.round(toSafeNumber(params.numerator, 1))));
  const label = typeof params.label === 'string' ? params.label : `${numerator}/${denominator}`;

  const width = 320;
  const barX = 24;
  const barY = 26;
  const barWidth = width - 48;
  const barHeight = 40;
  const cellWidth = barWidth / denominator;

  return (
    <svg
      viewBox="0 0 320 96"
      className="h-auto w-full max-w-xs"
      role="img"
      aria-label={`分數長條圖 ${label}`}
    >
      <text
        x={width / 2}
        y="17"
        textAnchor="middle"
        className="fill-slate-800 text-xs font-black"
      >
        {label}
      </text>
      {Array.from({ length: denominator }).map((_, idx) => {
        const filled = idx < numerator;
        return (
          <rect
            key={idx}
            x={barX + idx * cellWidth}
            y={barY}
            width={cellWidth}
            height={barHeight}
            fill={filled ? '#0ea5e9' : '#f8fafc'}
            stroke="#334155"
            strokeWidth="2"
          />
        );
      })}
      <text
        x={width / 2}
        y="84"
        textAnchor="middle"
        className="fill-slate-600 text-[11px] font-bold"
      >
        共分成 {denominator} 等份，著色 {numerator} 份
      </text>
    </svg>
  );
}

function RectGeometrySvg({ params }: { params: Record<string, number | string> }) {
  const widthLabel = String(params.widthLabel ?? params.width ?? '長');
  const heightLabel = String(params.heightLabel ?? params.height ?? '寬');
  const centerLabel = typeof params.centerLabel === 'string' ? params.centerLabel : '';

  return (
    <svg
      viewBox="0 0 320 140"
      className="h-auto w-full max-w-xs"
      role="img"
      aria-label={`幾何圖形 長 ${widthLabel} 寬 ${heightLabel}`}
    >
      <rect
        x="70"
        y="28"
        width="170"
        height="82"
        fill="#f0f9ff"
        stroke="#0f172a"
        strokeWidth="2.5"
      />
      <rect
        x="70"
        y="28"
        width="12"
        height="12"
        fill="none"
        stroke="#475569"
        strokeWidth="1.5"
      />
      <text
        x="155"
        y="20"
        textAnchor="middle"
        className="fill-slate-900 text-xs font-black"
      >
        {widthLabel}
      </text>
      <text
        x="252"
        y="73"
        textAnchor="start"
        className="fill-slate-900 text-xs font-black"
      >
        {heightLabel}
      </text>
      {centerLabel && (
        <text
          x="155"
          y="74"
          textAnchor="middle"
          className="fill-sky-800 text-xs font-black"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

function ClockFaceSvg({ params }: { params: Record<string, number | string> }) {
  const hour = toSafeNumber(params.hour, 3) % 12;
  const minute = Math.max(0, Math.min(59, toSafeNumber(params.minute, 0)));
  const hourAngle = ((hour + minute / 60) * 30 - 90) * (Math.PI / 180);
  const minuteAngle = (minute * 6 - 90) * (Math.PI / 180);

  const cx = 75;
  const cy = 75;
  const hourX = cx + Math.cos(hourAngle) * 30;
  const hourY = cy + Math.sin(hourAngle) * 30;
  const minX = cx + Math.cos(minuteAngle) * 44;
  const minY = cy + Math.sin(minuteAngle) * 44;

  return (
    <svg
      viewBox="0 0 150 150"
      className="h-36 w-36"
      role="img"
      aria-label={`時鐘 ${hour || 12} 點 ${minute} 分`}
    >
      <circle
        cx={cx}
        cy={cy}
        r="58"
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth="3"
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const num = i + 1;
        const ang = (num * 30 - 90) * (Math.PI / 180);
        const tx = cx + Math.cos(ang) * 46;
        const ty = cy + Math.sin(ang) * 46 + 4;
        return (
          <text
            key={num}
            x={tx}
            y={ty}
            textAnchor="middle"
            className="fill-slate-800 text-[10px] font-black"
          >
            {num}
          </text>
        );
      })}
      <line
        x1={cx}
        y1={cy}
        x2={hourX}
        y2={hourY}
        stroke="#0f172a"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1={cx}
        y1={cy}
        x2={minX}
        y2={minY}
        stroke="#0284c7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="4" fill="#0f172a" />
    </svg>
  );
}

function NumberLineSvg({ params }: { params: Record<string, number | string> }) {
  const min = toSafeNumber(params.min, 0);
  const max = Math.max(min + 1, toSafeNumber(params.max, 10));
  const step = Math.max(1, toSafeNumber(params.step, 1));
  const highlight = params.highlight !== undefined ? toSafeNumber(params.highlight, Number.NaN) : Number.NaN;

  const startX = 28;
  const endX = 292;
  const lineY = 48;
  const ticks: number[] = [];
  for (let v = min; v <= max && ticks.length < 13; v += step) {
    ticks.push(v);
  }
  const toX = (v: number) => startX + ((v - min) / (max - min)) * (endX - startX);

  return (
    <svg
      viewBox="0 0 320 84"
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label={`數線 ${min} 到 ${max}`}
    >
      <line
        x1={startX}
        y1={lineY}
        x2={endX}
        y2={lineY}
        stroke="#0f172a"
        strokeWidth="2.5"
      />
      {ticks.map((v) => {
        const x = toX(v);
        const isMarked = Number.isFinite(highlight) && Math.abs(v - highlight) < 1e-6;
        return (
          <g key={v}>
            <line
              x1={x}
              y1={lineY - 6}
              x2={x}
              y2={lineY + 6}
              stroke="#0f172a"
              strokeWidth="2"
            />
            {isMarked && <circle cx={x} cy={lineY} r="5" fill="#e11d48" />}
            <text
              x={x}
              y={lineY + 22}
              textAnchor="middle"
              className={`text-[11px] font-black ${isMarked ? 'fill-rose-600' : 'fill-slate-700'}`}
            >
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DiagramRenderer({ spec }: { spec: VisualDiagramSpec }) {
  switch (spec.type) {
    case 'fraction_bar':
      return <FractionBarSvg params={spec.params} />;
    case 'rect_geometry':
      return <RectGeometrySvg params={spec.params} />;
    case 'clock_face':
      return <ClockFaceSvg params={spec.params} />;
    case 'number_line':
      return <NumberLineSvg params={spec.params} />;
    default:
      return null;
  }
}

export function QuestionVisual({ question }: QuestionVisualProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imgFailed = Boolean(question.imageUrl && failedUrl === question.imageUrl);

  if (!question.visualDiagram && (!question.imageUrl || imgFailed)) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
      {question.visualDiagram && <DiagramRenderer spec={question.visualDiagram} />}
      {question.imageUrl && !imgFailed && (
        <img
          key={question.imageUrl}
          src={question.imageUrl}
          alt="題目圖解"
          onError={() => setFailedUrl(question.imageUrl ?? null)}
          className="max-h-56 w-auto rounded-lg bg-white object-contain"
        />
      )}
    </div>
  );
}
