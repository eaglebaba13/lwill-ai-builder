import type { ReactNode } from "react";
import {
  OperationsEmptyState,
  OperationsPanel,
  OperationsWorkspace,
} from "./operations-workspace";

export const BillingWorkspace = OperationsWorkspace;
export const BillingPanel = OperationsPanel;
export const BillingEmptyState = OperationsEmptyState;

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function BillingStatusBadge({
  paidCents,
  totalCents,
}: {
  readonly paidCents?: number;
  readonly totalCents: number;
}) {
  const status = paidCents === undefined ? "Payment not loaded" : paidCents >= totalCents ? "Paid" : paidCents > 0 ? "Partially paid" : "Open";
  const toneClass = paidCents === undefined
    ? "border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] text-[#d8d0bd]"
    : paidCents >= totalCents
    ? "border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#70d391]"
    : paidCents > 0
      ? "border-[rgba(224,168,59,0.3)] bg-[rgba(224,168,59,0.12)] text-[#e0b45d]"
      : "border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] text-[#d8d0bd]";

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{status}</span>;
}

export function BillingTotals({
  subtotalCents,
  discountCents = 0,
  gstCents = 0,
  totalCents,
  paidCents,
}: {
  readonly subtotalCents: number;
  readonly discountCents?: number;
  readonly gstCents?: number;
  readonly totalCents: number;
  readonly paidCents?: number;
}) {
  const rows: Array<{ label: string; value: number; emphasis?: boolean }> = [
    { label: "Subtotal", value: subtotalCents },
    { label: "Discount", value: discountCents },
    { label: "GST", value: gstCents },
    { label: "Total", value: totalCents, emphasis: true },
  ];
  if (paidCents !== undefined) {
    rows.push(
      { label: "Paid", value: paidCents },
      { label: "Balance due", value: Math.max(0, totalCents - paidCents), emphasis: true },
    );
  }

  return (
    <dl className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className={`flex items-center justify-between gap-4 ${row.emphasis ? "border-t border-[rgba(212,175,55,0.14)] pt-2 font-semibold text-[#f5f1e6]" : "text-[#a39a86]"}`}>
          <dt>{row.label}</dt>
          <dd className="tabular-nums">{formatMoney(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BillingDownloadActions({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
