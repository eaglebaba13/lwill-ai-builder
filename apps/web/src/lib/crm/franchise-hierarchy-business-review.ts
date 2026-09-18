import "server-only";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { safeSpreadsheetText } from "../x-nail/data-transfer";
import type { HierarchyMappingPreview, MappingRowResult } from "./franchise-hierarchy-mapping";

export const BUSINESS_REVIEW_PACKAGE_VERSION = 1;
export type ReviewQueueStatus = "PENDING BUSINESS REVIEW" | "APPROVED" | "REJECTED" | "NEEDS DATA";
export type ReviewQueueItem = {
  reviewId: string;
  mappingType: MappingRowResult["mappingType"];
  sourceRecord: string;
  businessQuestion: string;
  evidenceAvailable: string;
  possibleChoices: string;
  recommendedInterpretation: string;
  requiredApprover: string;
  status: ReviewQueueStatus;
};
export type ZeroConditionGate = {
  activeOutletWithoutCity: number;
  cityWithoutState: number;
  tenantErrors: number;
  geographyErrors: number;
  coverageOverlaps: number;
  outletOverlaps: number;
  effectivePeriodErrors: number;
  mandatoryMappingErrors: number;
  ready: boolean;
};

const sheets = [
  { name:"State Mapping", headers:["State Mapping Key","Legacy Territory ID","Legacy Territory Name","Canonical State ID","Canonical State Code","State Franchise Name","Partner ID","Coverage Mode","Effective From","Effective To","Mapping Evidence","Mapping Status","Business Approval","Approver","Role / Authority","Approval Date","Review Note"] },
  { name:"City Mapping", headers:["City Mapping Key","Legacy Territory ID","Legacy Territory Name","State Franchise Mapping Key","Canonical City ID","Canonical City Code","City Franchise Name","Partner ID","Effective From","Effective To","Proposed Coverage","Mapping Evidence","Mapping Status","Business Approval","Approver","Role / Authority","Approval Date","Review Note"] },
  { name:"Coverage", headers:["City Franchise Mapping Key","Area Name","Normalized Pincode","Validation Status","Conflict Detail","Business Approval","Review Note"] },
  { name:"Outlet Mapping", headers:["Outlet Profile ID","Branch ID","Branch Name","Legacy Territory ID","Current Partner ID","City Franchise Mapping Key","Effective From","Effective To","Mapping Evidence","Mapping Status","Business Approval","Approver","Role / Authority","Approval Date","Review Note"] },
  { name:"Agreement Classification", headers:["Agreement ID","Partner ID","Legacy Territory ID","Linked Branch / Outlet Evidence","Effective From","Effective To","Proposed Level","Proposed Target Mapping Key","Purpose Code","Classification Status","Reason / Evidence","Business Approval","Review Note"] },
] as const;
function style(s:ExcelJS.Worksheet){
  s.views=[{state:"frozen",ySplit:1}];s.autoFilter={from:"A1",to:s.getColumn(s.columnCount).letter+"1"};
  s.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};s.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF6B2037"}};
  s.columns.forEach(c=>{c.width=Math.min(42,Math.max(18,String(c.header??"").length+3));});
}
function contains(row:MappingRowResult,terms:readonly string[]){const text=[...row.errors,...row.warnings].join(" ").toLowerCase();return terms.some(term=>text.includes(term));}
export function calculateZeroConditionGate(preview:HierarchyMappingPreview):ZeroConditionGate{
  const hierarchy=preview.rows.filter(r=>r.mappingType!=="AGREEMENT");
  const count=(terms:readonly string[])=>hierarchy.filter(r=>contains(r,terms)).length;
  const gate={
    activeOutletWithoutCity:preview.reconciliation.results.unmapped,
    cityWithoutState:count(["unknown state mapping","state mapping key does not resolve"]),
    tenantErrors:count(["cross-tenant","tenant boundary"]),
    geographyErrors:count(["canonical state","canonical city","canonical pincode","geography mismatch","does not belong"]),
    coverageOverlaps:count(["coverage overlap","pincode overlap"]),
    outletOverlaps:count(["outlet assignment overlap","duplicate outlet"]),
    effectivePeriodErrors:count(["effective period","outside parent period","outside city period","iso timestamp"]),
    mandatoryMappingErrors:hierarchy.filter(r=>r.status==="ERROR").length,
  };
  return{...gate,ready:Object.values(gate).every(value=>value===0)};
}
function question(row:MappingRowResult){
  if(row.mappingType==="AGREEMENT")return "Confirm hierarchy level, target, purpose, and supporting Agreement evidence.";
  if(row.mappingType==="OUTLET")return "Confirm this active Outlet's single City Franchise assignment and effective date.";
  if(row.mappingType==="COVERAGE")return "Confirm named area and canonical pincode rights do not overlap.";
  if(row.mappingType==="CITY")return "Confirm City Franchise parent, Partner, coverage, and effective period.";
  return "Confirm State Franchise holder, coverage mode, evidence, and effective period.";
}
export function createBusinessReviewQueue(preview:HierarchyMappingPreview):ReviewQueueItem[]{
  return preview.rows.filter(r=>r.status==="ERROR"||r.status==="AMBIGUOUS"||r.status==="WARNING").map((row,index)=>({
    reviewId:"FH4DB-"+String(index+1).padStart(4,"0"),
    mappingType:row.mappingType,
    sourceRecord:row.sourceId??"Not supplied",
    businessQuestion:question(row),
    evidenceAvailable:safeSpreadsheetText([...row.errors,...row.warnings].join(" | ")||"No verified evidence supplied"),
    possibleChoices:"Approve documented mapping | Reject mapping | Request authoritative evidence",
    recommendedInterpretation:row.status==="WARNING"?"Review supporting evidence; do not approve automatically.":"No automatic interpretation; authoritative evidence required.",
    requiredApprover:"Authorized X Nail business owner / data owner",
    status:row.sourceId?"PENDING BUSINESS REVIEW":"NEEDS DATA",
  }));
}
function reviewEvidence(row:MappingRowResult){
  return safeSpreadsheetText([...row.errors,...row.warnings].join(" | "));
}
function populateMappingReviewSheets(workbook:ExcelJS.Workbook,preview:HierarchyMappingPreview){
  for(const row of preview.rows){
    const common={"Mapping Status":row.status,"Business Approval":"","Review Note":reviewEvidence(row)};
    if(row.mappingType==="STATE")workbook.getWorksheet("State Mapping")?.addRow({
      "State Mapping Key":safeSpreadsheetText(row.targetKey),"Legacy Territory ID":safeSpreadsheetText(row.sourceId),
      "Canonical State ID":safeSpreadsheetText(row.resolvedReferences.stateId),
      "Partner ID":safeSpreadsheetText(row.resolvedReferences.partnerId),...common,
    });
    if(row.mappingType==="CITY")workbook.getWorksheet("City Mapping")?.addRow({
      "City Mapping Key":safeSpreadsheetText(row.targetKey),"Legacy Territory ID":safeSpreadsheetText(row.sourceId),
      "State Franchise Mapping Key":safeSpreadsheetText(row.resolvedReferences.stateMappingKey),
      "Canonical City ID":safeSpreadsheetText(row.resolvedReferences.cityId),
      "Partner ID":safeSpreadsheetText(row.resolvedReferences.partnerId),...common,
    });
    if(row.mappingType==="COVERAGE")workbook.getWorksheet("Coverage")?.addRow({
      "City Franchise Mapping Key":safeSpreadsheetText(row.resolvedReferences.cityMappingKey??row.targetKey),
      "Normalized Pincode":safeSpreadsheetText(row.sourceId),"Validation Status":row.status,
      "Conflict Detail":reviewEvidence(row),"Business Approval":"","Review Note":reviewEvidence(row),
    });
    if(row.mappingType==="OUTLET")workbook.getWorksheet("Outlet Mapping")?.addRow({
      "Outlet Profile ID":safeSpreadsheetText(row.resolvedReferences.outletProfileId??row.sourceId),
      "Branch ID":safeSpreadsheetText(row.resolvedReferences.branchId),
      "City Franchise Mapping Key":safeSpreadsheetText(row.resolvedReferences.cityMappingKey??row.targetKey),...common,
    });
    if(row.mappingType==="AGREEMENT")workbook.getWorksheet("Agreement Classification")?.addRow({
      "Agreement ID":safeSpreadsheetText(row.resolvedReferences.agreementId??row.sourceId),
      "Proposed Level":safeSpreadsheetText(row.resolvedReferences.proposedLevel),
      "Proposed Target Mapping Key":safeSpreadsheetText(row.resolvedReferences.targetMappingKey??row.targetKey),
      "Classification Status":row.agreementClassification??row.status,
      "Reason / Evidence":reviewEvidence(row),"Business Approval":"","Review Note":reviewEvidence(row),
    });
  }
}
export async function createBusinessMappingReviewWorkbook(preview?:HierarchyMappingPreview):Promise<Uint8Array>{
  const w=new ExcelJS.Workbook();w.creator="X Nail";w.created=new Date(0);
  const i=w.addWorksheet("Instructions");i.columns=[{width:30},{width:100}];i.addRows([
    ["Package Version",BUSINESS_REVIEW_PACKAGE_VERSION],
    ["Status",preview?"DRY-RUN BUSINESS REVIEW - NO WRITES":"DATA REQUIRED - BLANK REVIEW PACKAGE"],
    ["Authority","No row is approved unless Approver, Role / Authority, Approval Date, and explicit mapping evidence are recorded."],
    ["Prohibited inference","Territory names are supporting evidence only and never determine ownership, Partner, area, Outlet, or Agreement target."],
    ["Financial boundary","Do not calculate or modify invoices, sales, GST, MG, royalty, payout, settlement, payment, commission, or Director allocations."],
    ["Required source","Approved read-only production-shaped snapshot containing only the documented legacy mapping fields."],
  ]);i.getColumn(1).font={bold:true};
  for(const d of sheets){const s=w.addWorksheet(d.name);s.columns=d.headers.map(h=>({header:h,key:h}));style(s);}
  if(preview)populateMappingReviewSheets(w,preview);
  const queue=w.addWorksheet("Issues - Review Queue");queue.columns=["Review ID","Mapping Type","Source Record","Business Question","Evidence Available","Possible Choices","Recommended Interpretation","Required Approver","Status"].map(h=>({header:h,key:h}));
  for(const q of preview?createBusinessReviewQueue(preview):[])queue.addRow(Object.values(q).map(safeSpreadsheetText));style(queue);
  const rec=w.addWorksheet("Reconciliation Summary");rec.columns=[{header:"Scope",key:"scope"},{header:"Metric",key:"metric"},{header:"Count / Status",key:"value"}];
  if(preview){for(const [k,v] of Object.entries(preview.reconciliation.legacy))rec.addRow({scope:"Legacy",metric:safeSpreadsheetText(k),value:v});for(const [k,v] of Object.entries(preview.reconciliation.proposed))rec.addRow({scope:"Proposed",metric:safeSpreadsheetText(k),value:v});for(const [k,v] of Object.entries(preview.reconciliation.results))rec.addRow({scope:"Result",metric:safeSpreadsheetText(k),value:v});const gate=calculateZeroConditionGate(preview);for(const [k,v] of Object.entries(gate))rec.addRow({scope:"Hierarchy zero-condition",metric:safeSpreadsheetText(k),value:String(v)});}else rec.addRow({scope:"Dataset",metric:"Approved production-shaped read-only mapping data",value:"REQUIRED"});
  style(rec);return new Uint8Array(await w.xlsx.writeBuffer());
}
export function createBusinessMappingReviewPdf(preview?:HierarchyMappingPreview,generatedAt=new Date()):Promise<Uint8Array>{
  return new Promise((resolve,reject)=>{const d=new PDFDocument({size:"A4",margin:42,info:{Title:"X Nail Business Mapping Review",Author:"X Nail"}}),chunks:Buffer[]=[];d.on("data",(c:Buffer)=>chunks.push(c));d.on("error",reject);d.on("end",()=>resolve(new Uint8Array(Buffer.concat(chunks))));
    d.fontSize(17).text("X Nail franchise hierarchy business mapping review");d.fontSize(8).text("Generated "+generatedAt.toISOString()+" | Review only | No writes");
    if(!preview){d.moveDown().fontSize(12).text("DATA REQUIRED");d.fontSize(9).text("No authorized production-shaped read-only dataset was available. Mapping totals, approvals, and readiness are intentionally not claimed.");}
    else{const gate=calculateZeroConditionGate(preview),queue=createBusinessReviewQueue(preview);d.moveDown().fontSize(11).text("Review queue");d.fontSize(9).text("Total: "+queue.length+" | Pending: "+queue.filter(q=>q.status==="PENDING BUSINESS REVIEW").length+" | Needs data: "+queue.filter(q=>q.status==="NEEDS DATA").length);d.moveDown().fontSize(11).text("Hierarchy zero-condition");for(const [k,v] of Object.entries(gate))d.fontSize(9).text(safeSpreadsheetText(k)+": "+v);}
    d.moveDown().fontSize(9).text("Agreement blockers are separate from hierarchy-foundation blockers. This report does not authorize backfill.");d.end();
  });
}
