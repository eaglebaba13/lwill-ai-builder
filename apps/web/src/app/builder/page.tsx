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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-200 bg-white md:block">
          <div className="p-4">
            <div className="text-lg font-semibold tracking-tight text-slate-900">
              AI Builder
            </div>
            <div className="mt-1 text-xs text-slate-500">Platform preview</div>
          </div>
          <nav className="mt-4 space-y-1 px-3">
            {["Projects", "Templates", "Settings", "Documentation"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {item}
                </div>
              ),
            )}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-sm font-medium text-slate-500">
                  Workspace
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  New project
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  Preview
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h1 className="text-2xl font-semibold text-slate-900">
                AI-assisted application builder
              </h1>
              <p className="mt-3 text-slate-600">
                Describe your application in plain language. The platform analyzes
                requirements, selects modules, designs the database schema, generates
                APIs and UI, produces documentation, and guides you through validation
                and approval before deployment.
              </p>

              <div className="mt-8">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Generation workflow
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {workflow.map((step, index) => (
                    <div
                      key={step}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="text-xs font-semibold text-slate-400">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-700">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-6">
                <div className="text-sm font-semibold text-indigo-900">
                  Current status
                </div>
                <p className="mt-2 text-sm text-indigo-800">
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
