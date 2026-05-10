type CompactStatCardProps = {
  label: string;
  value: string;
  description?: string;
  borderColor: "emerald" | "rose" | "blue" | "amber" | "slate";
  trend?: {
    value: string;
    positive: boolean;
  };
};

const borderClass = {
  emerald: "border-l-emerald-500",
  rose: "border-l-rose-500",
  blue: "border-l-blue-500",
  amber: "border-l-amber-500",
  slate: "border-l-slate-400",
};

export function CompactStatCard({ label, value, description, borderColor, trend }: CompactStatCardProps) {
  return (
    <article className={`rounded-lg border border-l-4 border-slate-200 bg-white px-5 py-4 ${borderClass[borderColor]}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748b]">{label}</p>
      <p className="font-display text-2xl font-extrabold leading-none text-[#0a1f5c]">{value}</p>
      {description ? <p className="mt-1.5 text-xs font-medium text-[#64748b]">{description}</p> : null}
      {trend ? (
        <p className={`mt-1 text-xs font-semibold ${trend.positive ? "text-emerald-700" : "text-rose-700"}`}>
          {trend.value}
        </p>
      ) : null}
    </article>
  );
}
