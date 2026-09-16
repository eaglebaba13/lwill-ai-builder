import type { ReactNode } from "react";

type CrmWorkspaceProps = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly stats?: ReadonlyArray<{
    readonly label: string;
    readonly value: string | number;
    readonly tone?: "neutral" | "success" | "warning" | "danger";
  }>;
  readonly children: ReactNode;
};

type CrmPanelProps = {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
};

type CrmBadgeProps = {
  readonly children: ReactNode;
  readonly tone?: "neutral" | "success" | "warning" | "danger";
};

type EmptyStateProps = {
  readonly title: string;
  readonly description?: string;
};

const statToneClass = {
  neutral: "border-[rgba(212,175,55,0.16)] text-[#f5f1e6]",
  success: "border-[rgba(63,174,106,0.26)] text-[#70d391]",
  warning: "border-[rgba(224,168,59,0.28)] text-[#e0b45d]",
  danger: "border-[rgba(209,85,74,0.28)] text-[#e47a70]",
} as const;

const badgeToneClass = {
  neutral: "border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.1)] text-[#d4af37]",
  success: "border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#70d391]",
  warning: "border-[rgba(224,168,59,0.3)] bg-[rgba(224,168,59,0.12)] text-[#e0b45d]",
  danger: "border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] text-[#e47a70]",
} as const;

function toHeadingId(title: string) {
  return `${title.replace(/\s+/g, "-").toLowerCase()}-title`;
}

export function CrmWorkspace({ eyebrow, title, description, stats = [], children }: CrmWorkspaceProps) {
  const headingId = toHeadingId(title);

  return (
    <section className="dashboard-enter mt-6 space-y-5" aria-labelledby={headingId}>
      <div className="rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[linear-gradient(135deg,rgba(18,17,15,0.96),rgba(13,12,10,0.98))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">{eyebrow}</div>
            <h2 id={headingId} className="mt-2 text-2xl font-semibold tracking-normal text-[#f5f1e6]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#a39a86]">{description}</p>
          </div>
          {stats.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
              {stats.map((stat) => (
                <div key={stat.label} className={`rounded-xl border bg-[#0d0c0a] px-3 py-2 ${statToneClass[stat.tone ?? "neutral"]}`}>
                  <div className="text-xs uppercase tracking-[0.14em] text-[#807866]">{stat.label}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function CrmPanel({ title, eyebrow, description, action, children, className = "" }: CrmPanelProps) {
  return (
    <div className={`dashboard-card-enter rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[#12110f] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.2)] ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#807866]">{eyebrow}</div> : null}
          <h3 className="text-lg font-semibold text-[#f5f1e6]">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-[#a39a86]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function CrmBadge({ children, tone = "neutral" }: CrmBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badgeToneClass[tone]}`}>
      {children}
    </span>
  );
}

export function CrmEmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(212,175,55,0.18)] bg-[#0d0c0a] px-4 py-6 text-center">
      <div className="text-sm font-medium text-[#f5f1e6]">{title}</div>
      {description ? <div className="mt-1 text-sm text-[#a39a86]">{description}</div> : null}
    </div>
  );
}
