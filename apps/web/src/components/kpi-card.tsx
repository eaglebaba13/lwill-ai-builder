export interface KpiCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle?: string;
}

export function KpiCard({ title, value, subtitle }: KpiCardProps) {
  return (
    <div className="premium-card premium-kpi-accent p-5">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-[#f5f1e6]">{value}</div>
      {subtitle ? (
        <div className="mt-1 text-sm text-[#a39a86]">{subtitle}</div>
      ) : null}
    </div>
  );
}

export function KpiCardGold({ title, value, subtitle }: KpiCardProps) {
  return (
    <div className="premium-card premium-kpi-accent p-5">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#a39a86]">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-[#d4af37]">{value}</div>
      {subtitle ? (
        <div className="mt-1 text-sm text-[#a39a86]">{subtitle}</div>
      ) : null}
    </div>
  );
}
