export default function CorporatePage() {
  const products = [
    { name: "AI Builder", desc: "Generate applications from prompts" },
    { name: "CRM", desc: "Customer relationship management" },
    { name: "Inventory", desc: "Stock and warehouse management" },
    { name: "Finance", desc: "Accounting and billing" },
    { name: "HRMS", desc: "Human resources and payroll" },
    { name: "Workflow Automation", desc: "Business process orchestration" },
    { name: "Notifications", desc: "Multi-channel alerting" },
    { name: "Analytics / BI", desc: "Business intelligence and reporting" },
    { name: "Marketplace", desc: "Extensions and integrations" },
    { name: "Industry Clouds", desc: "Vertical-specific solutions" },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold tracking-tight text-slate-900">
            LWILL
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#products" className="hover:text-slate-900">Products</a>
            <a href="#platform" className="hover:text-slate-900">Platform</a>
            <a
              href="https://builder.lwill.in"
              className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Open AI Builder
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
            LWILL Ecosystem
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">
            Build enterprise applications with AI
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            LWILL AI Builder is a multi-tenant platform that transforms prompts into
            production-ready applications. From requirement analysis to deployment,
            accelerate delivery across CRM, inventory, finance, HRMS, and industry-specific clouds.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="https://builder.lwill.in"
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Launch AI Builder
            </a>
            <a
              href="#products"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Explore products
            </a>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
          Product ecosystem
        </h2>
        <p className="mt-3 text-slate-600">
          One platform, modular applications, unified data.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="rounded-2xl border border-slate-200 p-6 hover:border-slate-300"
            >
              <div className="text-base font-semibold text-slate-900">
                {product.name}
              </div>
              <div className="mt-2 text-sm text-slate-600">{product.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Multi-tenant by design
              </h2>
              <p className="mt-4 text-slate-600">
                Each tenant operates in an isolated environment with dedicated data
                boundaries, role-based access, and independent branding. The platform
                manages identity, authorization, and audit across all tenants.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Native authentication
              </h2>
              <p className="mt-4 text-slate-600">
                Secure cookie-based sessions, RS256 JWT access tokens, refresh-token
                rotation, and server-side session revocation. Fail-closed authorization
                with tenant, business-unit, and branch scopes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
          LWILL AI BUILDER v1
        </div>
      </footer>
    </main>
  );
}
