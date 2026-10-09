"use client";

import { money } from "../../shared/money";

type Day = { date: string; orders: number; revenue: number };

/** Simple bar chart drawn with SVG: revenue for each of the last days. */
const SalesChart = ({ days }: { days: Day[] }) => {
  const max = Math.max(1, ...days.map((day) => day.revenue));
  const width = 700;
  const height = 200;
  const barWidth = width / days.length;
  return (
    <svg viewBox={`0 0 ${width} ${height + 28}`} className="w-full" role="img" aria-label="Revenue for the last 14 days">
      {days.map((day, index) => {
        const barHeight = (day.revenue / max) * height;
        return (
          <g key={day.date}>
            <title>{`${day.date}: ${money(day.revenue)} from ${day.orders} orders`}</title>
            <rect x={index * barWidth + 6} y={height - barHeight} width={barWidth - 12} height={barHeight} rx={4} fill="#111827" opacity={day.revenue ? 1 : 0.12} />
            <text x={index * barWidth + barWidth / 2} y={height + 18} textAnchor="middle" fontSize="11" fill="#6b7280">
              {day.date.slice(8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default SalesChart;
