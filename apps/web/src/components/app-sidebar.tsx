"use client";

import { useId, useState } from "react";

export type SidebarIconKey =
  | "overview"
  | "crm"
  | "operations"
  | "inventory"
  | "team"
  | "business"
  | "franchise"
  | "platform"
  | "admin";

export interface SidebarItem {
  readonly label: string;
  readonly active?: boolean;
  readonly onClick?: () => void;
  readonly icon?: SidebarIconKey;
  readonly description?: string;
}

export interface SidebarSection {
  readonly label: string;
  readonly items: readonly SidebarItem[];
}

export interface AppSidebarProps {
  readonly brandName: string;
  readonly brandSubtitle?: string;
  readonly logoSrc?: string;
  readonly items?: readonly SidebarItem[];
  readonly sections?: readonly SidebarSection[];
  readonly bottomItems?: readonly SidebarItem[];
  readonly workspaceLabel?: string;
  readonly className?: string;
}

function SidebarIcon({ icon = "overview" }: { readonly icon?: SidebarIconKey }) {
  const common = "h-4 w-4";

  switch (icon) {
    case "crm":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 8a4 4 0 1 0 0.01 0Z" /><path d="M17 10a3 3 0 1 0 0.01 0Z" /><path d="M3 20a4 4 0 0 1 8 0" /><path d="M14 20a3.5 3.5 0 0 1 7 0" /></svg>;
    case "operations":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>;
    case "inventory":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 8l8-4 8 4-8 4-8-4Z" /><path d="M4 8v8l8 4 8-4V8" /><path d="M12 12v8" /></svg>;
    case "team":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case "business":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h8v18" /><path d="M14 9h4a2 2 0 0 1 2 2v10" /><path d="M8 7h2M8 11h2M8 15h2M17 13h1M17 17h1" /></svg>;
    case "franchise":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3l8 4v6c0 4-3.2 6.8-8 8-4.8-1.2-8-4-8-8V7l8-4Z" /><path d="M9 12h6" /><path d="M12 9v6" /></svg>;
    case "platform":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 5h7v7H4z" /><path d="M13 5h7v7h-7z" /><path d="M4 14h7v5H4z" /><path d="M13 14h7v5h-7z" /></svg>;
    case "admin":
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6l-.03.04a2 2 0 1 1-3.94 0L10 20a1.8 1.8 0 0 0-1-.6 1.8 1.8 0 0 0-1.98.36l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1l-.04-.03a2 2 0 1 1 0-3.94L4 10a1.8 1.8 0 0 0 .6-1 1.8 1.8 0 0 0-.36-1.98l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6l.03-.04a2 2 0 1 1 3.94 0L14 4a1.8 1.8 0 0 0 1 .6 1.8 1.8 0 0 0 1.98-.36l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.8 1.8 0 0 0 19.4 9c.07.38.27.73.6 1l.04.03a2 2 0 1 1 0 3.94L20 14c-.33.27-.53.62-.6 1Z" /></svg>;
    case "overview":
    default:
      return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 13h7V4H4z" /><path d="M13 20h7V4h-7z" /><path d="M4 20h7v-5H4z" /></svg>;
  }
}

function SidebarNavItem({ item, onSelect, collapsed }: { readonly item: SidebarItem; readonly onSelect: () => void; readonly collapsed: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onSelect();
      }}
      title={collapsed ? item.label : undefined}
      aria-current={item.active ? "page" : undefined}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium outline-none transition-[border-color,background,color,transform] duration-200 focus-visible:border-[rgba(212,175,55,0.65)] focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.22)] ${
        item.active
          ? "border-[rgba(212,175,55,0.34)] bg-[rgba(212,175,55,0.10)] text-[#f5f1e6] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-transparent text-[#a39a86] hover:border-[rgba(212,175,55,0.16)] hover:bg-[#14120f] hover:text-[#f5f1e6]"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${item.active ? "border-[rgba(212,175,55,0.34)] bg-[#1f1a10] text-[#d4af37]" : "border-[rgba(212,175,55,0.10)] bg-[#0d0c0a] text-[#7a7266] group-hover:text-[#d4af37]"}`}>
        <SidebarIcon icon={item.icon} />
      </span>
      <span className={`${collapsed ? "sr-only" : "min-w-0 flex-1"}`}>
        <span className="block truncate">{item.label}</span>
        {item.description ? <span className="mt-0.5 block truncate text-[11px] font-normal text-[#7a7266]">{item.description}</span> : null}
      </span>
    </button>
  );
}

export function AppSidebar({ brandName, brandSubtitle, logoSrc, items = [], sections, bottomItems, workspaceLabel = "Workspace", className }: AppSidebarProps) {
  const sidebarId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const navigationSections = (sections ?? [{ label: "Navigation", items }]).filter((section) => section.items.length > 0);

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (isCollapsed: boolean) => (
    <>
      <div className={`flex items-center gap-3 border-b border-[rgba(212,175,55,0.10)] px-4 py-4 ${isCollapsed ? "justify-center" : ""}`}>
        {logoSrc ? (
          <div className="h-10 w-10 rounded-xl border border-[rgba(212,175,55,0.18)] bg-center bg-contain bg-no-repeat" style={{ backgroundImage: `url(${logoSrc})` }} aria-hidden="true" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8f6f1b] via-[#d4af37] to-[#f1d78c] text-sm font-bold text-[#080807] shadow-[0_12px_32px_rgba(212,175,55,0.12)]">
            {brandName.charAt(0)}
          </div>
        )}
        <div className={isCollapsed ? "sr-only" : "min-w-0"}>
          <div className="truncate text-sm font-semibold tracking-tight text-[#f5f1e6]">{brandName}</div>
          {brandSubtitle ? <div className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[#a39a86]">{brandSubtitle}</div> : null}
        </div>
      </div>

      <div className={`border-b border-[rgba(212,175,55,0.08)] px-4 py-3 ${isCollapsed ? "text-center" : ""}`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a7266]">{isCollapsed ? "LW" : workspaceLabel}</div>
        {!isCollapsed ? <div className="mt-1 truncate text-xs text-[#a39a86]">Tenant preview dashboard</div> : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        <div className="space-y-5">
          {navigationSections.map((section) => (
            <section key={section.label} aria-label={section.label}>
              <div className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f675b] ${isCollapsed ? "sr-only" : ""}`}>{section.label}</div>
              <div className="space-y-1">
                {section.items.map((item) => <SidebarNavItem key={item.label} item={item} onSelect={closeMobile} collapsed={isCollapsed} />)}
              </div>
            </section>
          ))}
        </div>
      </nav>

      {bottomItems && bottomItems.length > 0 ? (
        <div className="border-t border-[rgba(212,175,55,0.10)] px-3 py-3">
          <div className="space-y-1">
            {bottomItems.map((item) => <SidebarNavItem key={item.label} item={item} onSelect={closeMobile} collapsed={isCollapsed} />)}
          </div>
        </div>
      ) : null}

      <div className="hidden border-t border-[rgba(212,175,55,0.08)] px-3 py-3 md:block">
        <button
          type="button"
          onClick={() => setDesktopCollapsed((current) => !current)}
          aria-label={desktopCollapsed ? "Expand navigation" : "Collapse navigation"}
          className="flex w-full items-center justify-center rounded-xl border border-[rgba(212,175,55,0.10)] bg-[#0d0c0a] px-3 py-2 text-[#a39a86] transition-colors duration-200 hover:border-[rgba(212,175,55,0.22)] hover:text-[#f5f1e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.22)]"
        >
          <svg className={`h-4 w-4 transition-transform duration-200 ${desktopCollapsed ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          {!desktopCollapsed ? <span className="ml-2 text-xs font-medium">Collapse</span> : null}
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.22)] bg-[#0d0c0a] text-[#d4af37] shadow-[0_14px_36px_rgba(0,0,0,0.34)] transition-colors duration-200 hover:bg-[#171511] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.28)] md:hidden"
        onClick={() => setMobileOpen((current) => !current)}
        aria-label="Toggle navigation"
        aria-controls={sidebarId}
        aria-expanded={mobileOpen}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          {mobileOpen ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M2 4h14M2 9h14M2 14h14" />}
        </svg>
      </button>

      {mobileOpen ? <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] md:hidden" onClick={closeMobile} /> : null}

      <aside
        id={sidebarId}
        className={`fixed left-0 top-0 z-40 flex h-screen w-[18rem] flex-col border-r border-[rgba(212,175,55,0.12)] bg-[#090908]/98 shadow-[28px_0_70px_rgba(0,0,0,0.36)] transition-[transform,width] duration-200 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:translate-x-0 md:rounded-2xl md:border md:bg-[#0a0a09]/96 md:shadow-[0_24px_80px_rgba(0,0,0,0.22)] ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${desktopCollapsed ? "md:w-[5.5rem]" : "md:w-[18rem]"} ${className ?? ""}`}
      >
        {sidebarContent(desktopCollapsed)}
      </aside>
    </>
  );
}
