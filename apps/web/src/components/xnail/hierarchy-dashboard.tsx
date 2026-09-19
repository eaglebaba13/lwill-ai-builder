"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HierarchyWorkspace,
  HierarchyPanel,
  HierarchyBadge,
  HierarchyEmptyState,
  HierarchyButton,
  HierarchyInput,
  HierarchySelect,
  HierarchyTable,
  HierarchyTableHead,
  HierarchyTableBody,
  HierarchyTableRow,
  HierarchyTableCell,
  HierarchyTableHeaderCell,
  HierarchyFormRow,
  HierarchyDivider,
  HierarchyAlert,
  formatStatusBadge,
} from "@/components/xnail/hierarchy-workspace";

type StateFranchise = {
  id: string;
  tenantId: string;
  partnerId: string;
  stateId: string;
  code: string;
  displayName: string;
  coverageMode: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CityFranchise = {
  id: string;
  tenantId: string;
  stateFranchiseId: string;
  partnerId: string;
  cityId: string;
  areaCode: string;
  displayName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type OutletAssignment = {
  id: string;
  tenantId: string;
  outletProfileId: string;
  cityFranchiseId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
};

type GeoState = { id: string; countryCode: string; code: string; name: string };
type GeoCity = { id: string; stateId: string; code: string; name: string };
type GeoPincode = { id: string; stateId: string; cityId: string; value: string };

type FranchisePartner = { id: string; tenantId: string; name: string; isActive: boolean };
type Branch = { id: string; tenantId: string; name: string; slug: string; territoryId: string | null; isActive: boolean };
type FranchiseOutletProfile = { id: string; tenantId: string; partnerId: string | null; branchId: string; territoryId: string | null; outletType: string | null; ownershipMode: string | null; currentCityFranchiseId: string | null; assignmentStatus: string; isActive: boolean };

type HierarchyDashboardProps = {
  readonly authenticated: boolean;
};

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url, { credentials: "same-origin", cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
  });
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) return r.json().then((e) => { throw new Error(e?.error?.message ?? `HTTP ${r.status}`); });
    return r.json() as Promise<T>;
  });
}

function patchJson<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) return r.json().then((e) => { throw new Error(e?.error?.message ?? `HTTP ${r.status}`); });
    return r.json() as Promise<T>;
  });
}

function shortId(id: string) { return id.slice(0, 8); }
function partnerLabel(partnerId: string | null, partners: FranchisePartner[]) {
  if (partnerId === null) return "Company Owned";
  return partners.find((p) => p.id === partnerId)?.name ?? shortId(partnerId);
}
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "Open"; }

export function HierarchyDashboard({ authenticated }: HierarchyDashboardProps) {
  const [activeSection, setActiveSection] = useState<"states" | "cities" | "outlets" | "geography">("states");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [states, setStates] = useState<StateFranchise[]>([]);
  const [cities, setCities] = useState<CityFranchise[]>([]);
  const [outlets, setOutlets] = useState<FranchiseOutletProfile[]>([]);
  const [assignments, setAssignments] = useState<OutletAssignment[]>([]);
  const [partners, setPartners] = useState<FranchisePartner[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [geoStates, setGeoStates] = useState<GeoState[]>([]);
  const [geoCities, setGeoCities] = useState<GeoCity[]>([]);
  const [geoPincodes, setGeoPincodes] = useState<GeoPincode[]>([]);

  const [showCreateState, setShowCreateState] = useState(false);
  const [showCreateCity, setShowCreateCity] = useState(false);
  const [showAssignOutlet, setShowAssignOutlet] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<StateFranchise | null>(null);

  const flash = useCallback((msg: string, type: "success" | "error") => {
    if (type === "success") { setSuccess(msg); setError(null); }
    else { setError(msg); setSuccess(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 5000);
  }, []);

  const loadStates = useCallback(() => {
    if (!authenticated) return;
    fetchJson<{ states: StateFranchise[] }>("/api/franchise/hierarchy/states")
      .then((d) => setStates(d.states ?? []))
      .catch(() => {});
  }, [authenticated]);

  const loadCities = useCallback((stateFranchiseId?: string) => {
    if (!authenticated) return;
    const url = stateFranchiseId ? `/api/franchise/hierarchy/cities?stateFranchiseId=${stateFranchiseId}` : "/api/franchise/hierarchy/cities";
    fetchJson<{ cities: CityFranchise[] }>(url)
      .then((d) => setCities(d.cities ?? []))
      .catch(() => {});
  }, [authenticated]);

  const loadOutlets = useCallback(() => {
    if (!authenticated) return;
    fetchJson<{ profiles: FranchiseOutletProfile[] }>("/api/franchise/outlets")
      .then((d) => setOutlets((d as { profiles?: FranchiseOutletProfile[] }).profiles ?? (d as unknown as FranchiseOutletProfile[]) ?? []))
      .catch(() => {});
  }, [authenticated]);

  const loadPartners = useCallback(() => {
    if (!authenticated) return;
    fetchJson<{ partners: FranchisePartner[] }>("/api/franchise/partners")
      .then((d) => setPartners(d.partners ?? []))
      .catch(() => {});
  }, [authenticated]);

  const loadBranches = useCallback(() => {
    if (!authenticated) return;
    fetchJson<{ branches: Branch[] }>("/api/branches")
      .then((d) => setBranches((d as { branches?: Branch[] }).branches ?? []))
      .catch(() => {});
  }, [authenticated]);

  const loadGeography = useCallback(() => {
    if (!authenticated) return;
    fetchJson<{ states: GeoState[]; cities: GeoCity[]; pincodes: GeoPincode[] }>("/api/franchise/hierarchy/geography")
      .then((d) => {
        setGeoStates(d.states ?? []);
        setGeoCities(d.cities ?? []);
        setGeoPincodes(d.pincodes ?? []);
      })
      .catch(() => {});
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    loadStates();
    loadCities();
    loadOutlets();
    loadPartners();
    loadBranches();
    loadGeography();
  }, [authenticated, loadStates, loadCities, loadOutlets, loadPartners, loadBranches, loadGeography]);

  const loadAssignments = useCallback((outletProfileId: string) => {
    fetchJson<{ assignments: OutletAssignment[] }>(`/api/franchise/hierarchy/outlets/${outletProfileId}/assignments`)
      .then((d) => setAssignments(d.assignments ?? []))
      .catch(() => {});
  }, []);

  const activateState = async (id: string) => {
    try {
      await postJson(`/api/franchise/hierarchy/states/${id}/activate`, {});
      flash("State Franchise activated", "success");
      loadStates();
    } catch (e) { flash(e instanceof Error ? e.message : "Activation failed", "error"); }
  };

  const endState = async (id: string) => {
    const effectiveTo = prompt("End date (YYYY-MM-DD):");
    if (!effectiveTo) return;
    try {
      await postJson(`/api/franchise/hierarchy/states/${id}/end`, { effectiveTo });
      flash("State Franchise ended", "success");
      loadStates();
    } catch (e) { flash(e instanceof Error ? e.message : "End failed", "error"); }
  };

  const activateCity = async (id: string) => {
    try {
      await postJson(`/api/franchise/hierarchy/cities/${id}/activate`, {});
      flash("City Franchise activated", "success");
      loadCities();
    } catch (e) { flash(e instanceof Error ? e.message : "Activation failed", "error"); }
  };

  const endCity = async (id: string) => {
    const effectiveTo = prompt("End date (YYYY-MM-DD):");
    if (!effectiveTo) return;
    try {
      await postJson(`/api/franchise/hierarchy/cities/${id}/end`, { effectiveTo });
      flash("City Franchise ended", "success");
      loadCities();
    } catch (e) { flash(e instanceof Error ? e.message : "End failed", "error"); }
  };

  const sectionTabs = [
    { key: "states" as const, label: "State Franchises", count: states.length },
    { key: "cities" as const, label: "City Franchises", count: cities.length },
    { key: "outlets" as const, label: "Outlet Assignments", count: outlets.length },
    { key: "geography" as const, label: "Geography", count: null },
  ];

  return (
    <HierarchyWorkspace
      eyebrow="Franchise Hierarchy"
      title="Master Data Dashboard"
      description="Manage State Franchises, City Franchises, outlet hierarchy assignments, and canonical geography. All changes use the approved domain service with tenant-safe validation."
      stats={[
        { label: "State Franchises", value: states.length, tone: states.length > 0 ? "success" : "neutral" },
        { label: "City Franchises", value: cities.length, tone: cities.length > 0 ? "success" : "neutral" },
        { label: "Outlets", value: outlets.length },
      ]}
    >
      {error ? <HierarchyAlert tone="danger">{error}</HierarchyAlert> : null}
      {success ? <HierarchyAlert tone="info">{success}</HierarchyAlert> : null}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {sectionTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeSection === t.key ? "bg-[rgba(212,175,55,0.15)] text-[#d4af37]" : "text-[#807866] hover:text-[#a39a86]"}`}
          >
            {t.label}{t.count !== null ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {activeSection === "states" ? (
        <StateFranchiseSection
          states={states}
          partners={partners}
          geoStates={geoStates}
          showCreate={showCreateState}
          setShowCreate={setShowCreateState}
          onRefresh={loadStates}
          onActivate={activateState}
          onEnd={endState}
          onSelect={setSelectedState}
          selectedId={selectedState?.id}
          flash={flash}
        />
      ) : null}

      {activeSection === "cities" ? (
        <CityFranchiseSection
          cities={cities}
          states={states}
          partners={partners}
          geoCities={geoCities}
          showCreate={showCreateCity}
          setShowCreate={setShowCreateCity}
          onRefresh={() => loadCities()}
          onActivate={activateCity}
          onEnd={endCity}
          flash={flash}
        />
      ) : null}

      {activeSection === "outlets" ? (
        <OutletAssignmentSection
          outlets={outlets}
          cities={cities}
          branches={branches}
          partners={partners}
          assignments={assignments}
          assignOutletId={showAssignOutlet}
          setAssignOutletId={setShowAssignOutlet}
          onLoadAssignments={loadAssignments}
          onRefresh={loadOutlets}
          flash={flash}
        />
      ) : null}

      {activeSection === "geography" ? (
        <GeographySection
          geoStates={geoStates}
          geoCities={geoCities}
          geoPincodes={geoPincodes}
        />
      ) : null}
    </HierarchyWorkspace>
  );
}

function StateFranchiseSection({ states, partners, geoStates, showCreate, setShowCreate, onRefresh, onActivate, onEnd, onSelect, selectedId, flash }: {
  states: StateFranchise[];
  partners: FranchisePartner[];
  geoStates: GeoState[];
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  onRefresh: () => void;
  onActivate: (id: string) => void;
  onEnd: (id: string) => void;
  onSelect: (s: StateFranchise | null) => void;
  selectedId?: string;
  flash: (msg: string, type: "success" | "error") => void;
}) {
  const [form, setForm] = useState({ partnerId: "", stateId: "", code: "", displayName: "", coverageMode: "WHOLE_STATE", effectiveFrom: "", effectiveTo: "", pincodeIds: "" });
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!form.stateId) {
      flash("Canonical State is required.", "error");
      return;
    }
    if (form.coverageMode === "PINCODE_SET") {
      flash("PINCODE_SET creation is unavailable until canonical pincode selection UX is specified.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        partnerId: form.partnerId,
        stateId: form.stateId || undefined,
        code: form.code,
        displayName: form.displayName,
        coverageMode: form.coverageMode,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      };
      if (form.coverageMode === "PINCODE_SET" && form.pincodeIds) {
        body.pincodeIds = form.pincodeIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
      await postJson("/api/franchise/hierarchy/states", body);
      flash("State Franchise created as DRAFT", "success");
      setShowCreate(false);
      setForm({ partnerId: "", stateId: "", code: "", displayName: "", coverageMode: "WHOLE_STATE", effectiveFrom: "", effectiveTo: "", pincodeIds: "" });
      onRefresh();
    } catch (e) { flash(e instanceof Error ? e.message : "Create failed", "error"); }
    finally { setSubmitting(false); }
  };

  return (
    <HierarchyPanel
      title="State Franchises"
      eyebrow="State Level"
      description="Manage State Franchise assignments. Create DRAFT, edit, activate, and end State-level franchise holders."
      action={<HierarchyButton onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ New State Franchise"}</HierarchyButton>}
    >
      {showCreate ? (
        <div className="mb-5 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(13,12,10,0.6)] p-4">
          <h4 className="text-sm font-semibold text-[#f5f1e6] mb-3">Create State Franchise (DRAFT)</h4>
          <HierarchyFormRow>
            <HierarchySelect
              label="Partner (State Holder)"
              value={form.partnerId}
              onChange={(v) => setForm({ ...form, partnerId: v })}
              options={partners.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select partner..."
              required
            />
            <HierarchySelect
              label="Canonical State"
              value={form.stateId}
              onChange={(v) => {
                const geoState = geoStates.find((state) => state.id === v);
                setForm({ ...form, stateId: v, code: geoState?.code ?? form.code });
              }}
              options={geoStates.map((state) => ({ value: state.id, label: `${state.code} - ${state.name}` }))}
              placeholder={geoStates.length > 0 ? "Select canonical state..." : "Canonical geography not loaded"}
              required
            />
            <HierarchyInput label="State Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="Business code" required />
            <HierarchyInput label="Display Name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} placeholder="e.g. Gujarat State Franchise" required />
          </HierarchyFormRow>
          <HierarchyFormRow>
            <HierarchySelect
              label="Coverage Mode"
              value={form.coverageMode}
              onChange={(v) => setForm({ ...form, coverageMode: v })}
              options={[{ value: "WHOLE_STATE", label: "Whole State" }, { value: "PINCODE_SET", label: "Pincode Set" }]}
            />
            <HierarchyInput label="Effective From" value={form.effectiveFrom} onChange={(v) => setForm({ ...form, effectiveFrom: v })} type="date" required />
            <HierarchyInput label="Effective To (blank = open)" value={form.effectiveTo} onChange={(v) => setForm({ ...form, effectiveTo: v })} type="date" />
          </HierarchyFormRow>
          {form.coverageMode === "PINCODE_SET" ? (
            <HierarchyAlert tone="warning">
              PINCODE_SET creation is blocked until canonical pincode selection UX is specified.
            </HierarchyAlert>
          ) : null}
          <HierarchyDivider />
          <HierarchyButton onClick={create} disabled={submitting}>{submitting ? "Creating..." : "Create DRAFT"}</HierarchyButton>
        </div>
      ) : null}

      {states.length === 0 ? (
        <HierarchyEmptyState title="No State Franchises" description="Create a State Franchise DRAFT to begin hierarchy setup." />
      ) : (
        <HierarchyTable>
          <HierarchyTableHead>
            <HierarchyTableRow>
              <HierarchyTableHeaderCell>Code</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Name</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Partner</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Coverage</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Effective</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Status</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Actions</HierarchyTableHeaderCell>
            </HierarchyTableRow>
          </HierarchyTableHead>
          <HierarchyTableBody>
            {states.map((s) => {
              const badge = formatStatusBadge(s.status);
              const partner = partners.find((p) => p.id === s.partnerId);
              return (
                <HierarchyTableRow key={s.id} onClick={() => onSelect(s)}>
                  <HierarchyTableCell>{s.code}</HierarchyTableCell>
                  <HierarchyTableCell>{s.displayName}</HierarchyTableCell>
                  <HierarchyTableCell className="text-xs">{partner?.name ?? shortId(s.partnerId)}</HierarchyTableCell>
                  <HierarchyTableCell><HierarchyBadge>{s.coverageMode}</HierarchyBadge></HierarchyTableCell>
                  <HierarchyTableCell className="text-xs">{fmtDate(s.effectiveFrom)} – {fmtDate(s.effectiveTo)}</HierarchyTableCell>
                  <HierarchyTableCell><HierarchyBadge tone={badge.tone}>{badge.label}</HierarchyBadge></HierarchyTableCell>
                  <HierarchyTableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {s.status === "DRAFT" ? <HierarchyButton variant="secondary" onClick={() => onActivate(s.id)}>Activate</HierarchyButton> : null}
                      {s.status === "ACTIVE" ? <HierarchyButton variant="danger" onClick={() => onEnd(s.id)}>End</HierarchyButton> : null}
                    </div>
                  </HierarchyTableCell>
                </HierarchyTableRow>
              );
            })}
          </HierarchyTableBody>
        </HierarchyTable>
      )}
    </HierarchyPanel>
  );
}

function CityFranchiseSection({ cities, states, partners, geoCities, showCreate, setShowCreate, onRefresh, onActivate, onEnd, flash }: {
  cities: CityFranchise[];
  states: StateFranchise[];
  partners: FranchisePartner[];
  geoCities: GeoCity[];
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  onRefresh: () => void;
  onActivate: (id: string) => void;
  onEnd: (id: string) => void;
  flash: (msg: string, type: "success" | "error") => void;
}) {
  const [form, setForm] = useState({ stateFranchiseId: "", partnerId: "", cityId: "", areaCode: "", displayName: "", effectiveFrom: "", effectiveTo: "" });
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!form.cityId) {
      flash("Canonical City is required.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await postJson("/api/franchise/hierarchy/cities", {
        stateFranchiseId: form.stateFranchiseId,
        partnerId: form.partnerId,
        cityId: form.cityId || undefined,
        areaCode: form.areaCode,
        displayName: form.displayName,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      });
      flash("City Franchise created as DRAFT", "success");
      setShowCreate(false);
      setForm({ stateFranchiseId: "", partnerId: "", cityId: "", areaCode: "", displayName: "", effectiveFrom: "", effectiveTo: "" });
      onRefresh();
    } catch (e) { flash(e instanceof Error ? e.message : "Create failed", "error"); }
    finally { setSubmitting(false); }
  };

  const activeStates = states.filter((s) => s.status === "ACTIVE");
  const selectedState = activeStates.find((s) => s.id === form.stateFranchiseId);
  const availableGeoCities = selectedState ? geoCities.filter((city) => city.stateId === selectedState.stateId) : [];

  return (
    <HierarchyPanel
      title="City Franchises"
      eyebrow="City Level"
      description="Manage City Franchise assignments. Each City Franchise belongs to exactly one State Franchise."
      action={<HierarchyButton onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ New City Franchise"}</HierarchyButton>}
    >
      {showCreate ? (
        <div className="mb-5 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(13,12,10,0.6)] p-4">
          <h4 className="text-sm font-semibold text-[#f5f1e6] mb-3">Create City Franchise (DRAFT)</h4>
          <HierarchyFormRow>
            <HierarchySelect
              label="Parent State Franchise"
              value={form.stateFranchiseId}
              onChange={(v) => setForm({ ...form, stateFranchiseId: v, cityId: "" })}
              options={activeStates.map((s) => ({ value: s.id, label: `${s.code} – ${s.displayName}` }))}
              placeholder="Select state..."
              required
            />
            <HierarchySelect
              label="Partner (City Holder)"
              value={form.partnerId}
              onChange={(v) => setForm({ ...form, partnerId: v })}
              options={partners.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select partner..."
              required
            />
            <HierarchySelect
              label="Canonical City"
              value={form.cityId}
              onChange={(v) => {
                const geoCity = availableGeoCities.find((city) => city.id === v);
                setForm({ ...form, cityId: v, areaCode: geoCity?.code ?? form.areaCode });
              }}
              options={availableGeoCities.map((city) => ({ value: city.id, label: `${city.code} - ${city.name}` }))}
              placeholder={selectedState ? "Select canonical city..." : "Select state first"}
              required
            />
          </HierarchyFormRow>
          <HierarchyFormRow>
            <HierarchyInput label="Area Code" value={form.areaCode} onChange={(v) => setForm({ ...form, areaCode: v })} placeholder="Business area code" required />
            <HierarchyInput label="Display Name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} placeholder="e.g. Surat Central City Franchise" required />
            <HierarchyInput label="Effective From" value={form.effectiveFrom} onChange={(v) => setForm({ ...form, effectiveFrom: v })} type="date" required />
            <HierarchyInput label="Effective To (blank = open)" value={form.effectiveTo} onChange={(v) => setForm({ ...form, effectiveTo: v })} type="date" />
          </HierarchyFormRow>
          <HierarchyDivider />
          <HierarchyButton onClick={create} disabled={submitting}>{submitting ? "Creating..." : "Create DRAFT"}</HierarchyButton>
        </div>
      ) : null}

      {cities.length === 0 ? (
        <HierarchyEmptyState title="No City Franchises" description="Activate a State Franchise first, then create City Franchise DRAFTs." />
      ) : (
        <HierarchyTable>
          <HierarchyTableHead>
            <HierarchyTableRow>
              <HierarchyTableHeaderCell>Area</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Name</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Parent State</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Partner</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Effective</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Status</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Actions</HierarchyTableHeaderCell>
            </HierarchyTableRow>
          </HierarchyTableHead>
          <HierarchyTableBody>
            {cities.map((c) => {
              const badge = formatStatusBadge(c.status);
              const parent = states.find((s) => s.id === c.stateFranchiseId);
              const partner = partners.find((p) => p.id === c.partnerId);
              return (
                <HierarchyTableRow key={c.id}>
                  <HierarchyTableCell>{c.areaCode}</HierarchyTableCell>
                  <HierarchyTableCell>{c.displayName}</HierarchyTableCell>
                  <HierarchyTableCell className="text-xs">{parent ? `${parent.code} – ${parent.displayName}` : shortId(c.stateFranchiseId)}</HierarchyTableCell>
                  <HierarchyTableCell className="text-xs">{partner?.name ?? shortId(c.partnerId)}</HierarchyTableCell>
                  <HierarchyTableCell className="text-xs">{fmtDate(c.effectiveFrom)} – {fmtDate(c.effectiveTo)}</HierarchyTableCell>
                  <HierarchyTableCell><HierarchyBadge tone={badge.tone}>{badge.label}</HierarchyBadge></HierarchyTableCell>
                  <HierarchyTableCell>
                    <div className="flex gap-1">
                      {c.status === "DRAFT" ? <HierarchyButton variant="secondary" onClick={() => onActivate(c.id)}>Activate</HierarchyButton> : null}
                      {c.status === "ACTIVE" ? <HierarchyButton variant="danger" onClick={() => onEnd(c.id)}>End</HierarchyButton> : null}
                    </div>
                  </HierarchyTableCell>
                </HierarchyTableRow>
              );
            })}
          </HierarchyTableBody>
        </HierarchyTable>
      )}
    </HierarchyPanel>
  );
}

function OutletAssignmentSection({ outlets, cities, branches, partners, assignments, assignOutletId, setAssignOutletId, onLoadAssignments, onRefresh, flash }: {
  outlets: FranchiseOutletProfile[];
  cities: CityFranchise[];
  branches: Branch[];
  partners: FranchisePartner[];
  assignments: OutletAssignment[];
  assignOutletId: string | null;
  setAssignOutletId: (id: string | null) => void;
  onLoadAssignments: (id: string) => void;
  onRefresh: () => void;
  flash: (msg: string, type: "success" | "error") => void;
}) {
  const [form, setForm] = useState({ cityFranchiseId: "", effectiveFrom: "", effectiveTo: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingOwnership, setEditingOwnership] = useState<string | null>(null);
  const [ownershipForm, setOwnershipForm] = useState({ ownershipMode: "", partnerId: "" });

  const assign = async (outletProfileId: string) => {
    setSubmitting(true);
    try {
      await postJson(`/api/franchise/hierarchy/outlets/${outletProfileId}/assignments`, {
        cityFranchiseId: form.cityFranchiseId,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      });
      flash("Outlet assigned to City Franchise", "success");
      setAssignOutletId(null);
      onRefresh();
    } catch (e) { flash(e instanceof Error ? e.message : "Assignment failed", "error"); }
    finally { setSubmitting(false); }
  };

  const reassign = async (outletProfileId: string) => {
    const cityFranchiseId = prompt("New City Franchise ID:");
    const effectiveFrom = prompt("Effective from (YYYY-MM-DD):");
    if (!cityFranchiseId || !effectiveFrom) return;
    try {
      await postJson(`/api/franchise/hierarchy/outlets/${outletProfileId}/assignments/reassign`, { cityFranchiseId, effectiveFrom });
      flash("Outlet reassigned", "success");
      onRefresh();
    } catch (e) { flash(e instanceof Error ? e.message : "Reassign failed", "error"); }
  };

  const saveOwnership = async (outletId: string) => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { ownershipMode: ownershipForm.ownershipMode };
      if (ownershipForm.ownershipMode === "UNDER_FRANCHISE_PARTNER") {
        body.partnerId = ownershipForm.partnerId;
      } else {
        body.partnerId = null;
      }
      await patchJson(`/api/franchise/outlets/${outletId}`, body);
      flash("Ownership updated", "success");
      setEditingOwnership(null);
      onRefresh();
    } catch (e) { flash(e instanceof Error ? e.message : "Update failed", "error"); }
    finally { setSubmitting(false); }
  };

  const activeCities = cities.filter((c) => c.status === "ACTIVE");

  return (
    <HierarchyPanel
      title="Outlet / Branch Assignments"
      eyebrow="Outlet Level"
      description="Assign OutletProfiles to City Franchises. Effective-dated history is preserved."
    >
      {outlets.length === 0 ? (
        <HierarchyEmptyState title="No Outlet Profiles" description="Outlet profiles will appear here once FranchiseOutletProfile records exist." />
      ) : (
        <HierarchyTable>
          <HierarchyTableHead>
            <HierarchyTableRow>
              <HierarchyTableHeaderCell>Outlet</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Branch</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Partner</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Type</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Ownership</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Current Assignment</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Status</HierarchyTableHeaderCell>
              <HierarchyTableHeaderCell>Actions</HierarchyTableHeaderCell>
            </HierarchyTableRow>
          </HierarchyTableHead>
          <HierarchyTableBody>
            {outlets.map((o) => {
              const branch = branches.find((b) => b.id === o.branchId);
              const currentCity = cities.find((c) => c.id === o.currentCityFranchiseId);
              const asBadge = formatStatusBadge(o.assignmentStatus ?? "DRAFT");
              return (
                <HierarchyTableRow key={o.id}>
                  <HierarchyTableCell className="text-xs font-mono">{shortId(o.id)}</HierarchyTableCell>
                  <HierarchyTableCell>{branch?.name ?? shortId(o.branchId)}</HierarchyTableCell>
                  <HierarchyTableCell className="text-xs">{partnerLabel(o.partnerId, partners)}</HierarchyTableCell>
                  <HierarchyTableCell><HierarchyBadge>{o.outletType ?? "—"}</HierarchyBadge></HierarchyTableCell>
                  <HierarchyTableCell>
                    <div className="flex items-center gap-1">
                      <HierarchyBadge tone={o.ownershipMode === "COMPANY_OWNED" ? "success" : o.ownershipMode === "UNDER_FRANCHISE_PARTNER" ? "warning" : "neutral"}>
                        {o.ownershipMode === "COMPANY_OWNED" ? "Company" : o.ownershipMode === "UNDER_FRANCHISE_PARTNER" ? "Franchise" : "—"}
                      </HierarchyBadge>
                      <HierarchyButton variant="secondary" onClick={() => {
                        setEditingOwnership(o.id);
                        setOwnershipForm({ ownershipMode: o.ownershipMode ?? "", partnerId: o.partnerId ?? "" });
                      }}>Edit</HierarchyButton>
                    </div>
                  </HierarchyTableCell>
                  <HierarchyTableCell className="text-xs">{currentCity ? `${currentCity.areaCode} – ${currentCity.displayName}` : "None"}</HierarchyTableCell>
                  <HierarchyTableCell><HierarchyBadge tone={asBadge.tone}>{asBadge.label}</HierarchyBadge></HierarchyTableCell>
                  <HierarchyTableCell>
                    <div className="flex gap-1">
                      {!o.currentCityFranchiseId ? (
                        <HierarchyButton variant="secondary" onClick={() => { setAssignOutletId(o.id); onLoadAssignments(o.id); }}>Assign</HierarchyButton>
                      ) : (
                        <HierarchyButton variant="secondary" onClick={() => reassign(o.id)}>Reassign</HierarchyButton>
                      )}
                      <HierarchyButton variant="secondary" onClick={() => { setAssignOutletId(o.id); onLoadAssignments(o.id); }}>History</HierarchyButton>
                    </div>
                  </HierarchyTableCell>
                </HierarchyTableRow>
              );
            })}
          </HierarchyTableBody>
        </HierarchyTable>
      )}

      {assignOutletId ? (
        <div className="mt-4 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(13,12,10,0.6)] p-4">
          <h4 className="text-sm font-semibold text-[#f5f1e6] mb-3">Assign Outlet {shortId(assignOutletId)} to City Franchise</h4>
          <HierarchyFormRow>
            <HierarchySelect
              label="City Franchise"
              value={form.cityFranchiseId}
              onChange={(v) => setForm({ ...form, cityFranchiseId: v })}
              options={activeCities.map((c) => ({ value: c.id, label: `${c.areaCode} – ${c.displayName}` }))}
              placeholder="Select city franchise..."
              required
            />
            <HierarchyInput label="Effective From" value={form.effectiveFrom} onChange={(v) => setForm({ ...form, effectiveFrom: v })} type="date" required />
            <HierarchyInput label="Effective To (blank = open)" value={form.effectiveTo} onChange={(v) => setForm({ ...form, effectiveTo: v })} type="date" />
          </HierarchyFormRow>
          <HierarchyDivider />
          <div className="flex gap-2">
            <HierarchyButton onClick={() => assign(assignOutletId)} disabled={submitting}>{submitting ? "Assigning..." : "Assign"}</HierarchyButton>
            <HierarchyButton variant="secondary" onClick={() => setAssignOutletId(null)}>Cancel</HierarchyButton>
          </div>

          {assignments.length > 0 ? (
            <div className="mt-4">
              <h5 className="text-xs font-medium text-[#807866] mb-2">Assignment History</h5>
              <HierarchyTable>
                <HierarchyTableHead>
                  <HierarchyTableRow>
                    <HierarchyTableHeaderCell>ID</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>City Franchise</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>Effective From</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>Effective To</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>Status</HierarchyTableHeaderCell>
                  </HierarchyTableRow>
                </HierarchyTableHead>
                <HierarchyTableBody>
                  {assignments.map((a) => {
                    const ab = formatStatusBadge(a.status);
                    return (
                      <HierarchyTableRow key={a.id}>
                        <HierarchyTableCell className="text-xs font-mono">{shortId(a.id)}</HierarchyTableCell>
                        <HierarchyTableCell className="text-xs">{shortId(a.cityFranchiseId)}</HierarchyTableCell>
                        <HierarchyTableCell className="text-xs">{fmtDate(a.effectiveFrom)}</HierarchyTableCell>
                        <HierarchyTableCell className="text-xs">{fmtDate(a.effectiveTo)}</HierarchyTableCell>
                        <HierarchyTableCell><HierarchyBadge tone={ab.tone}>{ab.label}</HierarchyBadge></HierarchyTableCell>
                      </HierarchyTableRow>
                    );
                  })}
                </HierarchyTableBody>
              </HierarchyTable>
            </div>
          ) : null}
        </div>
      ) : null}

      {editingOwnership ? (
        <div className="mt-4 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(13,12,10,0.6)] p-4">
          <h4 className="text-sm font-semibold text-[#f5f1e6] mb-3">Edit Ownership — Outlet {shortId(editingOwnership)}</h4>
          <HierarchyFormRow>
            <HierarchySelect
              label="Ownership Type"
              value={ownershipForm.ownershipMode}
              onChange={(v) => setOwnershipForm({ ...ownershipForm, ownershipMode: v, partnerId: v === "COMPANY_OWNED" ? "" : ownershipForm.partnerId })}
              options={[
                { value: "COMPANY_OWNED", label: "Company Owned" },
                { value: "UNDER_FRANCHISE_PARTNER", label: "Under Franchise Partner" },
              ]}
              placeholder="Select ownership..."
              required
            />
            {ownershipForm.ownershipMode === "UNDER_FRANCHISE_PARTNER" ? (
              <HierarchySelect
                label="Outlet Franchise Partner"
                value={ownershipForm.partnerId}
                onChange={(v) => setOwnershipForm({ ...ownershipForm, partnerId: v })}
                options={partners.filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select partner..."
                required
              />
            ) : null}
          </HierarchyFormRow>
          {ownershipForm.ownershipMode === "COMPANY_OWNED" ? (
            <HierarchyAlert tone="info">Company Owned — no external Outlet Franchise Partner required.</HierarchyAlert>
          ) : null}
          <HierarchyDivider />
          <div className="flex gap-2">
            <HierarchyButton onClick={() => saveOwnership(editingOwnership)} disabled={submitting}>{submitting ? "Saving..." : "Save"}</HierarchyButton>
            <HierarchyButton variant="secondary" onClick={() => setEditingOwnership(null)}>Cancel</HierarchyButton>
          </div>
        </div>
      ) : null}
    </HierarchyPanel>
  );
}

function GeographySection({ geoStates, geoCities, geoPincodes }: {
  geoStates: GeoState[];
  geoCities: GeoCity[];
  geoPincodes: GeoPincode[];
}) {

  return (
    <HierarchyPanel
      title="Canonical Geography"
      eyebrow="Reference Data"
      description="Canonical Country → State → City → Pincode reference data. Shared across tenants."
    >
      {geoStates.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-[#807866] mb-2">States ({geoStates.length})</h4>
            <HierarchyTable>
              <HierarchyTableHead>
                <HierarchyTableRow>
                  <HierarchyTableHeaderCell>Code</HierarchyTableHeaderCell>
                  <HierarchyTableHeaderCell>Name</HierarchyTableHeaderCell>
                  <HierarchyTableHeaderCell>Country</HierarchyTableHeaderCell>
                </HierarchyTableRow>
              </HierarchyTableHead>
              <HierarchyTableBody>
                {geoStates.map((s) => (
                  <HierarchyTableRow key={s.id}>
                    <HierarchyTableCell>{s.code}</HierarchyTableCell>
                    <HierarchyTableCell>{s.name}</HierarchyTableCell>
                    <HierarchyTableCell>{s.countryCode}</HierarchyTableCell>
                  </HierarchyTableRow>
                ))}
              </HierarchyTableBody>
            </HierarchyTable>
          </div>

          {geoCities.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-[#807866] mb-2">Cities ({geoCities.length})</h4>
              <HierarchyTable>
                <HierarchyTableHead>
                  <HierarchyTableRow>
                    <HierarchyTableHeaderCell>Code</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>Name</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>State ID</HierarchyTableHeaderCell>
                  </HierarchyTableRow>
                </HierarchyTableHead>
                <HierarchyTableBody>
                  {geoCities.map((c) => (
                    <HierarchyTableRow key={c.id}>
                      <HierarchyTableCell>{c.code}</HierarchyTableCell>
                      <HierarchyTableCell>{c.name}</HierarchyTableCell>
                      <HierarchyTableCell className="text-xs font-mono">{c.stateId.slice(0, 8)}</HierarchyTableCell>
                    </HierarchyTableRow>
                  ))}
                </HierarchyTableBody>
              </HierarchyTable>
            </div>
          ) : null}

          {geoPincodes.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-[#807866] mb-2">Pincodes ({geoPincodes.length})</h4>
              <HierarchyTable>
                <HierarchyTableHead>
                  <HierarchyTableRow>
                    <HierarchyTableHeaderCell>Value</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>City ID</HierarchyTableHeaderCell>
                    <HierarchyTableHeaderCell>State ID</HierarchyTableHeaderCell>
                  </HierarchyTableRow>
                </HierarchyTableHead>
                <HierarchyTableBody>
                  {geoPincodes.map((p) => (
                    <HierarchyTableRow key={p.id}>
                      <HierarchyTableCell>{p.value}</HierarchyTableCell>
                      <HierarchyTableCell className="text-xs font-mono">{p.cityId.slice(0, 8)}</HierarchyTableCell>
                      <HierarchyTableCell className="text-xs font-mono">{p.stateId.slice(0, 8)}</HierarchyTableCell>
                    </HierarchyTableRow>
                  ))}
                </HierarchyTableBody>
              </HierarchyTable>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <HierarchyEmptyState title="No Geography Data Loaded" description="Canonical reference data has not loaded for this session." />
          <HierarchyAlert tone="warning">
            GEOGRAPHY WRITE AUTHORITY NOT SPECIFIED — Canonical geography CRUD requires a separate business/security decision about who may create/edit global reference data. Geography reads are attempted above; writes are blocked until authorized.
          </HierarchyAlert>
        </div>
      )}
    </HierarchyPanel>
  );
}
