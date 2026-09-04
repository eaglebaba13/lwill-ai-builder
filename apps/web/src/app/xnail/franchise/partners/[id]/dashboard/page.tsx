"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface PartnerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  panNumber: string | null;
  gstin: string | null;
  isActive: boolean;
  outletCount: number;
  agreementCount: number;
}

interface Agreement {
  id: string;
  partnerId: string;
  territoryId: string;
  partnerName: string;
  territoryName: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  outletCount: number;
}

interface Outlet {
  id: string;
  partnerId: string;
  branchId: string;
  partnerName: string;
  branchName: string;
  territoryName: string | null;
  outletType: string | null;
  isActive: boolean;
}

export default function PartnerDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [partnerRes, agreementsRes, outletsRes] = await Promise.all([
          fetch(`/api/franchise/partners/${id}`, { credentials: "same-origin" }),
          fetch("/api/franchise/agreements", { credentials: "same-origin" }),
          fetch("/api/franchise/outlets", { credentials: "same-origin" }),
        ]);
        if (!mounted) return;
        if (partnerRes.status === 401 || agreementsRes.status === 401 || outletsRes.status === 401) {
          router.push("/xnail");
          return;
        }
        if (partnerRes.status === 404) {
          setError("Partner not found.");
          setLoading(false);
          return;
        }
        if (!partnerRes.ok || !agreementsRes.ok || !outletsRes.ok) {
          setError("Failed to load partner data.");
          setLoading(false);
          return;
        }
        const partnerBody = await partnerRes.json() as { partner: PartnerData };
        const agreementsBody = await agreementsRes.json() as { agreements: Agreement[] };
        const outletsBody = await outletsRes.json() as { outlets: Outlet[] };
        setPartner(partnerBody.partner);
        setAgreements((agreementsBody.agreements ?? []).filter((a) => a.partnerId === id));
        setOutlets((outletsBody.outlets ?? []).filter((o) => o.partnerId === id));
      } catch {
        if (mounted) setError("Failed to load partner data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080807] text-[#f5f1e6] flex items-center justify-center">
        <div className="text-sm text-[#a39a86]">Loading partner dashboard...</div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-[#080807] text-[#f5f1e6] flex items-center justify-center">
        <div className="rounded-2xl border border-[rgba(209,85,74,0.3)] bg-[rgba(209,85,74,0.12)] p-6 text-center">
          <div className="text-lg font-semibold text-[#d1554a]">{error ?? "Partner not found"}</div>
          <a href="/xnail" className="mt-4 inline-block text-sm text-[#d4af37] hover:underline">Back to X Nail</a>
        </div>
      </div>
    );
  }

  const activeAgreements = agreements.filter((a) => a.isActive);
  const activeOutlets = outlets.filter((o) => o.isActive);
  const territories = [...new Set(agreements.map((a) => a.territoryName))];

  return (
    <div className="min-h-screen bg-[#080807] text-[#f5f1e6]">
      <header className="sticky top-0 z-20 border-b border-[rgba(212,175,55,0.1)] bg-[#0a0a09]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#9c7a1e] to-[#d4af37] text-sm font-bold text-[#080807]">X</div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#f5f1e6]">{partner.name}</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#a39a86]">Franchise Partner Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${partner.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{partner.isActive ? "Active" : "Inactive"}</span>
            {partner.email ? <a href={`mailto:${partner.email}`} className="rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#17150f] px-3 py-1.5 text-xs font-medium text-[#d4af37] hover:bg-[#1f1d15]">Email</a> : null}
            {partner.phone ? <a href={`tel:${partner.phone}`} className="rounded-lg border border-[rgba(212,175,55,0.2)] bg-[#17150f] px-3 py-1.5 text-xs font-medium text-[#d4af37] hover:bg-[#1f1d15]">Call</a> : null}
            {partner.phone ? <a href={`https://wa.me/${partner.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.08)] px-3 py-1.5 text-xs font-medium text-[#3fae6a] hover:bg-[rgba(63,174,106,0.15)]">WhatsApp</a> : null}
            <a href="/xnail" className="premium-btn-secondary px-3 py-1.5 text-xs">Back to X Nail</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#121110] p-5">
            <div className="text-xs text-[#a39a86]">Active Outlets</div>
            <div className="mt-1 text-2xl font-bold text-[#d4af37]">{activeOutlets.length}</div>
            <div className="text-xs text-[#a39a86]">of {outlets.length} total</div>
          </div>
          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#121110] p-5">
            <div className="text-xs text-[#a39a86]">Active Agreements</div>
            <div className="mt-1 text-2xl font-bold text-[#d4af37]">{activeAgreements.length}</div>
            <div className="text-xs text-[#a39a86]">of {agreements.length} total</div>
          </div>
          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#121110] p-5">
            <div className="text-xs text-[#a39a86]">Territories</div>
            <div className="mt-1 text-2xl font-bold text-[#d4af37]">{territories.length}</div>
            <div className="text-xs text-[#a39a86]">{territories.join(", ") || "N/A"}</div>
          </div>
            <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#121110] p-5">
            <div className="text-xs text-[#a39a86]">Partner Since</div>
            <div className="mt-1 text-sm font-medium text-[#f5f1e6]">—</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#121110] p-5">
          <h3 className="text-lg font-semibold text-[#f5f1e6]">Partner Profile</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-xs text-[#a39a86]">Name</div>
              <div className="mt-1 text-sm text-[#f5f1e6]">{partner.name}</div>
            </div>
            <div>
              <div className="text-xs text-[#a39a86]">Email</div>
              <div className="mt-1 text-sm text-[#f5f1e6]">{partner.email ?? "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-[#a39a86]">Phone</div>
              <div className="mt-1 text-sm text-[#f5f1e6]">{partner.phone ?? "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-[#a39a86]">Address</div>
              <div className="mt-1 text-sm text-[#f5f1e6]">{partner.address ?? "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-[#a39a86]">PAN</div>
              <div className="mt-1 text-sm text-[#f5f1e6]">{partner.panNumber ?? "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-[#a39a86]">GSTIN</div>
              <div className="mt-1 text-sm text-[#f5f1e6]">{partner.gstin ?? "N/A"}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#121110] p-5">
            <h3 className="text-lg font-semibold text-[#f5f1e6]">Agreements</h3>
            <div className="mt-4 space-y-3">
              {agreements.length === 0 ? <div className="text-sm text-[#a39a86]">No agreements.</div> : null}
              {agreements.map((agreement) => (
                <div key={agreement.id} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[#f5f1e6]">{agreement.territoryName}</div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${agreement.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{agreement.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#a39a86]">
                    <div>Start: {new Date(agreement.startDate).toLocaleDateString()}</div>
                    {agreement.endDate ? <div>End: {new Date(agreement.endDate).toLocaleDateString()}</div> : null}
                    <div>Outlets: {agreement.outletCount}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#121110] p-5">
            <h3 className="text-lg font-semibold text-[#f5f1e6]">Outlets</h3>
            <div className="mt-4 space-y-3">
              {outlets.length === 0 ? <div className="text-sm text-[#a39a86]">No outlets.</div> : null}
              {outlets.map((outlet) => (
                <div key={outlet.id} className="rounded-xl border border-[rgba(212,175,55,0.1)] bg-[#17150f] p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[#f5f1e6]">{outlet.branchName}</div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outlet.isActive ? "border border-[rgba(63,174,106,0.3)] bg-[rgba(63,174,106,0.12)] text-[#3fae6a]" : "border border-[rgba(163,154,134,0.3)] bg-[rgba(163,154,134,0.12)] text-[#a39a86]"}`}>{outlet.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#a39a86]">
                    {outlet.territoryName ? <div>Territory: {outlet.territoryName}</div> : null}
                    {outlet.outletType ? <div>Type: {outlet.outletType}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
