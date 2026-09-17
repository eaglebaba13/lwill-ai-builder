const FORMULA_TRIGGER = /^[=+\-@]/;

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const PDF_CONTENT_TYPE = "application/pdf";

export function safeSpreadsheetText(value: string | null | undefined): string {
  if (!value) return "";
  return FORMULA_TRIGGER.test(value) ? `'${value}` : value;
}

export function safeDownloadFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function downloadResponse(body: Uint8Array, contentType: string, filename: string): Response {
  const responseBody = new ArrayBuffer(body.byteLength);
  new Uint8Array(responseBody).set(body);
  return new Response(responseBody, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${safeDownloadFilename(filename)}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}