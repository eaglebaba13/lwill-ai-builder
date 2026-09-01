export default function BuilderPage() {
  const workflow = [
    "Prompt",
    "Requirement Analysis",
    "Module Selection",
    "Database Design",
    "API Generation",
    "UI Generation",
    "Documentation",
    "Validation",
    "Human Approval",
    "Deployment",
  ];

  return (
    <main className="min-h-screen bg-[#080807] text-[#f5f1e6]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-[rgba(212,175,55,0.12)] bg-[#0a0a09] md:block">
          <div className="flex items-center gap-3 border-b border-[rgba(212,175,55,0.1)] px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#9c7a1e] to-[#d4af37] text-sm font-bold text-[#080807]">L</div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#f5f1e6]">LWILL</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#a39a86]">AI Builder</div>
            </div>
          </div>
          <nav className="mt-4 space-y-1 px-3">
            {["Projects", "Templates", "Settings", "Documentation"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#a39a86] hover:border-[rgba(212,175,55,0.12)] hover:bg-[#12110f] hover:text-[#f5f1e6]"
                >
                  {item}
                </div>
              ),
            )}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-[rgba(212,175,55,0.1)] bg-[#0a0a09]/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="pl-10 md:pl-0">
                <div className="text-xs font-medium text-[#a39a86]">
                  Workspace
                </div>
                <div className="text-lg font-semibold text-[#f5f1e6]">
                  New project
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="premium-badge">
                  Preview
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="premium-card p-8">
              <h1 className="font-serif text-2xl font-semibold text-[#f5f1e6]">
                AI-assisted application builder
              </h1>
              <p className="mt-3 text-[#a39a86]">
                Describe your application in plain language. The platform analyzes
                requirements, selects modules, designs the database schema, generates
                APIs and UI, produces documentation, and guides you through validation
                and approval before deployment.
              </p>

              <div className="mt-8">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
                  Generation workflow
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {workflow.map((step, index) => (
                    <div
                      key={step}
                      className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4"
                    >
                      <div className="text-xs font-semibold text-[#d4af37]">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="mt-2 text-sm font-medium text-[#f5f1e6]">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-[rgba(224,168,59,0.3)] bg-[rgba(224,168,59,0.08)] p-6">
                <div className="text-sm font-semibold text-[#e0a83b]">
                  Current status
                </div>
                <p className="mt-2 text-sm text-[#a39a86]">
                  The AI Builder engine is not yet implemented. This page
                  demonstrates the intended product direction and workflow. Platform
                  infrastructure, authentication, and tenant isolation are operational.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
