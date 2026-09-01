"use client";

import { useState } from "react";

export interface SidebarItem {
  readonly label: string;
  readonly active?: boolean;
  readonly onClick?: () => void;
}

export interface AppSidebarProps {
  readonly brandName: string;
  readonly brandSubtitle?: string;
  readonly logoSrc?: string;
  readonly items: readonly SidebarItem[];
  readonly bottomItems?: readonly SidebarItem[];
  readonly className?: string;
}

export function AppSidebar({ brandName, brandSubtitle, logoSrc, items, bottomItems, className }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#0d0c0a] text-[#a39a86] md:hidden"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle navigation"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          {collapsed ? (
            <path d="M4 4l10 10M14 4L4 14" />
          ) : (
            <path d="M2 4h14M2 9h14M2 14h14" />
          )}
        </svg>
      </button>

      {/* Backdrop */}
      {collapsed ? (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setCollapsed(false)} />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[rgba(212,175,55,0.12)] bg-[#0a0a09] transition-transform duration-200 md:relative md:translate-x-0 ${
          collapsed ? "translate-x-0" : "-translate-x-full"
        } ${className ?? ""}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-[rgba(212,175,55,0.1)] px-5 py-5">
          {logoSrc ? (
            <img src={logoSrc} alt={brandName} className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#9c7a1e] to-[#d4af37] text-sm font-bold text-[#080807]">
              {brandName.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#f5f1e6]">{brandName}</div>
            {brandSubtitle ? (
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#a39a86]">{brandSubtitle}</div>
            ) : null}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setCollapsed(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  item.active
                    ? "border border-[rgba(212,175,55,0.3)] bg-[#171511] text-[#d4af37]"
                    : "border border-transparent text-[#a39a86] hover:border-[rgba(212,175,55,0.12)] hover:bg-[#12110f] hover:text-[#f5f1e6]"
                }`}
              >
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom items */}
        {bottomItems && bottomItems.length > 0 ? (
          <div className="border-t border-[rgba(212,175,55,0.1)] px-3 py-3">
            <div className="space-y-0.5">
              {bottomItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick?.();
                    setCollapsed(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    item.active
                      ? "border border-[rgba(212,175,55,0.3)] bg-[#171511] text-[#d4af37]"
                      : "border border-transparent text-[#a39a86] hover:border-[rgba(212,175,55,0.12)] hover:bg-[#12110f] hover:text-[#f5f1e6]"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
