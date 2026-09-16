"use client";

export interface AppHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly eyebrow?: string;
  readonly rightContent?: React.ReactNode;
  readonly commandContent?: React.ReactNode;
  readonly statusContent?: React.ReactNode;
}

export function AppHeader({ title, subtitle, eyebrow, rightContent, commandContent, statusContent }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(212,175,55,0.10)] bg-[#080807]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0 pl-12 md:pl-0">
          {eyebrow ? <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">{eyebrow}</div> : null}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight text-[#f5f1e6] sm:text-2xl">{title}</h1>
            {statusContent ? <div className="flex shrink-0 items-center gap-2">{statusContent}</div> : null}
          </div>
          {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-[#a39a86]">{subtitle}</p> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {commandContent ? <div className="min-w-0 sm:w-[min(24rem,36vw)]">{commandContent}</div> : null}
          {rightContent ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{rightContent}</div> : null}
        </div>
      </div>
    </header>
  );
}
