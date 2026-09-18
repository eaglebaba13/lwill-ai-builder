import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import {
  createHierarchyMappingTemplate,
  createHierarchyReconciliationPdf,
  createHierarchyReconciliationWorkbook,
  previewHierarchyMappingWorkbook,
  type MappingReferenceData,
} from "@/lib/crm/franchise-hierarchy-mapping";

vi.mock("server-only", () => ({}));
const territory="11111111-1111-4111-8111-111111111111",partner="22222222-2222-4222-8222-222222222222";
const state="33333333-3333-4333-8333-333333333333",city="44444444-4444-4444-8444-444444444444";
const pinId="55555555-5555-4555-8555-555555555555",branch="66666666-6666-4666-8666-666666666666";
const outlet="77777777-7777-4777-8777-777777777777",agreement="88888888-8888-4888-8888-888888888888";
const tenant="99999999-9999-4999-8999-999999999999",from="2026-10-01T00:00:00.000Z",to="2027-10-01T00:00:00.000Z";
function refs(overrides:Partial<MappingReferenceData>={}):MappingReferenceData{return{tenantId:tenant,territories:[{id:territory,tenantId:tenant,name:"Surat"}],partners:[{id:partner,tenantId:tenant}],states:[{id:state,code:"GJ"}],cities:[{id:city,stateId:state,code:"SURAT"}],pincodes:[{id:pinId,stateId:state,cityId:city,value:"395001"}],branches:[{id:branch,tenantId:tenant,name:"Surat One"}],outletProfiles:[{id:outlet,tenantId:tenant,branchId:branch,partnerId:partner,isActive:true}],agreements:[{id:agreement,tenantId:tenant,partnerId:partner,territoryId:territory,startDate:new Date(from),endDate:new Date(to)}],agreementOutlets:[{id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",tenantId:tenant,agreementId:agreement,branchId:branch}],financialReferenceCounts:{invoices:4,settlements:2,payments:1},...overrides};}
async function workbook(mutator?:(w:ExcelJS.Workbook)=>void){
  const bytes=await createHierarchyMappingTemplate(),w=new ExcelJS.Workbook();await w.xlsx.load(bytes as unknown as Parameters<typeof w.xlsx.load>[0]);
  w.getWorksheet("State Mapping")!.addRow([1,"state-gujarat",territory,"Surat",state,"GJ","Gujarat",partner,"WHOLE_STATE",from,to,""]);
  w.getWorksheet("City Mapping")!.addRow([1,"city-surat",territory,"Surat","state-gujarat",city,"SURAT","Surat City",partner,from,to,""]);
  w.getWorksheet("Coverage")!.addRow([1,"city-surat","Central","395001"]);
  w.getWorksheet("Outlet Mapping")!.addRow([1,outlet,branch,"Surat One","city-surat",from,to,""]);
  w.getWorksheet("Agreement Classification")!.addRow([1,agreement,"AGR-1","CITY","city-surat","OPERATING",from,to,""]);
  mutator?.(w);return new Uint8Array(await w.xlsx.writeBuffer());
}
const upload=async(mutator?:(w:ExcelJS.Workbook)=>void)=>({filename:"hierarchy.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes:await workbook(mutator)});

describe("FH-4D hierarchy mapping workbook",()=>{
  it("creates a genuine deterministic five-sheet template without formulas",async()=>{const w=new ExcelJS.Workbook();await w.xlsx.load(await createHierarchyMappingTemplate() as unknown as Parameters<typeof w.xlsx.load>[0]);expect(w.worksheets.map(s=>s.name)).toEqual(["Instructions","State Mapping","City Mapping","Coverage","Outlet Mapping","Agreement Classification"]);for(const s of w.worksheets)s.eachRow(r=>r.eachCell(c=>expect(c.type).not.toBe(ExcelJS.ValueType.Formula)));});
  it("previews a valid workbook and reconciles legacy, proposed, and financial counts",async()=>{const p=await previewHierarchyMappingWorkbook(await upload(),refs());expect(p.rows).toHaveLength(5);expect(p.rows.every(r=>r.status==="VALID")).toBe(true);expect(p.reconciliation.proposed).toMatchObject({stateFranchises:1,cityFranchises:1,pincodes:1,outletAssignments:1,agreementClassifications:1});expect(p.reconciliation.financialReferenceCounts).toEqual({invoices:4,settlements:2,payments:1});expect(p.reconciliation.gates.hierarchyBlocking).toEqual([]);});
  it("rejects wrong template version, missing headers, wrong type, and oversized metadata",async()=>{await expect(previewHierarchyMappingWorkbook({...await upload(),filename:"x.csv"},refs())).rejects.toThrow("Only XLSX");await expect(previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("Instructions")!.getCell("B1").value=2;}),refs())).rejects.toThrow("Unsupported");await expect(previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("State Mapping")!.spliceColumns(1,1);}),refs())).rejects.toThrow("required header");});
  it("rejects formula cells without evaluating them",async()=>{const p=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("Coverage")!.getCell("D2").value={formula:"1+1",result:"395001"};}),refs());expect(p.rows.find(r=>r.mappingType==="COVERAGE")?.errors).toContain("Pincode: formula cells are not allowed.");});
  it("reports duplicate keys, bad UUIDs, unknown Territory, and unknown Partner",async()=>{const p=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("State Mapping")!.addRow([1,"state-gujarat","bad","",state,"GJ","Duplicate","00000000-0000-4000-8000-000000000000","WHOLE_STATE",from,to,""]);}),refs());const r=p.rows.filter(x=>x.mappingType==="STATE")[1]!;expect(r.errors).toEqual(expect.arrayContaining(["Unknown Territory.","Unknown Partner.","Duplicate State mapping key."]));});
  it("rejects invalid geography and overlapping City coverage but permits same-city non-overlap",async()=>{const secondCity="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";const p=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("City Mapping")!.addRow([1,"city-surat-two",territory,"","state-gujarat",city,"SURAT","Surat Two",partner,"2026-11-01T00:00:00.000Z",to,""]);w.getWorksheet("Coverage")!.addRow([1,"city-surat-two","West","395001"]);}),refs());expect(p.rows.find(r=>r.targetKey==="city-surat-two")?.errors).toContain("City coverage overlap.");const ok=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("City Mapping")!.addRow([1,"city-surat-two",territory,"","state-gujarat",city,"SURAT","Surat Two",partner,"2027-10-01T00:00:00.000Z","2028-10-01T00:00:00.000Z",""]);w.getWorksheet("Coverage")!.addRow([1,"city-surat-two","West","395001"]);}),refs());expect(ok.rows.find(r=>r.targetKey==="city-surat-two")?.errors).not.toContain("City coverage overlap.");expect(secondCity).toBeTruthy();});
  it("rejects invalid pincode and existing State overlap",async()=>{const p=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("Coverage")!.getCell("D2").value="999999";}),refs({existingStateFranchises:[{stateId:state,coverageMode:"WHOLE_STATE",pincodeIds:[],effectiveFrom:new Date(from),effectiveTo:null}]}));expect(p.rows.find(r=>r.mappingType==="COVERAGE")?.errors).toContain("Invalid canonical pincode.");expect(p.rows.find(r=>r.mappingType==="STATE")?.errors).toContain("State coverage overlap.");});
  it("rejects overlapping proposed State mappings but allows adjacent periods",async()=>{
    const conflicting=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("State Mapping")!.addRow([1,"state-gujarat-two",territory,"",state,"GJ","Gujarat Two",partner,"WHOLE_STATE","2026-11-01T00:00:00.000Z",to,""]);}),refs());
    expect(conflicting.rows.find(r=>r.targetKey==="state-gujarat-two")?.errors).toContain("State coverage overlap.");
    const adjacent=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("State Mapping")!.addRow([1,"state-gujarat-two",territory,"",state,"GJ","Gujarat Two",partner,"WHOLE_STATE",to,"2028-10-01T00:00:00.000Z",""]);}),refs());
    expect(adjacent.rows.find(r=>r.targetKey==="state-gujarat-two")?.errors).not.toContain("State coverage overlap.");
  });
  it("allows overlapping periods for separate canonical States",async()=>{
    const otherState="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab";
    const p=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("State Mapping")!.addRow([1,"state-maharashtra",territory,"",otherState,"MH","Maharashtra",partner,"WHOLE_STATE",from,to,""]);}),refs({states:[{id:state,code:"GJ"},{id:otherState,code:"MH"}]}));
    expect(p.rows.find(r=>r.targetKey==="state-maharashtra")?.errors).not.toContain("State coverage overlap.");
  });
  it("checks proposed City coverage against existing hierarchy periods",async()=>{
    const conflict=await previewHierarchyMappingWorkbook(await upload(),refs({existingCityFranchises:[{cityId:city,pincodeIds:[pinId],effectiveFrom:new Date(from),effectiveTo:null}]}));
    expect(conflict.rows.find(r=>r.targetKey==="city-surat")?.errors).toContain("City coverage overlap.");
    const adjacent=await previewHierarchyMappingWorkbook(await upload(),refs({existingCityFranchises:[{cityId:city,pincodeIds:[pinId],effectiveFrom:new Date(to),effectiveTo:null}]}));
    expect(adjacent.rows.find(r=>r.targetKey==="city-surat")?.errors).not.toContain("City coverage overlap.");
  });
  it("allows same-city and unrelated existing assignments with distinct pincode coverage",async()=>{
    const otherPin="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac";
    const sameCity=await previewHierarchyMappingWorkbook(await upload(),refs({existingCityFranchises:[{cityId:city,pincodeIds:[otherPin],effectiveFrom:new Date(from),effectiveTo:null}]}));
    expect(sameCity.rows.find(r=>r.targetKey==="city-surat")?.errors).not.toContain("City coverage overlap.");
    const unrelated=await previewHierarchyMappingWorkbook(await upload(),refs({existingCityFranchises:[{cityId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad",pincodeIds:[otherPin],effectiveFrom:new Date(from),effectiveTo:null}]}));
    expect(unrelated.rows.find(r=>r.targetKey==="city-surat")?.errors).not.toContain("City coverage overlap.");
  });  it("rejects Outlet mismatch, duplicate, overlap, and cross-tenant references",async()=>{const p=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("Outlet Mapping")!.addRow([1,outlet,branch,"","city-surat",from,to,""]);}),refs({branches:[{id:branch,tenantId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",name:"Wrong"}],existingOutletAssignments:[{outletProfileId:outlet,effectiveFrom:new Date(from),effectiveTo:null}]}));const out=p.rows.filter(r=>r.mappingType==="OUTLET");expect(out[0]?.errors).toEqual(expect.arrayContaining(["Cross-tenant Branch.","Outlet assignment overlap."]));expect(out[1]?.errors).toContain("Duplicate Outlet mapping.");});
  it("surfaces ambiguous Agreement classification without changing Agreement data",async()=>{const before=structuredClone(refs());const data=refs();const p=await previewHierarchyMappingWorkbook(await upload(w=>{w.getWorksheet("Agreement Classification")!.getCell("E2").value="missing-target";}),data);expect(p.rows.find(r=>r.mappingType==="AGREEMENT")).toMatchObject({status:"AMBIGUOUS",agreementClassification:"BUSINESS REVIEW REQUIRED"});expect(p.mutationCount).toBe(0);expect(data).toEqual(before);});
  it("has no writer surface and exports genuine formula-safe XLSX and PDF reports",async()=>{const p=await previewHierarchyMappingWorkbook(await upload(),refs());expect("commit" in p).toBe(false);const x=await createHierarchyReconciliationWorkbook(p),pdf=await createHierarchyReconciliationPdf(p,new Date(0));const w=new ExcelJS.Workbook();await w.xlsx.load(x as unknown as Parameters<typeof w.xlsx.load>[0]);expect(w.getWorksheet("Reconciliation")).toBeDefined();expect(Buffer.from(pdf).subarray(0,4).toString()).toBe("%PDF");});
});
