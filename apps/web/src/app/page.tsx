"use client";

import { useState } from "react";

const navigation = [
  "Overview",
  "Business Ecosystem",
  "Platform Modules",
  "Business Intelligence",
  "Franchise",
  "Mobile Access",
  "Security",
  "Roadmap",
];

const modules = [
  {
    title: "Salon Operations",
    description: "Appointments, service workflows, staff allocation and customer management.",
  },
  {
    title: "Academy",
    description: "Courses, trainers, attendance, assessments and certification workflows.",
  },
  {
    title: "Retail & Inventory",
    description: "Product catalogue, stock movement, purchasing and retail operations.",
  },
  {
    title: "Franchise Management",
    description: "Central oversight of franchise locations, performance and operational compliance.",
  },
  {
    title: "Business Intelligence",
    description: "Management dashboards, KPIs and consolidated business reporting.",
  },
  {
    title: "Finance & Compliance",
    description: "Billing, expenses, GST-ready workflows and financial reporting foundations.",
  },
];

const dashboardCards = [
  ["Operations", "Multi-location control"],
  ["Revenue", "Consolidated reporting"],
  ["Customers", "Central CRM"],
  ["Inventory", "Stock visibility"],
];

export default function Home() {
  const [active, setActive] = useState("Overview");

  return (
    <main className="min-h-screen bg-[#fbf7f5] text-[#321824]">
      <header className="sticky top-0 z-50 border-b border-[#eadedb] bg-[#fbf7f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div>
            <div className="text-lg font-semibold tracking-tight">HDK Beauty</div>
            <div className="text-xs tracking-[0.18em] text-[#8c6c78]">
              X NAIL BUSINESS PLATFORM
            </div>
          </div>

          <nav className="hidden items-center gap-6 lg:flex">
            {navigation.map((item) => (
              <button
                key={item}
                onClick={() => setActive(item)}
                className={`text-sm transition ${
                  active === item
                    ? "font-semibold text-[#641f42]"
                    : "text-[#765f68] hover:text-[#641f42]"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-full border border-[#dbcacb] px-5 py-2 text-sm font-medium sm:block">
              ERP Login
            </button>
            <button className="rounded-full bg-[#5b183a] px-5 py-2 text-sm font-semibold text-white">
              Request Demo
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit rounded-full border border-[#dfc9cf] bg-white px-4 py-2 text-xs font-semibold tracking-[0.14em] text-[#6b3550]">
            HDK BEAUTY PVT. LTD.
          </div>

          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
            The operating platform for modern beauty businesses.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-[#765f68]">
            One connected platform for X Nail operations, academy management,
            retail, inventory, customers, finance and franchise oversight.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <button className="rounded-full bg-[#5b183a] px-7 py-3.5 text-sm font-semibold text-white">
              Explore Platform
            </button>
            <button className="rounded-full border border-[#cdbabd] bg-white px-7 py-3.5 text-sm font-semibold">
              View Franchise Dashboard
            </button>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 text-sm text-[#765f68] sm:grid-cols-4">
            {dashboardCards.map(([title, description]) => (
              <div key={title} className="border-l border-[#d8c5ca] pl-3">
                <div className="font-semibold text-[#321824]">{title}</div>
                <div className="mt-1 text-xs leading-5">{description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#eadedb] bg-white p-5 shadow-[0_25px_80px_rgba(73,35,48,0.10)]">
          <div className="rounded-[1.5rem] bg-[#f8f1ef] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Franchise Command Center</div>
                <div className="mt-1 text-xs text-[#92757f]">
                  Client preview · illustrative interface
                </div>
              </div>
              <div className="rounded-full bg-[#ead7df] px-3 py-1 text-[10px] font-semibold text-[#6b3550]">
                DEMO
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Locations", "Portfolio view"],
                ["Operations", "Branch health"],
                ["Revenue", "Consolidated"],
                ["Inventory", "Stock control"],
              ].map(([title, value]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-[#eadedb] bg-white p-4"
                >
                  <div className="text-xs text-[#92757f]">{title}</div>
                  <div className="mt-2 font-semibold">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#eadedb] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Franchise overview</span>
                <span className="text-xs text-[#92757f]">Preview data</span>
              </div>

              <div className="mt-5 space-y-3">
                {["Operations", "Customers", "Inventory", "Financials"].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl bg-[#faf7f6] px-4 py-3"
                    >
                      <span className="text-sm">{item}</span>
                      <span className="text-xs font-medium text-[#6b3550]">
                        {index === 0
                          ? "Configured"
                          : index === 1
                            ? "Ready"
                            : "Foundation"}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#eadedb] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-[0.16em] text-[#8c6174]">
              PLATFORM MODULES
            </div>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
              One operating system across the business.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <article
                key={module.title}
                className="rounded-3xl border border-[#eadedb] bg-[#fcf9f8] p-7"
              >
                <h3 className="text-lg font-semibold">{module.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#765f68]">
                  {module.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="rounded-[2rem] bg-[#42152c] px-8 py-12 text-white lg:px-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-xs font-semibold tracking-[0.16em] text-[#dfb9c8]">
                FRANCHISE NETWORK
              </div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
                Central control. Local execution.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-[#ead6dd]">
                A structured operating layer for franchise owners, managers and
                central leadership with tenant, business-unit and branch-level
                access control.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                "Branch Management",
                "Staff & Roles",
                "Business Intelligence",
                "Central Governance",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/15 bg-white/10 p-5 text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#eadedb] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-[#765f68] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>HDK Beauty Pvt. Ltd. · X Nail Business Platform</span>
          <span>Client Preview · Demo data only</span>
        </div>
      </footer>
    </main>
  );
}
