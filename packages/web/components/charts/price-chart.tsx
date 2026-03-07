"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId, useState } from "react";

interface DataPoint {
  date: string;
  price: number;
}

interface PriceChartProps {
  data: DataPoint[];
  currency?: string;
}

const timeframes = ["1W", "1M", "3M", "1Y", "All"] as const;
type Timeframe = (typeof timeframes)[number];

function filterData(data: DataPoint[], timeframe: Timeframe): DataPoint[] {
  if (timeframe === "All" || data.length === 0) return data;
  const now = new Date();
  const cutoff = new Date(now);
  if (timeframe === "1W") cutoff.setDate(now.getDate() - 7);
  else if (timeframe === "1M") cutoff.setMonth(now.getMonth() - 1);
  else if (timeframe === "3M") cutoff.setMonth(now.getMonth() - 3);
  else if (timeframe === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

function formatPrice(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function PriceChart({ data, currency = "USD" }: PriceChartProps) {
  const gradientId = useId();
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");
  const filtered = filterData(data, timeframe);

  const prices = filtered.map((d) => d.price);
  const minPrice = Math.min(...prices) * 0.995;
  const maxPrice = Math.max(...prices) * 1.005;

  const firstPrice = filtered[0]?.price ?? 0;
  const lastPrice = filtered[filtered.length - 1]?.price ?? 0;
  const isUp = lastPrice >= firstPrice;

  const color = isUp ? "#34d399" : "#f87171"; // emerald-400 / red-400

  return (
    <div>
      <div className="mb-4 flex gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              timeframe === tf
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={filtered} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tickFormatter={(v: number) => formatPrice(v, currency)}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => [formatPrice(Number(value), currency), "Price"]}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            }
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
