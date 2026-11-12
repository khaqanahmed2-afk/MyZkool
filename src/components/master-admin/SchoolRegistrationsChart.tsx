import React, { useState, useMemo } from "react";
import { School, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RegistrationTrendPoint } from "../../types/masterAdmin";

interface SchoolRegistrationsChartProps {
  timeline: RegistrationTrendPoint[];
  totalSchools: number;
  trendPercent: number | null;
  loading?: boolean;
}

interface ChartPoint extends RegistrationTrendPoint {
  x: number;
  y: number;
}

const WIDTH = 460;
const HEIGHT = 160;
const PADDING_X = 20;
const PADDING_Y = 25;

function computeChartGeometry(
  timeline: RegistrationTrendPoint[],
  totalSchools: number
): { points: ChartPoint[]; pathD: string; areaD: string } {
  if (timeline.length === 0) {
    return { points: [], pathD: "", areaD: "" };
  }

  const counts = timeline.map((pt) => pt.count);
  const minVal = Math.min(...counts, 0);
  const maxVal = Math.max(...counts, totalSchools, 1);
  const range = maxVal - minVal || 1;

  const points: ChartPoint[] = timeline.map((pt, idx) => {
    const x = PADDING_X + (idx / Math.max(1, timeline.length - 1)) * (WIDTH - 2 * PADDING_X);
    const y = HEIGHT - PADDING_Y - ((pt.count - minVal) / range) * (HEIGHT - 2 * PADDING_Y);
    return { x, y, ...pt };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cpX = (prev.x + curr.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${HEIGHT - PADDING_Y} L ${points[0].x} ${HEIGHT - PADDING_Y} Z`
      : "";

  return { points, pathD, areaD };
}

function RegistrationTrendBadge({ trendPercent }: { trendPercent: number | null }) {
  if (trendPercent === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200/60">
        <Minus className="w-3 h-3" />
        Cumulative
      </span>
    );
  }

  const isPositive = trendPercent >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full border ${
        isPositive
          ? "text-emerald-600 bg-emerald-50 border-emerald-200/60"
          : "text-rose-600 bg-rose-50 border-rose-200/60"
      }`}
    >
      {trendPercent !== 0 ? (
        isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
      ) : (
        <Minus className="w-3 h-3" />
      )}
      {isPositive ? "+" : ""}
      {trendPercent}%
    </span>
  );
}

export const SchoolRegistrationsChart: React.FC<SchoolRegistrationsChartProps> = ({
  timeline,
  totalSchools,
  trendPercent,
  loading = false,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<RegistrationTrendPoint | null>(null);

  const { points, pathD, areaD } = useMemo(
    () => computeChartGeometry(timeline, totalSchools),
    [timeline, totalSchools]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs h-full animate-pulse">
        <div className="h-5 w-36 bg-slate-100 rounded mb-2" />
        <div className="h-8 w-24 bg-slate-100 rounded mb-4" />
        <div className="h-44 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">School Registrations</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            Registration Trend
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-slate-900 font-heading">{totalSchools}</span>
          <RegistrationTrendBadge trendPercent={trendPercent} />
          <span className="text-xs text-slate-400 ml-1">Total registered schools</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-44 mt-2">
        {timeline.length > 0 ? (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="schoolAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={PADDING_X} y1={PADDING_Y} x2={WIDTH - PADDING_X} y2={PADDING_Y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={PADDING_X} y1={HEIGHT / 2} x2={WIDTH - PADDING_X} y2={HEIGHT / 2} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={PADDING_X} y1={HEIGHT - PADDING_Y} x2={WIDTH - PADDING_X} y2={HEIGHT - PADDING_Y} stroke="#E2E8F0" strokeWidth="1" />

            {/* Area Fill */}
            {areaD && <path d={areaD} fill="url(#schoolAreaGrad)" />}

            {/* Line Stroke */}
            {pathD && <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />}

            {/* Data Points */}
            {points.map((pt, i) => (
              <g
                key={`${pt.date}-${pt.count}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={i === points.length - 1 ? 4.5 : 3}
                  fill="#FFFFFF"
                  stroke="#2563EB"
                  strokeWidth={i === points.length - 1 ? 2.5 : 1.5}
                />
              </g>
            ))}

            {/* X Axis Labels */}
            {points.map((pt, i) => {
              if (i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)) {
                return (
                  <text
                    key={`label-${pt.date}`}
                    x={pt.x}
                    y={HEIGHT - 8}
                    textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                    className="text-[10px] fill-slate-400 font-medium"
                  >
                    {pt.date}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No registration timeline points available.
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg pointer-events-none">
            {hoveredPoint.date}: {hoveredPoint.count} school{hoveredPoint.count !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
};
