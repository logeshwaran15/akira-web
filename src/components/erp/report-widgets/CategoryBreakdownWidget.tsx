import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CategoryCount } from "@/lib/report-layout";
import { CHART_COLORS, ChartPanel } from "./ChartWidget";

export function CategoryBreakdownWidget({
  title,
  counts,
  preferPie,
}: {
  title: string;
  counts: CategoryCount[];
  preferPie?: boolean;
}) {
  const distinct = counts.length;
  const asPie = preferPie ?? distinct <= 4;
  return (
    <ChartPanel title={title}>
      {asPie ? (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={counts}
              dataKey="count"
              nameKey="value"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
            >
              {counts.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={counts}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="value" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  );
}
