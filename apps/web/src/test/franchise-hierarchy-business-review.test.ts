import ExcelJS from "exceljs";
import { describe,expect,it,vi } from "vitest";
import { calculateZeroConditionGate,createBusinessMappingReviewPdf,createBusinessMappingReviewWorkbook,createBusinessReviewQueue } from "@/lib/crm/franchise-hierarchy-business-review";
import type { HierarchyMappingPreview } from "@/lib/crm/franchise-hierarchy-mapping";
vi.mock("server-only",()=>({}));
function preview():HierarchyMappingPreview{return{templateVersion:1,mutationCount:0,rows:[
 {rowNumber:2,mappingType:"STATE",status:"VALID",sourceId:"=territory-1",targetKey:"state-1",errors:[],warnings:[],resolvedReferences:{stateId:"geo-state-1",partnerId:"partner-1"}},
 {rowNumber:2,mappingType:"CITY",status:"ERROR",sourceId:"territory-1",targetKey:"city-1",errors:["Unknown State mapping key.","City coverage overlap."],warnings:[],resolvedReferences:{stateMappingKey:"state-1",cityId:"geo-city-1",partnerId:"partner-2"}},
 {rowNumber:2,mappingType:"COVERAGE",status:"VALID",sourceId:"395001",targetKey:"city-1",errors:[],warnings:[],resolvedReferences:{cityMappingKey:"city-1",pincodeId:"pin-1"}},
 {rowNumber:2,mappingType:"OUTLET",status:"ERROR",sourceId:"outlet-1",targetKey:"city-1",errors:["Cross-tenant Outlet.","Outlet assignment overlap."],warnings:[],resolvedReferences:{outletProfileId:"outlet-1",branchId:"branch-1",cityMappingKey:"city-1"}},
 {rowNumber:2,mappingType:"AGREEMENT",status:"AMBIGUOUS",sourceId:"agreement-1",targetKey:"city-1",errors:[],warnings:["Target is not uniquely supported."],resolvedReferences:{agreementId:"agreement-1",proposedLevel:"CITY",targetMappingKey:"city-1"},agreementClassification:"BUSINESS REVIEW REQUIRED"},
],reconciliation:{legacy:{territories:1,partners:1,agreements:1,agreementOutlets:1,outletProfiles:1,branches:1},proposed:{stateFranchises:1,cityFranchises:1,areas:1,pincodes:1,outletAssignments:1,agreementClassifications:1},results:{mapped:0,unmapped:1,ambiguous:1,invalid:2},gates:{hierarchyBlocking:["1 active Outlet unmapped."],agreementMigrationBlocking:["1 unresolved Agreement classification."]},financialReferenceCounts:{invoices:0,settlements:0,payments:0}}};}
describe("FH-4D-B business mapping review package",()=>{
 it("creates the required eight-sheet blank DATA REQUIRED workbook",async()=>{const w=new ExcelJS.Workbook();await w.xlsx.load(await createBusinessMappingReviewWorkbook() as unknown as Parameters<typeof w.xlsx.load>[0]);expect(w.worksheets.map(s=>s.name)).toEqual(["Instructions","State Mapping","City Mapping","Coverage","Outlet Mapping","Agreement Classification","Issues - Review Queue","Reconciliation Summary"]);expect(w.getWorksheet("Instructions")!.getCell("B2").text).toContain("DATA REQUIRED");});
 it("populates every mapping sheet from preview evidence without inventing approvals",async()=>{
  const w=new ExcelJS.Workbook();await w.xlsx.load(await createBusinessMappingReviewWorkbook(preview()) as unknown as Parameters<typeof w.xlsx.load>[0]);
  expect(w.getWorksheet("State Mapping")!.getCell("A2").text).toBe("state-1");
  expect(w.getWorksheet("State Mapping")!.getCell("B2").text).toBe("'=territory-1");
  expect(w.getWorksheet("City Mapping")!.getCell("A2").text).toBe("city-1");
  expect(w.getWorksheet("Coverage")!.getCell("C2").text).toBe("395001");
  expect(w.getWorksheet("Outlet Mapping")!.getCell("A2").text).toBe("outlet-1");
  expect(w.getWorksheet("Agreement Classification")!.getCell("A2").text).toBe("agreement-1");
  expect(w.getWorksheet("Agreement Classification")!.getCell("J2").text).toBe("BUSINESS REVIEW REQUIRED");
  for(const [name,column] of [["State Mapping",13],["City Mapping",14],["Coverage",6],["Outlet Mapping",11],["Agreement Classification",12]] as const)expect(w.getWorksheet(name)!.getColumn(column).values).not.toContain("APPROVED");
  expect(w.getWorksheet("Issues - Review Queue")!.rowCount).toBe(4);
  expect(w.getWorksheet("Reconciliation Summary")!.getColumn("B").values).toContain("stateFranchises");
 }); it("contains no formulas or invented approvals",async()=>{const w=new ExcelJS.Workbook();await w.xlsx.load(await createBusinessMappingReviewWorkbook(preview()) as unknown as Parameters<typeof w.xlsx.load>[0]);for(const s of w.worksheets)s.eachRow(r=>r.eachCell(c=>expect(c.type).not.toBe(ExcelJS.ValueType.Formula)));expect(w.getWorksheet("Issues - Review Queue")!.getCell("I2").text).toBe("PENDING BUSINESS REVIEW");expect(w.getWorksheet("Issues - Review Queue")!.getColumn("I").values).not.toContain("APPROVED");});
 it("preserves invalid and ambiguous mappings in the review queue",()=>{const q=createBusinessReviewQueue(preview());expect(q).toHaveLength(3);expect(q.map(x=>x.mappingType)).toEqual(["CITY","OUTLET","AGREEMENT"]);expect(q.every(x=>x.status==="PENDING BUSINESS REVIEW")).toBe(true);});
 it("separates exact hierarchy zero-condition categories from Agreement review",()=>{const g=calculateZeroConditionGate(preview());expect(g).toMatchObject({activeOutletWithoutCity:1,cityWithoutState:1,tenantErrors:1,coverageOverlaps:1,outletOverlaps:1,mandatoryMappingErrors:2,ready:false});});
 it("marks a zero-error hierarchy preview ready without requiring Agreement ambiguity to be zero",()=>{const p=preview();const clean={...p,rows:p.rows.filter(r=>r.mappingType==="AGREEMENT"),reconciliation:{...p.reconciliation,results:{mapped:0,unmapped:0,ambiguous:1,invalid:0},gates:{hierarchyBlocking:[],agreementMigrationBlocking:["pending"]}}};expect(calculateZeroConditionGate(clean).ready).toBe(true);});
 it("does not mutate preview data and emits a genuine PDF",async()=>{const p=preview(),before=structuredClone(p),pdf=await createBusinessMappingReviewPdf(p,new Date(0));expect(p).toEqual(before);expect(p.mutationCount).toBe(0);expect(Buffer.from(pdf).subarray(0,4).toString()).toBe("%PDF");});
 it("generates a DATA REQUIRED PDF when no authorized dataset exists",async()=>{const pdf=await createBusinessMappingReviewPdf(undefined,new Date(0));expect(Buffer.from(pdf).subarray(0,4).toString()).toBe("%PDF");});
});
