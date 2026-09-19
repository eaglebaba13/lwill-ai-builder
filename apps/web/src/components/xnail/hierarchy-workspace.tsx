import type { ReactNode } from "react";

type HierarchyWorkspaceProps = {
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

type HierarchyPanelProps = {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
};

type HierarchyBadgeProps = {
  readonly children: ReactNode;
  readonly tone?: "neutral" | "success" | "warning" | "danger";
};

type HierarchyEmptyStateProps = {
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
  return `hierarchy-${title.replace(/\s+/g, "-").toLowerCase()}-title`;
}

export function HierarchyWorkspace({ eyebrow, title, description, stats = [], children }: HierarchyWorkspaceProps) {
  const headingId = toHeadingId(title);
  return (
    <section className="dashboard-enter mt-6 space-y-5" aria-labelledby={headingId}>
      <div className="rounded-2xl border border-[rgba(212,175,55,0.16)] bg-[linear-gradient(135deg,rgba(18,17,15,0.96),rgba(13,12,10,0.98))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">{eyebrow}</div>
            <h2 id={headingId} className="mt-2 text-2xl font-semibold tracking-normal text-[#f5f1e6]">{title}</h2>
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

export function HierarchyPanel({ title, eyebrow, description, action, children, className }: HierarchyPanelProps) {
  return (
    <div className={`rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[rgba(18,17,15,0.92)] p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#807866]">{eyebrow}</div> : null}
          <h3 className="text-lg font-semibold text-[#f5f1e6]">{title}</h3>
          {description ? <p className="mt-1 text-xs text-[#807866]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function HierarchyBadge({ children, tone = "neutral" }: HierarchyBadgeProps) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${badgeToneClass[tone]}`}>{children}</span>;
}

export function HierarchyEmptyState({ title, description }: HierarchyEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-sm font-medium text-[#a39a86]">{title}</div>
      {description ? <div className="mt-1 text-xs text-[#6b6356]">{description}</div> : null}
    </div>
  );
}

export function HierarchyButton({ children, onClick, variant = "primary", disabled, type = "button", className }: {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variant?: "primary" | "secondary" | "danger";
  readonly disabled?: boolean;
  readonly type?: "button" | "submit";
  readonly className?: string;
}) {
  const variantClass = {
    primary: "bg-[#d4af37] text-[#0d0c0a] hover:bg-[#c9a431] shadow-[0_6px_20px_rgba(212,175,55,0.2)]",
    secondary: "border border-[rgba(212,175,55,0.28)] bg-transparent text-[#d4af37] hover:bg-[rgba(212,175,55,0.08)]",
    danger: "bg-[rgba(209,85,74,0.15)] text-[#e47a70] border border-[rgba(209,85,74,0.3)] hover:bg-[rgba(209,85,74,0.25)]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${variantClass[variant]} disabled:opacity-40 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function HierarchyInput({ label, value, onChange, placeholder, type = "text", required, disabled, error }: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly error?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[#a39a86]">{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full rounded-lg border bg-[#0d0c0a] px-3 py-2 text-sm text-[#f5f1e6] placeholder:text-[#4a4540] focus:outline-none focus:ring-1 ${error ? "border-[rgba(209,85,74,0.5)] focus:ring-[rgba(209,85,74,0.4)]" : "border-[rgba(212,175,55,0.18)] focus:ring-[rgba(212,175,55,0.3)]"}`}
      />
      {error ? <span className="mt-0.5 block text-[0.65rem] text-[#e47a70]">{error}</span> : null}
    </label>
  );
}

export function HierarchySelect({ label, value, onChange, options, required, disabled, placeholder }: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[#a39a86]">{label}{required ? " *" : ""}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="mt-1 block w-full rounded-lg border border-[rgba(212,175,55,0.18)] bg-[#0d0c0a] px-3 py-2 text-sm text-[#f5f1e6] focus:outline-none focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function HierarchyTable({ children }: { readonly children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function HierarchyTableHead({ children }: { readonly children: ReactNode }) {
  return <thead className="border-b border-[rgba(212,175,55,0.1)] text-[0.7rem] uppercase tracking-[0.12em] text-[#807866]">{children}</thead>;
}

export function HierarchyTableBody({ children }: { readonly children: ReactNode }) {
  return <tbody className="divide-y divide-[rgba(212,175,55,0.06)]">{children}</tbody>;
}

export function HierarchyTableRow({ children, onClick }: { readonly children: ReactNode; readonly onClick?: () => void }) {
  return <tr onClick={onClick} className={`text-[#c4b99a] ${onClick ? "cursor-pointer hover:bg-[rgba(212,175,55,0.04)]" : ""}`}>{children}</tr>;
}

export function HierarchyTableCell({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <td className={`py-2.5 pr-3 ${className ?? ""}`}>{children}</td>;
}

export function HierarchyTableHeaderCell({ children }: { readonly children: ReactNode }) {
  return <th className="pb-2 pr-3 font-medium">{children}</th>;
}

export function HierarchyFormRow({ children }: { readonly children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function HierarchyDivider() {
  return <div className="border-t border-[rgba(212,175,55,0.08)] my-3" />;
}

export function HierarchyAlert({ children, tone = "warning" }: { readonly children: ReactNode; readonly tone?: "warning" | "danger" | "info" }) {
  const toneClass = {
    warning: "border-[rgba(224,168,59,0.3)] bg-[rgba(224,168,59,0.06)] text-[#e0b45d]",
    danger: "border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.06)] text-[#e47a70]",
    info: "border-[rgba(100,160,220,0.3)] bg-[rgba(100,160,220,0.06)] text-[#8ab8e6]",
  };
  return <div className={`rounded-lg border p-3 text-xs ${toneClass[tone]}`}>{children}</div>;
}

export function formatStatusBadge(status: string) {
  const map: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
    DRAFT: { label: "Draft", tone: "warning" },
    ACTIVE: { label: "Active", tone: "success" },
    SUSPENDED: { label: "Suspended", tone: "danger" },
    ENDED: { label: "Ended", tone: "neutral" },
  };
  return map[status] ?? { label: status, tone: "neutral" as const };
}
