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
    <main className="min-h-screen bg-[#080807] text-[#f5f1e6]">
      <header className="border-b border-[rgba(212,175,55,0.1)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#9c7a1e] to-[#d4af37] text-sm font-bold text-[#080807]">L</div>
            <div className="text-sm font-semibold tracking-tight text-[#f5f1e6]">LWILL</div>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-[#a39a86]">
            <a href="#products" className="hover:text-[#f5f1e6]">Products</a>
            <a href="#platform" className="hover:text-[#f5f1e6]">Platform</a>
            <a
              href="https://builder.lwill.in"
              className="premium-btn-primary px-4 py-2"
            >
              Open AI Builder
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
            LWILL Ecosystem
          </p>
          <h1 className="mt-4 font-serif text-5xl font-semibold tracking-tight text-[#f5f1e6]">
            Build enterprise applications with AI
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[#a39a86]">
            LWILL AI Builder is a multi-tenant platform that transforms prompts into
            production-ready applications. From requirement analysis to deployment,
            accelerate delivery across CRM, inventory, finance, HRMS, and industry-specific clouds.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="https://builder.lwill.in"
              className="premium-btn-primary px-6 py-3"
            >
              Launch AI Builder
            </a>
            <a
              href="#products"
              className="premium-btn-secondary px-6 py-3"
            >
              Explore products
            </a>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#f5f1e6]">
          Product ecosystem
        </h2>
        <p className="mt-3 text-[#a39a86]">
          One platform, modular applications, unified data.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="premium-card p-6 transition-colors hover:border-[rgba(212,175,55,0.3)]"
            >
              <div className="text-base font-semibold text-[#f5f1e6]">
                {product.name}
              </div>
              <div className="mt-2 text-sm text-[#a39a86]">{product.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="border-t border-[rgba(212,175,55,0.1)] bg-[#0d0c0a]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#f5f1e6]">
                Multi-tenant by design
              </h2>
              <p className="mt-4 text-[#a39a86]">
                Each tenant operates in an isolated environment with dedicated data
                boundaries, role-based access, and independent branding. The platform
                manages identity, authorization, and audit across all tenants.
              </p>
            </div>
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#f5f1e6]">
                Native authentication
              </h2>
              <p className="mt-4 text-[#a39a86]">
                Secure cookie-based sessions, RS256 JWT access tokens, refresh-token
                rotation, and server-side session revocation. Fail-closed authorization
                with tenant, business-unit, and branch scopes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[rgba(212,175,55,0.1)]">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-[#a39a86]">
          LWILL AI BUILDER v1
        </div>
      </footer>
    </main>
  );
}
