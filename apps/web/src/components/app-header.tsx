"use client";

export interface AppHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly rightContent?: React.ReactNode;
}

export function AppHeader({ title, subtitle, rightContent }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] bg-[#0a0a09]/95 px-6 py-4 backdrop-blur-sm">
      <div className="pl-10 md:pl-0">
        <h1 className="text-lg font-semibold tracking-tight text-[#f5f1e6]">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-[#a39a86]">{subtitle}</p>
        ) : null}
      </div>
      {rightContent ? <div className="flex items-center gap-3">{rightContent}</div> : null}
    </header>
  );
}
