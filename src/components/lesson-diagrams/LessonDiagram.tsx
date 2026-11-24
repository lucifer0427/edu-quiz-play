import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LessonVisualSpec, SpatialLabel } from '../../types/lesson';

interface LessonDiagramProps {
  spec: LessonVisualSpec;
}

type DiagramParams = Record<string, number | string | string[]>;

function numParam(params: DiagramParams, key: string, fallback: number): number {
  const raw = params[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function strParam(params: DiagramParams, key: string, fallback: string): string {
  const raw = params[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : fallback;
}

function listParam(params: DiagramParams, key: string): string[] {
  const raw = params[key];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function FractionBarTemplate({
  params,
  labels,
}: {
  params: DiagramParams;
  labels: SpatialLabel[];
}) {
  const denominator = Math.max(
    1,
    Math.min(12, Math.round(numParam(params, 'denominator', 4))),
  );
  const numerator = Math.max(
    0,
    Math.min(denominator, Math.round(numParam(params, 'numerator', 1))),
  );
  const scaleFactor = Math.max(
    1,
    Math.min(4, Math.round(numParam(params, 'scaleFactor', 1))),
  );

  const width = 360;
  const barX = 28;
  const barW = width - 56;
  const showExpanded = scaleFactor > 1;
  const expandedDen = denominator * scaleFactor;
  const expandedNum = numerator * scaleFactor;

  return (
    <svg
      viewBox={showExpanded ? '0 0 360 154' : '0 0 360 102'}
      className="h-auto w-full max-w-md"
      role="img"
      aria-label={`分數長條圖 ${numerator}/${denominator}`}
    >
      <text
        x={width / 2}
        y="18"
        textAnchor="middle"
        className="fill-slate-800 text-xs font-black"
      >
        {labels[0]?.text ?? `原分數：${numerator}/${denominator}`}
      </text>

      {Array.from({ length: denominator }).map((_, idx) => {
        const cellW = barW / denominator;
        const filled = idx < numerator;
        return (
          <rect
            key={idx}
            x={barX + idx * cellW}
            y={28}
            width={cellW}
            height={36}
            fill={filled ? '#0ea5e9' : '#f8fafc'}
            stroke="#334155"
            strokeWidth="2"
          />
        );
      })}

      {showExpanded ? (
        <>
          <text
            x={width / 2}
            y="84"
            textAnchor="middle"
            className="fill-emerald-800 text-xs font-black"
          >
            {labels[1]?.text ??
              `擴分 ×${scaleFactor} 後：${expandedNum}/${expandedDen}（等值）`}
          </text>
          {Array.from({ length: expandedDen }).map((_, idx) => {
            const cellW = barW / expandedDen;
            const filled = idx < expandedNum;
            return (
              <rect
                key={idx}
                x={barX + idx * cellW}
                y={94}
                width={cellW}
                height={36}
                fill={filled ? '#10b981' : '#f8fafc'}
                stroke="#334155"
                strokeWidth="1.8"
              />
            );
          })}
          <text
            x={width / 2}
            y="147"
            textAnchor="middle"
            className="fill-slate-600 text-[11px] font-bold"
          >
            {labels[2]?.text ??
              `著色長度完全相同：${numerator}/${denominator} = ${expandedNum}/${expandedDen}`}
          </text>
        </>
      ) : (
        <text
          x={width / 2}
          y="84"
          textAnchor="middle"
          className="fill-slate-600 text-[11px] font-bold"
        >
          {labels[1]?.text ?? `共 ${denominator} 等份，取其中 ${numerator} 份`}
        </text>
      )}
    </svg>
  );
}

function RectGeometryTemplate({
  params,
  labels,
}: {
  params: DiagramParams;
  labels: SpatialLabel[];
}) {
  const shape = strParam(params, 'shape', 'rect');
  const base = Math.max(2, Math.min(20, numParam(params, 'base', 6)));
  const topBase = Math.max(1, Math.min(18, numParam(params, 'topBase', 4)));
  const height = Math.max(2, Math.min(16, numParam(params, 'height', 4)));
  const unit = strParam(params, 'unit', 'cm');

  const drawW = Math.min(200, Math.max(96, base * 16));
  const drawH = Math.min(92, Math.max(54, height * 12));
  const cx = 180;
  const bottomY = 138;
  const topY = bottomY - drawH;
  const leftX = cx - drawW / 2;
  const rightX = cx + drawW / 2;

  let area = base * height;
  if (shape === 'triangle') area = (base * height) / 2;
  if (shape === 'trapezoid') area = ((topBase + base) * height) / 2;
  const areaText = Number.isInteger(area) ? String(area) : area.toFixed(1);

  const skew = shape === 'parallelogram' ? 28 : 0;
  const topW =
    shape === 'trapezoid'
      ? Math.max(48, Math.min(drawW - 20, (topBase / base) * drawW))
      : drawW;

  const baseLabel =
    labels.find((l) => l.anchorPointId === 'bottom')?.text ??
    `底 ${base} ${unit}`;
  const heightLabel =
    labels.find((l) => l.anchorPointId === 'height')?.text ??
    `高 ${height} ${unit}`;
  const topLabel =
    labels.find((l) => l.anchorPointId === 'top')?.text ??
    (shape === 'trapezoid' ? `上底 ${topBase} ${unit}` : '');

  return (
    <svg
      viewBox="0 0 360 176"
      className="h-auto w-full max-w-md"
      role="img"
      aria-label={`幾何圖形 底 ${base} 高 ${height}`}
    >
      {shape === 'triangle' ? (
        <>
          <polygon
            points={`${leftX},${bottomY} ${rightX},${bottomY} ${cx - 12},${topY}`}
            fill="#e0f2fe"
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          <line
            x1={cx - 12}
            y1={topY}
            x2={cx - 12}
            y2={bottomY}
            stroke="#e11d48"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <rect
            x={cx - 12}
            y={bottomY - 10}
            width="10"
            height="10"
            fill="none"
            stroke="#e11d48"
            strokeWidth="1.5"
          />
          <text
            x={cx + 6}
            y={topY + drawH / 2 + 4}
            className="fill-rose-700 text-xs font-black"
          >
            {heightLabel}
          </text>
        </>
      ) : shape === 'trapezoid' ? (
        <>
          <polygon
            points={`${cx - topW / 2},${topY} ${cx + topW / 2},${topY} ${rightX},${bottomY} ${leftX},${bottomY}`}
            fill="#fef3c7"
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          <line
            x1={cx - topW / 2 + 10}
            y1={topY}
            x2={cx - topW / 2 + 10}
            y2={bottomY}
            stroke="#e11d48"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <rect
            x={cx - topW / 2 + 10}
            y={bottomY - 10}
            width="10"
            height="10"
            fill="none"
            stroke="#e11d48"
            strokeWidth="1.5"
          />
          <text
            x={cx}
            y={topY - 8}
            textAnchor="middle"
            className="fill-slate-900 text-xs font-black"
          >
            {topLabel}
          </text>
          <text
            x={cx - topW / 2 + 16}
            y={topY + drawH / 2 + 4}
            className="fill-rose-700 text-xs font-black"
          >
            {heightLabel}
          </text>
        </>
      ) : (
        <>
          <polygon
            points={`${leftX + skew},${topY} ${rightX + skew},${topY} ${rightX},${bottomY} ${leftX},${bottomY}`}
            fill="#e0f2fe"
            stroke="#0f172a"
            strokeWidth="2.5"
          />
          <line
            x1={leftX + skew}
            y1={topY}
            x2={leftX + skew}
            y2={bottomY}
            stroke="#e11d48"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <rect
            x={leftX + skew}
            y={bottomY - 10}
            width="10"
            height="10"
            fill="none"
            stroke="#e11d48"
            strokeWidth="1.5"
          />
          <text
            x={leftX + skew + 14}
            y={topY + drawH / 2 + 4}
            className="fill-rose-700 text-xs font-black"
          >
            {heightLabel}
          </text>
        </>
      )}

      <text
        x={cx}
        y={bottomY + 18}
        textAnchor="middle"
        className="fill-slate-900 text-xs font-black"
      >
        {baseLabel}
      </text>
      <text
        x={cx}
        y="170"
        textAnchor="middle"
        className="fill-sky-800 text-xs font-black"
      >
        {labels.find((l) => l.anchorPointId === 'center')?.text ??
          `面積 = ${areaText} ${unit}²`}
      </text>
    </svg>
  );
}

function NumberLineTemplate({
  params,
  labels,
}: {
  params: DiagramParams;
  labels: SpatialLabel[];
}) {
  const min = Math.round(numParam(params, 'min', 0));
  const max = Math.max(min + 2, Math.round(numParam(params, 'max', 12)));
  const step = Math.max(1, Math.round(numParam(params, 'step', 1)));
  const stepA = Math.round(numParam(params, 'stepA', 0));
  const stepB = Math.round(numParam(params, 'stepB', 0));
  const highlight = numParam(params, 'highlight', Number.NaN);

  const startX = 26;
  const endX = 354;
  const lineY = 74;
  const toX = (v: number) => startX + ((v - min) / (max - min)) * (endX - startX);

  const ticks: number[] = [];
  for (let v = min; v <= max && ticks.length <= 25; v += step) {
    ticks.push(v);
  }

  const jumpsA: number[] = [];
  if (stepA > 0) {
    for (let v = min; v + stepA <= max; v += stepA) {
      jumpsA.push(v);
    }
  }

  const jumpsB: number[] = [];
  if (stepB > 0) {
    for (let v = min; v + stepB <= max; v += stepB) {
      jumpsB.push(v);
    }
  }

  const commonMultiples: number[] = [];
  if (stepA > 0 && stepB > 0) {
    const lcmVal = (stepA * stepB) / gcd(stepA, stepB);
    for (let v = lcmVal; v <= max; v += lcmVal) {
      commonMultiples.push(v);
    }
  }

  return (
    <svg
      viewBox="0 0 380 120"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label={`數線圖 ${min} 到 ${max}`}
    >
      {labels[0] && (
        <text
          x="190"
          y="16"
          textAnchor="middle"
          className="fill-slate-800 text-xs font-black"
        >
          {labels[0].text}
        </text>
      )}

      {jumpsA.map((v) => {
        const x1 = toX(v);
        const x2 = toX(v + stepA);
        const midX = (x1 + x2) / 2;
        return (
          <path
            key={`a-${v}`}
            d={`M ${x1} ${lineY} Q ${midX} ${lineY - 34} ${x2} ${lineY}`}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
          />
        );
      })}

      {jumpsB.map((v) => {
        const x1 = toX(v);
        const x2 = toX(v + stepB);
        const midX = (x1 + x2) / 2;
        return (
          <path
            key={`b-${v}`}
            d={`M ${x1} ${lineY} Q ${midX} ${lineY - 22} ${x2} ${lineY}`}
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        );
      })}

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
        const isCommon = commonMultiples.includes(v);
        const isMarked = Number.isFinite(highlight) && Math.abs(v - highlight) < 1e-6;
        return (
          <g key={v}>
            <line
              x1={x}
              y1={lineY - 5}
              x2={x}
              y2={lineY + 5}
              stroke="#0f172a"
              strokeWidth="1.8"
            />
            {(isCommon || isMarked) && (
              <circle
                cx={x}
                cy={lineY}
                r="5.5"
                fill={isCommon ? '#f59e0b' : '#e11d48'}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            )}
            <text
              x={x}
              y={lineY + 20}
              textAnchor="middle"
              className={`text-[10px] font-black ${
                isCommon || isMarked ? 'fill-rose-700' : 'fill-slate-700'
              }`}
            >
              {v}
            </text>
          </g>
        );
      })}

      {labels[1] && (
        <text
          x="190"
          y="113"
          textAnchor="middle"
          className="fill-slate-600 text-[11px] font-bold"
        >
          {labels[1].text}
        </text>
      )}
    </svg>
  );
}

function FlowCauseTemplate({
  params,
  labels,
}: {
  params: DiagramParams;
  labels: SpatialLabel[];
}) {
  const nodes = listParam(params, 'nodes');
  const displayNodes =
    nodes.length > 0 ? nodes.slice(0, 4) : labels.slice(0, 4).map((l) => l.text);
  const count = Math.max(2, displayNodes.length);
  const width = 440;
  const gap = 22;
  const boxW = (width - 24 - gap * (count - 1)) / count;

  return (
    <svg
      viewBox="0 0 440 108"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="解題步驟流程圖"
    >
      {displayNodes.map((text, idx) => {
        const x = 12 + idx * (boxW + gap);
        return (
          <g key={idx}>
            <rect
              x={x}
              y={18}
              width={boxW}
              height={62}
              rx="12"
              fill={idx === 0 ? '#e0f2fe' : idx === count - 1 ? '#dcfce7' : '#fef3c7'}
              stroke="#334155"
              strokeWidth="2"
            />
            <text
              x={x + boxW / 2}
              y={36}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-black"
            >
              步驟 {idx + 1}
            </text>
            <text
              x={x + boxW / 2}
              y={58}
              textAnchor="middle"
              className="fill-slate-900 text-xs font-black"
            >
              {text.length > 10 ? `${text.slice(0, 9)}…` : text}
            </text>
            {idx < count - 1 && (
              <path
                d={`M ${x + boxW + 4} 49 L ${x + boxW + gap - 4} 49 M ${x + boxW + gap - 9} 44 L ${x + boxW + gap - 4} 49 L ${x + boxW + gap - 9} 54`}
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
      {labels[0] && nodes.length > 0 && (
        <text
          x={width / 2}
          y="99"
          textAnchor="middle"
          className="fill-slate-600 text-[11px] font-bold"
        >
          {labels[0].text}
        </text>
      )}
    </svg>
  );
}

function ConceptCompareTemplate({
  params,
  labels,
}: {
  params: DiagramParams;
  labels: SpatialLabel[];
}) {
  const leftTitle = strParam(params, 'leftTitle', labels[0]?.text ?? '概念 A');
  const rightTitle = strParam(params, 'rightTitle', labels[1]?.text ?? '概念 B');
  const leftPoints = listParam(params, 'leftPoints');
  const rightPoints = listParam(params, 'rightPoints');

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <div className="rounded-xl border-2 border-sky-200 bg-sky-50/70 p-3">
        <div className="text-sm font-black text-sky-900">{leftTitle}</div>
        <ul className="mt-1.5 space-y-1 text-xs font-bold text-slate-700">
          {leftPoints.map((p, idx) => (
            <li key={idx}>• {p}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50/70 p-3">
        <div className="text-sm font-black text-amber-900">{rightTitle}</div>
        <ul className="mt-1.5 space-y-1 text-xs font-bold text-slate-700">
          {rightPoints.map((p, idx) => (
            <li key={idx}>• {p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ClockFaceTemplate({
  params,
  labels,
}: {
  params: DiagramParams;
  labels: SpatialLabel[];
}) {
  const hasAngle = params.angle !== undefined;
  const angle = Math.max(15, Math.min(360, numParam(params, 'angle', 90)));
  const cx = 90;
  const cy = 90;
  const r = 64;

  if (hasAngle) {
    const rad = ((angle - 90) * Math.PI) / 180;
    const endX = cx + Math.cos(rad) * r;
    const endY = cy + Math.sin(rad) * r;
    const largeArc = angle > 180 ? 1 : 0;
    const g = gcd(angle, 360);
    const fracLabel =
      angle >= 360 ? '1 個完整的圓' : `${angle / g}/${360 / g} 圓`;

    return (
      <svg
        viewBox="0 0 260 180"
        className="h-auto w-full max-w-xs"
        role="img"
        aria-label={`扇形圓心角 ${angle} 度`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth="2"
        />
        {angle >= 360 ? (
          <circle cx={cx} cy={cy} r={r} fill="#bae6fd" stroke="#0284c7" strokeWidth="2.5" />
        ) : (
          <path
            d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`}
            fill="#bae6fd"
            stroke="#0284c7"
            strokeWidth="2.5"
          />
        )}
        <circle cx={cx} cy={cy} r="4" fill="#0f172a" />
        <text x={cx + 8} y={cy + 14} className="fill-slate-900 text-[10px] font-black">
          {labels[0]?.text ?? '圓心'}
        </text>
        <text x="172" y="76" className="fill-sky-900 text-xs font-black">
          圓心角 {angle}°
        </text>
        <text x="172" y="98" className="fill-emerald-800 text-xs font-black">
          佔 {fracLabel}
        </text>
        {labels[1] && (
          <text x="172" y="120" className="fill-slate-600 text-[11px] font-bold">
            {labels[1].text}
          </text>
        )}
      </svg>
    );
  }

  const hour = numParam(params, 'hour', 3) % 12;
  const minute = Math.max(0, Math.min(59, numParam(params, 'minute', 0)));
  const hourAngle = ((hour + minute / 60) * 30 - 90) * (Math.PI / 180);
  const minuteAngle = (minute * 6 - 90) * (Math.PI / 180);

  return (
    <svg
      viewBox="0 0 180 180"
      className="h-44 w-44"
      role="img"
      aria-label={`時鐘 ${hour || 12} 點 ${minute} 分`}
    >
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
      {Array.from({ length: 12 }).map((_, i) => {
        const num = i + 1;
        const ang = (num * 30 - 90) * (Math.PI / 180);
        return (
          <text
            key={num}
            x={cx + Math.cos(ang) * 50}
            y={cy + Math.sin(ang) * 50 + 4}
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
        x2={cx + Math.cos(hourAngle) * 32}
        y2={cy + Math.sin(hourAngle) * 32}
        stroke="#0f172a"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(minuteAngle) * 48}
        y2={cy + Math.sin(minuteAngle) * 48}
        stroke="#0284c7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="4" fill="#0f172a" />
    </svg>
  );
}

function resolveDefaultInteractiveParam(spec: LessonVisualSpec) {
  if (spec.interactiveParam) return spec.interactiveParam;
  const p = spec.params ?? {};
  if (spec.templateId === 'number_line') {
    const min = Math.round(numParam(p, 'min', 0));
    const max = Math.max(min + 2, Math.round(numParam(p, 'max', 12)));
    const step = Math.max(1, Math.round(numParam(p, 'step', 1)));
    return {
      key: 'highlight',
      label: '數線跳格位置',
      min,
      max,
      step,
    };
  }
  if (spec.templateId === 'clock_face') {
    if (p.angle !== undefined) {
      return {
        key: 'angle',
        label: '調整圓心角',
        min: 15,
        max: 360,
        step: 15,
        unit: '°',
      };
    }
    return {
      key: 'minute',
      label: '轉動分針',
      min: 0,
      max: 55,
      step: 5,
      unit: '分',
    };
  }
  if (spec.templateId === 'fraction_bar') {
    const den = Math.max(1, Math.min(12, Math.round(numParam(p, 'denominator', 4))));
    return {
      key: 'numerator',
      label: '塗色分子數',
      min: 0,
      max: den,
      step: 1,
    };
  }
  return undefined;
}

export function LessonDiagram({ spec }: LessonDiagramProps) {
  const activeInteractive = resolveDefaultInteractiveParam(spec);
  const initialInteractiveVal = activeInteractive
    ? numParam(
        spec.params ?? {},
        activeInteractive.key,
        activeInteractive.min,
      )
    : 0;

  const [interactiveVal, setInteractiveVal] = useState<number>(
    initialInteractiveVal,
  );

  useEffect(() => {
    if (activeInteractive) {
      const hasExisting =
        spec.params && spec.params[activeInteractive.key] !== undefined;
      setInteractiveVal(
        hasExisting
          ? numParam(
              spec.params ?? {},
              activeInteractive.key,
              activeInteractive.min,
            )
          : activeInteractive.min,
      );
    }
  }, [spec]);

  const effectiveParams: DiagramParams = activeInteractive
    ? { ...(spec.params ?? {}), [activeInteractive.key]: interactiveVal }
    : (spec.params ?? {});

  const labels = spec.spatialLabels ?? [];

  const renderTemplate = () => {
    switch (spec.templateId) {
      case 'fraction_bar':
        return <FractionBarTemplate params={effectiveParams} labels={labels} />;
      case 'rect_geometry':
        return <RectGeometryTemplate params={effectiveParams} labels={labels} />;
      case 'number_line':
        return <NumberLineTemplate params={effectiveParams} labels={labels} />;
      case 'flow_cause':
        return <FlowCauseTemplate params={effectiveParams} labels={labels} />;
      case 'concept_compare':
        return (
          <ConceptCompareTemplate params={effectiveParams} labels={labels} />
        );
      case 'clock_face':
        return <ClockFaceTemplate params={effectiveParams} labels={labels} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
      {renderTemplate()}

      {activeInteractive && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2">
          <span className="text-xs font-black text-sky-900">
            {activeInteractive.label}：
          </span>
          <button
            type="button"
            disabled={interactiveVal <= activeInteractive.min}
            onClick={() =>
              setInteractiveVal((prev) =>
                Math.max(
                  activeInteractive.min,
                  prev - activeInteractive.step,
                ),
              )
            }
            aria-label={`減少 ${activeInteractive.label}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-800 hover:bg-sky-100 disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3.5rem] text-center text-sm font-black text-slate-900">
            {interactiveVal}
            {activeInteractive.unit ? ` ${activeInteractive.unit}` : ''}
          </span>
          <button
            type="button"
            disabled={interactiveVal >= activeInteractive.max}
            onClick={() =>
              setInteractiveVal((prev) =>
                Math.min(
                  activeInteractive.max,
                  prev + activeInteractive.step,
                ),
              )
            }
            aria-label={`增加 ${activeInteractive.label}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-800 hover:bg-sky-100 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
