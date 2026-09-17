"use client";

import { useRef, useState, type ReactNode } from "react";

export type ImportedProduct = { id: string; categoryId: string; name: string; sku: string; unit: string; priceCents: number; isActive: boolean };

function downloadFile(url: string) { window.location.assign(url); }
type ImportIssue = { row: number; field: string; message: string };
type ImportRow = { row: number; categoryId: string; name: string; sku: string; unit: string; priceCents: number; isActive: boolean };
type ImportPreview = { templateVersion: number | null; totalRows: number; validRows: ImportRow[]; invalidRows: number[]; skippedRows: number; issues: ImportIssue[] };

export function InventoryWorkspace({
  children,
  productCount,
  stockUnitCount,
  lowStockCount,
  purchaseCount,
  isLoading,
  onProductsImported,
}: {
  readonly children: ReactNode;
  readonly productCount: number;
  readonly stockUnitCount: number;
  readonly lowStockCount: number;
  readonly purchaseCount: number;
  readonly isLoading: boolean;
  readonly onProductsImported: (products: ImportedProduct[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const previewFile = async (selected: File) => {
    setFile(selected);
    setPreview(null);
    setResult(null);
    setTransferError(null);
    setIsParsing(true);
    const form = new FormData();
    form.set("file", selected);
    try {
      const response = await fetch("/api/imports/inventory/preview", { method: "POST", credentials: "same-origin", body: form });
      const body = await response.json().catch(() => ({})) as { error?: string; preview?: ImportPreview };
      if (!response.ok || !body.preview) throw new Error(body.error ?? "Workbook could not be validated.");
      setPreview(body.preview);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Workbook could not be validated.");
    } finally {
      setIsParsing(false);
    }
  };

  const confirmImport = async () => {
    if (!file || !preview || preview.issues.length > 0 || preview.validRows.length === 0) return;
    setIsImporting(true);
    setTransferError(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/imports/inventory/commit", { method: "POST", credentials: "same-origin", body: form });
      const body = await response.json().catch(() => ({})) as { error?: string; imported?: number };
      if (!response.ok) throw new Error(body.error ?? "Inventory import could not be completed.");
      const productsResponse = await fetch("/api/products", { credentials: "same-origin" });
      if (productsResponse.ok) {
        const productsBody = await productsResponse.json() as { products?: ImportedProduct[] };
        onProductsImported(productsBody.products ?? []);
      }
      setResult(`${body.imported ?? preview.validRows.length} products imported successfully.`);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Inventory import could not be completed.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="inventory-workspace mt-6 space-y-5">
      <section className="inventory-command-panel" aria-labelledby="inventory-heading">
        <div className="inventory-command-copy">
          <div className="inventory-eyebrow">Stock control / master data</div>
          <h2 id="inventory-heading">Inventory & purchasing</h2>
          <p>Monitor branch stock, maintain the product catalog, and record controlled stock operations.</p>
        </div>
        <div className="inventory-transfer-actions" aria-label="Inventory data transfer">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Upload inventory XLSX"
            onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void previewFile(selected); }}
          />
          <button type="button" className="premium-btn-primary" onClick={() => inputRef.current?.click()} disabled={isParsing || isImporting}>{isParsing ? "Validating..." : "Upload"}</button>
          <button type="button" className="premium-btn-secondary" onClick={() => downloadFile("/api/imports/inventory/template")}>Template</button>
          <button type="button" className="premium-btn-secondary" onClick={() => downloadFile("/api/exports/inventory/inventory/xlsx")}>Excel</button>
          <button type="button" className="premium-btn-secondary" onClick={() => downloadFile("/api/exports/inventory/inventory/pdf")}>PDF</button>
        </div>
      </section>

      <section className="inventory-metrics" aria-label="Inventory summary">
        <InventoryMetric label="Products" value={productCount} detail="Catalog records" loading={isLoading} />
        <InventoryMetric label="On hand" value={stockUnitCount} detail="Units across branches" loading={isLoading} />
        <InventoryMetric label="Low stock" value={lowStockCount} detail={lowStockCount ? "Needs attention" : "Thresholds healthy"} tone={lowStockCount ? "warning" : "success"} loading={isLoading} />
        <InventoryMetric label="Receipts" value={purchaseCount} detail="Purchase records" loading={isLoading} />
      </section>

      {(file || transferError || result) ? (
        <section className="inventory-import-panel" aria-live="polite" aria-labelledby="import-preview-heading">
          <div className="inventory-panel-heading">
            <div>
              <div className="inventory-eyebrow">Create-only import</div>
              <h3 id="import-preview-heading">Import preview</h3>
            </div>
            {file ? <span className="inventory-file-name">{file.name}</span> : null}
          </div>
          {transferError ? <div className="inventory-alert inventory-alert-error" role="alert">{transferError}</div> : null}
          {result ? <div className="inventory-alert inventory-alert-success" role="status">{result}</div> : null}
          {preview ? (
            <>
              <div className="inventory-preview-stats">
                <span>Version <strong>{preview.templateVersion ?? "Unknown"}</strong></span>
                <span>Total <strong>{preview.totalRows}</strong></span>
                <span>Valid <strong>{preview.validRows.length}</strong></span>
                <span>Invalid <strong>{preview.invalidRows.length}</strong></span>
                <span>Skipped <strong>{preview.skippedRows}</strong></span>
              </div>
              {preview.issues.length ? (
                <div className="inventory-issue-list" role="region" aria-label="Import validation errors">
                  {preview.issues.map((issue, index) => <div key={`${issue.row}-${issue.field}-${index}`}><strong>Row {issue.row}</strong><span>{issue.field}</span><p>{issue.message}</p></div>)}
                </div>
              ) : (
                <div className="inventory-alert inventory-alert-success">All rows passed authoritative server validation. Confirm to create these products atomically.</div>
              )}
              <div className="inventory-import-actions">
                <button type="button" className="premium-btn-primary" disabled={preview.issues.length > 0 || preview.validRows.length === 0 || isImporting} onClick={() => void confirmImport()}>{isImporting ? "Importing..." : `Confirm ${preview.validRows.length} products`}</button>
                <button type="button" className="premium-btn-secondary" disabled={isImporting} onClick={() => { setFile(null); setPreview(null); setTransferError(null); if (inputRef.current) inputRef.current.value = ""; }}>Cancel</button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <div className="inventory-section-index" aria-label="Inventory workspace sections">
        <span>Catalog</span><span>Stock</span><span>Purchasing</span><span>Controls</span>
        <span className="inventory-purchase-actions"><strong>Purchase register</strong><button type="button" onClick={() => downloadFile("/api/exports/inventory/purchases/xlsx")}>Excel</button><button type="button" onClick={() => downloadFile("/api/exports/inventory/purchases/pdf")}>PDF</button></span>
        <span>Purchase imports are disabled to protect stock-ledger side effects.</span>
      </div>

      <div className="inventory-existing-workflows">{children}</div>
    </div>
  );
}

function InventoryMetric({ label, value, detail, tone = "default", loading }: { readonly label: string; readonly value: number; readonly detail: string; readonly tone?: "default" | "warning" | "success"; readonly loading: boolean }) {
  return <div className={`inventory-metric inventory-metric-${tone}`}><span>{label}</span><strong>{loading ? "--" : value.toLocaleString("en-IN")}</strong><small>{detail}</small></div>;
}