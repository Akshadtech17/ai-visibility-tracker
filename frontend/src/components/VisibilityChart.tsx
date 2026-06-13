import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function VisibilityChart({
  data,
}: {
  data: { time: number; score: number }[];
}) {
  const formatted = data.map((d) => ({
    time: new Date(d.time).toLocaleTimeString(),
    score: d.score,
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <h3>📊 Visibility Trend</h3>

      <ResponsiveContainer>
        <LineChart data={formatted}>
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#4f46e5"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}