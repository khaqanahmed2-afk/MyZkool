import React from "react";
import { School, TrendingUp, ChevronDown } from "lucide-react";
import type { RegistrationTrendPoint } from "../../types/masterAdmin";

interface SchoolRegistrationsChartProps {
  timeline: RegistrationTrendPoint[];
  totalSchools: number;
  trendPercent: number;
}

export const SchoolRegistrationsChart: React.FC<SchoolRegistrationsChartProps> = ({
  timeline,
  totalSchools,
  trendPercent,
}) => {
  // SVG Area Line generation
  const width = 460;
  const height = 160;
  const paddingX = 20;
  const paddingY = 25;

  const counts = timeline.map((pt) => pt.count);
  const minVal = Math.min(...counts, 0);
  const maxVal = Math.max(...counts, totalSchools, 1);
  const range = maxVal - minVal || 1;

  const points = timeline.map((pt, idx) => {
    const x = paddingX + (idx / Math.max(1, timeline.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((pt.count - minVal) / range) * (height - 2 * paddingY);
    return { x, y, ...pt };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cpX = (prev.x + curr.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1]?.x} ${height - paddingY} L ${points[0]?.x} ${height - paddingY} Z`;

  const lastPoint = points[points.length - 1] || { x: width - paddingX, y: paddingY };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">School Registrations</h3>
          </div>
          <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <span>Last 30 Days</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-slate-900 font-heading">{totalSchools}</span>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
            <TrendingUp className="w-3 h-3" />
            +{trendPercent}%
          </span>
          <span className="text-xs text-slate-400 ml-1">Total registered schools</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-44 mt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="schoolAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#E2E8F0" strokeWidth="1" />

          {/* Area Fill */}
          <path d={areaD} fill="url(#schoolAreaGrad)" />

          {/* Line Stroke */}
          <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />

          {/* Data Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === points.length - 1 ? 4.5 : 3}
              fill="#FFFFFF"
              stroke="#2563EB"
              strokeWidth={i === points.length - 1 ? 2.5 : 1.5}
            />
          ))}

          {/* Badge over last point */}
          <g transform={`translate(${lastPoint.x - 36}, ${lastPoint.y - 28})`}>
            <rect width="72" height="20" rx="6" fill="#2563EB" />
            <text x="36" y="13.5" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              {totalSchools} Schools
            </text>
          </g>
        </svg>

        {/* X-axis date labels */}
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-2 font-medium">
          {timeline.map((pt, i) => (
            <span key={i}>{pt.date}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

