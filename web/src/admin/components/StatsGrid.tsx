"use client";

import type { IconType } from "react-icons";

export type DashboardStat = { label: string; value: string; hint?: string; icon: IconType };

const StatsGrid = ({ stats }: { stats: DashboardStat[] }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map(({ label, value, hint, icon: Icon }) => (
      <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-gray-500">{label}</p>
          <span className="rounded-lg bg-gray-100 p-2">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-4 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
      </div>
    ))}
  </div>
);

export default StatsGrid;
