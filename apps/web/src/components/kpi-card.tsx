export interface KpiCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle?: string;
  readonly icon?: React.ReactNode;
  readonly tone?: "default" | "gold" | "success" | "warning" | "danger";
  readonly meta?: string;
}

const toneClassName = {
  default: "text-[#f5f1e6]",
  gold: "text-[#d4af37]",
  success: "text-[#3fae6a]",
  warning: "text-[#e0a83b]",
  danger: "text-[#d1554a]",
} as const;

export function KpiCard({ title, value, subtitle, icon, tone = "default", meta }: KpiCardProps) {
  return (
    <div className="premium-card premium-kpi-accent group p-5 transition-[border-color,background,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.28)] hover:bg-[#15130f] hover:shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-[#a39a86]">{title}</div>
          <div className={`mt-2 text-3xl font-semibold leading-none tracking-tight ${toneClassName[tone]}`}>{value}</div>
        </div>
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.12)] bg-[#0d0c0a] text-[#d4af37]">
            {icon}
          </div>
        ) : null}
      </div>
      {subtitle ? <div className="mt-3 text-sm text-[#a39a86]">{subtitle}</div> : null}
      {meta ? (
        <div className="mt-3 inline-flex rounded-full border border-[rgba(212,175,55,0.14)] bg-[#0d0c0a] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#7a7266]">
          {meta}
        </div>
      ) : null}
    </div>
  );
}

export function KpiCardGold(props: KpiCardProps) {
  return <KpiCard {...props} tone="gold" />;
}
