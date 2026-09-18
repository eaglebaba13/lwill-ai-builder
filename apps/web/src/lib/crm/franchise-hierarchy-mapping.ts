import "server-only";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { safeSpreadsheetText } from "../x-nail/data-transfer";

export const HIERARCHY_MAPPING_TEMPLATE_VERSION = 1;
export const HIERARCHY_MAPPING_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const HIERARCHY_MAPPING_MAX_ROWS = 1000;
export type MappingStatus = "VALID" | "WARNING" | "ERROR" | "AMBIGUOUS";
export type MappingType = "STATE" | "CITY" | "COVERAGE" | "OUTLET" | "AGREEMENT";
export type MappingReferenceData = {
  tenantId: string;
  territories: readonly { id: string; tenantId: string; name: string }[];
  partners: readonly { id: string; tenantId: string }[];
  states: readonly { id: string; code: string }[];
  cities: readonly { id: string; stateId: string; code: string }[];
  pincodes: readonly { id: string; stateId: string; cityId: string; value: string }[];
  branches: readonly { id: string; tenantId: string; name: string }[];
  outletProfiles: readonly { id: string; tenantId: string; branchId: string; partnerId: string; isActive: boolean }[];
  agreements: readonly { id: string; tenantId: string; partnerId: string; territoryId: string; startDate: Date; endDate: Date | null }[];
  agreementOutlets: readonly { id: string; tenantId: string; agreementId: string; branchId: string }[];
  existingStateFranchises?: readonly { stateId: string; coverageMode: "WHOLE_STATE" | "PINCODE_SET"; pincodeIds: readonly string[]; effectiveFrom: Date; effectiveTo: Date | null }[];
  existingCityFranchises?: readonly { cityId: string; pincodeIds: readonly string[]; effectiveFrom: Date; effectiveTo: Date | null }[];
  existingOutletAssignments?: readonly { outletProfileId: string; effectiveFrom: Date; effectiveTo: Date | null }[];
  financialReferenceCounts?: Readonly<Record<"invoices" | "settlements" | "payments", number>>;
};
export type MappingRowResult = {
  rowNumber: number; mappingType: MappingType; status: MappingStatus; sourceId: string | null;
  targetKey: string | null; errors: readonly string[]; warnings: readonly string[];
  resolvedReferences: Readonly<Record<string, string>>;
  agreementClassification?: "DETERMINISTIC" | "AMBIGUOUS" | "UNMAPPABLE" | "BUSINESS REVIEW REQUIRED";
};
export type HierarchyMappingPreview = {
  templateVersion: 1; rows: readonly MappingRowResult[]; mutationCount: 0;
  reconciliation: {
    legacy: Record<"territories" | "partners" | "agreements" | "agreementOutlets" | "outletProfiles" | "branches", number>;
    proposed: Record<"stateFranchises" | "cityFranchises" | "areas" | "pincodes" | "outletAssignments" | "agreementClassifications", number>;
    results: Record<"mapped" | "unmapped" | "ambiguous" | "invalid", number>;
    gates: { hierarchyBlocking: readonly string[]; agreementMigrationBlocking: readonly string[] };
    financialReferenceCounts: Readonly<Record<"invoices" | "settlements" | "payments", number>>;
  };
};

type Def = { name: string; headers: readonly string[]; required: readonly string[] };
const defs: Record<MappingType, Def> = {
  STATE: { name: "State Mapping", headers: ["Template Version","State Mapping Key","Legacy Territory ID","Legacy Territory Name","Canonical State ID","Canonical State Code","State Franchise Name","Partner ID","Coverage Mode","Effective From","Effective To","Notes"], required: ["Template Version","State Mapping Key","Legacy Territory ID","Canonical State ID","Canonical State Code","State Franchise Name","Partner ID","Coverage Mode","Effective From"] },
  CITY: { name: "City Mapping", headers: ["Template Version","City Mapping Key","Legacy Territory ID","Legacy Territory Name","State Franchise Mapping Key","Canonical City ID","Canonical City Code","City Franchise Name","Partner ID","Effective From","Effective To","Notes"], required: ["Template Version","City Mapping Key","Legacy Territory ID","State Franchise Mapping Key","Canonical City ID","Canonical City Code","City Franchise Name","Partner ID","Effective From"] },
  COVERAGE: { name: "Coverage", headers: ["Template Version","City Franchise Mapping Key","Area Name","Pincode"], required: ["Template Version","City Franchise Mapping Key","Area Name","Pincode"] },
  OUTLET: { name: "Outlet Mapping", headers: ["Template Version","Outlet Profile ID","Branch ID","Branch Name","City Franchise Mapping Key","Effective From","Effective To","Notes"], required: ["Template Version","Outlet Profile ID","Branch ID","City Franchise Mapping Key","Effective From"] },
  AGREEMENT: { name: "Agreement Classification", headers: ["Template Version","Agreement ID","Agreement Reference","Proposed Level","Proposed Target Mapping Key","Purpose Code","Effective From","Effective To","Notes"], required: ["Template Version","Agreement ID","Proposed Level","Proposed Target Mapping Key","Purpose Code","Effective From"] },
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mime = new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/octet-stream"]);
const future = new Date(8640000000000000);
function style(s: ExcelJS.Worksheet) {
  s.views=[{state:"frozen",ySplit:1}]; s.autoFilter={from:"A1",to:s.getColumn(s.columnCount).letter+"1"};
  s.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
  s.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF6B2037"}};
  s.columns.forEach(c=>{c.width=Math.min(38,Math.max(16,String(c.header??"").length+3));});
}
export async function createHierarchyMappingTemplate(): Promise<Uint8Array> {
  const w=new ExcelJS.Workbook(); w.creator="X Nail"; w.created=new Date(0);
  const i=w.addWorksheet("Instructions"); i.columns=[{width:30},{width:92}];
  i.addRows([["Template Version",1],["Mode","PREVIEW / DRY RUN ONLY. No database writes."],["Mapping keys","Use unique workbook-local keys. Never infer ownership from Territory names."],["Dates","ISO timestamps with timezone; half-open periods."],["Agreement","Classification only; no financial values change."],["Security","Formula cells rejected; 1000 rows per sheet; 5 MB maximum."]]);
  i.getColumn(1).font={bold:true};
  for(const d of Object.values(defs)){const s=w.addWorksheet(d.name);s.columns=d.headers.map(h=>({header:h,key:h}));style(s);}
  return new Uint8Array(await w.xlsx.writeBuffer());
}
function value(c: ExcelJS.Cell): unknown {
  return c.type===ExcelJS.ValueType.Formula||(c.value&&typeof c.value==="object"&&"formula" in c.value)?Symbol.for("formula"):c.value;
}
function txt(v: unknown): string {
  if(v==null)return ""; if(v instanceof Date)return v.toISOString();
  if(typeof v==="object"&&"text" in v&&typeof v.text==="string")return v.text.trim();
  return String(v).trim();
}
function date(v:string){if(!/^\d{4}-\d{2}-\d{2}T/.test(v))return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
function overlap(af:Date,at:Date|null,bf:Date,bt:Date|null){return af<(bt??future)&&bf<(at??future);}
type Parsed={rowNumber:number;values:Record<string,string>;formulas:string[]};
function parse(s:ExcelJS.Worksheet,d:Def):Parsed[]{
  const cols=new Map<string,number>(),dupes=new Set<string>();
  s.getRow(1).eachCell({includeEmpty:false},(c,n)=>{const h=txt(value(c));if(cols.has(h))dupes.add(h);cols.set(h,n);});
  if(dupes.size)throw new Error(d.name+": duplicate headers.");
  const unknown=[...cols.keys()].filter(h=>!d.headers.includes(h));if(unknown.length)throw new Error(d.name+": unknown headers.");
  for(const h of d.required)if(!cols.has(h))throw new Error(d.name+': required header "'+h+'" is missing.');
  if(s.actualRowCount-1>HIERARCHY_MAPPING_MAX_ROWS)throw new Error(d.name+": exceeds row limit.");
  const out:Parsed[]=[];
  for(let n=2;n<=s.actualRowCount;n++){const vals:Record<string,string>={},formulas:string[]=[];
    for(const h of d.headers){const v=value(s.getRow(n).getCell(cols.get(h)??0));if(v===Symbol.for("formula"))formulas.push(h);vals[h]=txt(v);}
    if(!Object.values(vals).every(v=>v==="")||formulas.length)out.push({rowNumber:n,values:vals,formulas});
  }return out;
}
function base(r:Parsed,d:Def){const e=r.formulas.map(h=>h+": formula cells are not allowed.");for(const h of d.required)if(!r.values[h])e.push(h+" is required.");if(r.values["Template Version"]!=="1")e.push("Template Version must be 1.");return e;}
function dates(r:Parsed,e:string[]){const f=date(r.values["Effective From"]),t=r.values["Effective To"]?date(r.values["Effective To"]):null;if(!f)e.push("Effective From must be an ISO timestamp.");if(r.values["Effective To"]&&!t)e.push("Effective To must be an ISO timestamp.");if(f&&t&&f>=t)e.push("Invalid effective period.");return{f,t};}
function result(type:MappingType,r:Parsed,source:string,key:string,e:string[],w:string[],resolved:Record<string,string>,classification?:MappingRowResult["agreementClassification"]):MappingRowResult{
  const status:MappingStatus=e.length?"ERROR":classification==="AMBIGUOUS"||classification==="BUSINESS REVIEW REQUIRED"?"AMBIGUOUS":w.length?"WARNING":"VALID";
  return{rowNumber:r.rowNumber,mappingType:type,status,sourceId:source||null,targetKey:key||null,errors:e,warnings:w,resolvedReferences:resolved,...(classification?{agreementClassification:classification}:{})};
}
function mark(rows:MappingRowResult[],type:MappingType,key:string,message:string){const n=rows.findIndex(r=>r.mappingType===type&&r.targetKey===key);if(n<0)return;const r=rows[n] as MappingRowResult;if(!r.errors.includes(message))rows[n]={...r,status:"ERROR",errors:[...r.errors,message]};}

export async function previewHierarchyMappingWorkbook(upload:{filename:string;mimeType:string;bytes:Uint8Array},refs:MappingReferenceData):Promise<HierarchyMappingPreview>{
  if(!upload.filename.toLowerCase().endsWith(".xlsx")||!mime.has(upload.mimeType))throw new Error("Only XLSX mapping workbooks are accepted.");
  if(!upload.bytes.length||upload.bytes.length>HIERARCHY_MAPPING_MAX_UPLOAD_BYTES)throw new Error("Workbook must be non-empty and no larger than 5 MB.");
  const w=new ExcelJS.Workbook();try{await w.xlsx.load(upload.bytes as unknown as Parameters<typeof w.xlsx.load>[0]);}catch{throw new Error("The uploaded file is not a readable XLSX workbook.");}
  if(Number(w.getWorksheet("Instructions")?.getCell("B1").value)!==1)throw new Error("Unsupported template version. Expected version 1.");
  const p=new Map<MappingType,Parsed[]>();for(const [type,d] of Object.entries(defs) as [MappingType,Def][]){const s=w.getWorksheet(d.name);if(!s)throw new Error('Required worksheet "'+d.name+'" is missing.');p.set(type,parse(s,d));}
  const territories=new Map(refs.territories.map(x=>[x.id,x])),partners=new Map(refs.partners.map(x=>[x.id,x])),states=new Map(refs.states.map(x=>[x.id,x])),cities=new Map(refs.cities.map(x=>[x.id,x])),pins=new Map(refs.pincodes.map(x=>[x.value,x])),branches=new Map(refs.branches.map(x=>[x.id,x])),outlets=new Map(refs.outletProfiles.map(x=>[x.id,x])),agreements=new Map(refs.agreements.map(x=>[x.id,x]));
  const rows:MappingRowResult[]=[],stateKeys=new Map<string,{stateId:string;partnerId:string;mode:string;f:Date|null;t:Date|null}>(),cityKeys=new Map<string,{stateKey:string;cityId:string;partnerId:string;f:Date|null;t:Date|null}>(),coverage=new Map<string,Parsed[]>();
  for(const r of p.get("STATE")??[]){const e=base(r,defs.STATE),key=r.values["State Mapping Key"],tid=r.values["Legacy Territory ID"],sid=r.values["Canonical State ID"],pid=r.values["Partner ID"],d=dates(r,e),territory=territories.get(tid),partner=partners.get(pid),state=states.get(sid),mode=r.values["Coverage Mode"];
    if(!uuid.test(tid)||!territory)e.push("Unknown Territory.");else if(territory.tenantId!==refs.tenantId)e.push("Cross-tenant Territory.");
    if(!uuid.test(pid)||!partner)e.push("Unknown Partner.");else if(partner.tenantId!==refs.tenantId)e.push("Cross-tenant Partner.");
    if(!uuid.test(sid)||!state||state.code!==r.values["Canonical State Code"])e.push("Invalid canonical State.");
    if(!["WHOLE_STATE","PINCODE_SET"].includes(mode))e.push("Invalid coverage mode.");if(stateKeys.has(key))e.push("Duplicate State mapping key.");
    stateKeys.set(key,{stateId:sid,partnerId:pid,mode,f:d.f,t:d.t});rows.push(result("STATE",r,tid,key,e,[],{territoryId:tid,stateId:sid,partnerId:pid}));}
  for(const r of p.get("CITY")??[]){const e=base(r,defs.CITY),key=r.values["City Mapping Key"],sk=r.values["State Franchise Mapping Key"],tid=r.values["Legacy Territory ID"],cid=r.values["Canonical City ID"],pid=r.values["Partner ID"],d=dates(r,e),parent=stateKeys.get(sk),city=cities.get(cid),territory=territories.get(tid),partner=partners.get(pid);
    if(!uuid.test(tid)||!territory)e.push("Unknown Territory.");else if(territory.tenantId!==refs.tenantId)e.push("Cross-tenant Territory.");if(!parent)e.push("Unknown State mapping key.");
    if(!uuid.test(pid)||!partner)e.push("Unknown Partner.");else if(partner.tenantId!==refs.tenantId)e.push("Cross-tenant Partner.");
    if(!uuid.test(cid)||!city||city.code!==r.values["Canonical City Code"])e.push("Invalid canonical City.");if(city&&parent&&city.stateId!==parent.stateId)e.push("City does not belong to mapped State.");
    if(d.f&&parent?.f&&(d.f<parent.f||(parent.t&&(!d.t||d.t>parent.t))))e.push("City period is outside parent period.");if(cityKeys.has(key))e.push("Duplicate City mapping key.");
    cityKeys.set(key,{stateKey:sk,cityId:cid,partnerId:pid,f:d.f,t:d.t});rows.push(result("CITY",r,tid,key,e,[],{territoryId:tid,stateMappingKey:sk,cityId:cid,partnerId:pid}));}
  const seenPins=new Set<string>();
  for(const r of p.get("COVERAGE")??[]){const e=base(r,defs.COVERAGE),key=r.values["City Franchise Mapping Key"],pin=r.values.Pincode.replace(/\s/g,""),city=cityKeys.get(key),canonical=pins.get(pin);if(!city)e.push("Unknown City mapping key.");if(!/^\d{6}$/.test(pin)||!canonical)e.push("Invalid canonical pincode.");if(city&&canonical&&(canonical.cityId!==city.cityId||canonical.stateId!==stateKeys.get(city.stateKey)?.stateId))e.push("Pincode geography mismatch.");const dk=key+":"+pin;if(seenPins.has(dk))e.push("Duplicate City pincode.");seenPins.add(dk);coverage.set(key,[...(coverage.get(key)??[]),r]);rows.push(result("COVERAGE",r,pin,key,e,[],{cityMappingKey:key,pincodeId:canonical?.id??""}));}
  for(const [key,city] of cityKeys){const own=coverage.get(key)??[];if(!own.length)mark(rows,"CITY",key,"City requires pincode coverage.");for(const [ok,other] of cityKeys){if(ok===key||!city.f||!other.f||!overlap(city.f,city.t,other.f,other.t))continue;const op=new Set((coverage.get(ok)??[]).map(x=>x.values.Pincode));if(own.some(x=>op.has(x.values.Pincode)))mark(rows,"CITY",key,"City coverage overlap.");}const ownIds=new Set(own.map(x=>pins.get(x.values.Pincode)?.id).filter((id):id is string=>Boolean(id)));for(const existing of refs.existingCityFranchises??[]){if(!city.f||!overlap(city.f,city.t,existing.effectiveFrom,existing.effectiveTo))continue;if(existing.pincodeIds.some(id=>ownIds.has(id)))mark(rows,"CITY",key,"City coverage overlap.");}}
  const statePins=new Map<string,Set<string>>();for(const [ck,items] of coverage){const sk=cityKeys.get(ck)?.stateKey;if(sk){const set=statePins.get(sk)??new Set<string>();items.forEach(x=>set.add(x.values.Pincode));statePins.set(sk,set);}}
  for(const [key,state] of stateKeys){const ownPins=statePins.get(key)??new Set<string>();if(state.mode==="PINCODE_SET"&&!ownPins.size)mark(rows,"STATE",key,"PINCODE_SET requires coverage.");for(const [otherKey,other] of stateKeys){if(otherKey===key||!state.f||!other.f||state.stateId!==other.stateId||!overlap(state.f,state.t,other.f,other.t))continue;const otherPins=statePins.get(otherKey)??new Set<string>();if(state.mode==="WHOLE_STATE"||other.mode==="WHOLE_STATE"||[...ownPins].some(pin=>otherPins.has(pin)))mark(rows,"STATE",key,"State coverage overlap.");}for(const x of refs.existingStateFranchises??[]){if(!state.f||x.stateId!==state.stateId||!overlap(state.f,state.t,x.effectiveFrom,x.effectiveTo))continue;const ids=new Set([...ownPins].map(v=>pins.get(v)?.id));if(state.mode==="WHOLE_STATE"||x.coverageMode==="WHOLE_STATE"||x.pincodeIds.some(id=>ids.has(id)))mark(rows,"STATE",key,"State coverage overlap.");}}
  const seenOutlets=new Set<string>();
  for(const r of p.get("OUTLET")??[]){const e=base(r,defs.OUTLET),oid=r.values["Outlet Profile ID"],bid=r.values["Branch ID"],key=r.values["City Franchise Mapping Key"],d=dates(r,e),outlet=outlets.get(oid),branch=branches.get(bid),city=cityKeys.get(key);if(!uuid.test(oid)||!outlet)e.push("Unknown Outlet.");else if(outlet.tenantId!==refs.tenantId)e.push("Cross-tenant Outlet.");if(!uuid.test(bid)||!branch)e.push("Unknown Branch.");else if(branch.tenantId!==refs.tenantId)e.push("Cross-tenant Branch.");if(outlet&&outlet.branchId!==bid)e.push("Outlet/Branch mismatch.");if(!city)e.push("Unknown City mapping key.");if(d.f&&city?.f&&(d.f<city.f||(city.t&&(!d.t||d.t>city.t))))e.push("Outlet period is outside City period.");if(seenOutlets.has(oid))e.push("Duplicate Outlet mapping.");seenOutlets.add(oid);if(d.f&&(refs.existingOutletAssignments??[]).some(x=>x.outletProfileId===oid&&overlap(d.f as Date,d.t,x.effectiveFrom,x.effectiveTo)))e.push("Outlet assignment overlap.");rows.push(result("OUTLET",r,oid,key,e,[],{outletProfileId:oid,branchId:bid,cityMappingKey:key}));}
  for(const r of p.get("AGREEMENT")??[]){const e=base(r,defs.AGREEMENT),warnings:string[]=[],aid=r.values["Agreement ID"],level=r.values["Proposed Level"].toUpperCase(),key=r.values["Proposed Target Mapping Key"],d=dates(r,e),agreement=agreements.get(aid);let c:MappingRowResult["agreementClassification"]="DETERMINISTIC";if(!uuid.test(aid)||!agreement){e.push("Unknown Agreement.");c="UNMAPPABLE";}else if(agreement.tenantId!==refs.tenantId){e.push("Cross-tenant Agreement.");c="UNMAPPABLE";}if(!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(r.values["Purpose Code"]))e.push("Invalid purpose code.");if(!["STATE","CITY","OUTLET"].includes(level)){e.push("Invalid proposed level.");c="UNMAPPABLE";}const st=stateKeys.get(key),ct=cityKeys.get(key),ot=outlets.get(key),count=Number(!!st)+Number(!!ct)+Number(!!ot);if(count!==1||(level==="STATE"&&!st)||(level==="CITY"&&!ct)||(level==="OUTLET"&&!ot)){warnings.push("Target is not uniquely supported.");c=count>1?"AMBIGUOUS":"BUSINESS REVIEW REQUIRED";}const tp=st?.partnerId??ct?.partnerId??ot?.partnerId;if(agreement&&tp&&agreement.partnerId!==tp){warnings.push("Partner evidence conflicts.");c="AMBIGUOUS";}if(agreement&&d.f&&(d.f<agreement.startDate||(agreement.endDate&&(!d.t||d.t>agreement.endDate)))){warnings.push("Period differs from Agreement.");c="BUSINESS REVIEW REQUIRED";}rows.push(result("AGREEMENT",r,aid,key,e,warnings,{agreementId:aid,proposedLevel:level,targetMappingKey:key},c));}
  const invalid=rows.filter(x=>x.status==="ERROR").length,ambiguous=rows.filter(x=>x.status==="AMBIGUOUS").length,mapped=rows.filter(x=>x.status==="VALID"||x.status==="WARNING").length,unmapped=refs.outletProfiles.filter(x=>x.isActive&&!seenOutlets.has(x.id)).length,hErrors=rows.filter(x=>x.mappingType!=="AGREEMENT"&&x.status==="ERROR").length,aErrors=rows.filter(x=>x.mappingType==="AGREEMENT"&&x.status!=="VALID").length;
  return{templateVersion:1,rows,mutationCount:0,reconciliation:{legacy:{territories:refs.territories.length,partners:refs.partners.length,agreements:refs.agreements.length,agreementOutlets:refs.agreementOutlets.length,outletProfiles:refs.outletProfiles.length,branches:refs.branches.length},proposed:{stateFranchises:(p.get("STATE")??[]).length,cityFranchises:(p.get("CITY")??[]).length,areas:new Set((p.get("COVERAGE")??[]).map(x=>x.values["City Franchise Mapping Key"]+":"+x.values["Area Name"].toLowerCase())).size,pincodes:(p.get("COVERAGE")??[]).length,outletAssignments:(p.get("OUTLET")??[]).length,agreementClassifications:(p.get("AGREEMENT")??[]).length},results:{mapped,unmapped,ambiguous,invalid},gates:{hierarchyBlocking:[...(unmapped?[String(unmapped)+" active Outlet(s) unmapped."]:[]),...(hErrors?[String(hErrors)+" invalid hierarchy row(s)."]:[])],agreementMigrationBlocking:aErrors?[String(aErrors)+" unresolved Agreement classification(s)."]:[]},financialReferenceCounts:refs.financialReferenceCounts??{invoices:0,settlements:0,payments:0}}};
}
export async function createHierarchyReconciliationWorkbook(p:HierarchyMappingPreview):Promise<Uint8Array>{const w=new ExcelJS.Workbook(),s=w.addWorksheet("Reconciliation");s.columns=[{header:"Category",key:"category"},{header:"Metric",key:"metric"},{header:"Count",key:"count"}];for(const [k,v] of Object.entries(p.reconciliation.legacy))s.addRow({category:"Legacy",metric:safeSpreadsheetText(k),count:v});for(const [k,v] of Object.entries(p.reconciliation.proposed))s.addRow({category:"Proposed",metric:safeSpreadsheetText(k),count:v});for(const [k,v] of Object.entries(p.reconciliation.results))s.addRow({category:"Result",metric:safeSpreadsheetText(k),count:v});style(s);const r=w.addWorksheet("Row Results");r.addRow(["Row","Type","Status","Source","Target","Errors","Warnings","Classification"]);for(const x of p.rows)r.addRow([x.rowNumber,x.mappingType,x.status,safeSpreadsheetText(x.sourceId),safeSpreadsheetText(x.targetKey),safeSpreadsheetText(x.errors.join(" | ")),safeSpreadsheetText(x.warnings.join(" | ")),x.agreementClassification??""]);style(r);return new Uint8Array(await w.xlsx.writeBuffer());}
export function createHierarchyReconciliationPdf(p:HierarchyMappingPreview,at=new Date()):Promise<Uint8Array>{return new Promise((resolve,reject)=>{const d=new PDFDocument({size:"A4",margin:42,info:{Title:"X Nail Hierarchy Mapping Dry Run",Author:"X Nail"}}),chunks:Buffer[]=[];d.on("data",(c:Buffer)=>chunks.push(c));d.on("error",reject);d.on("end",()=>resolve(new Uint8Array(Buffer.concat(chunks))));d.fontSize(17).text("X Nail hierarchy mapping dry run");d.fontSize(8).text("Generated "+at.toISOString()+" | Preview only | Mutations 0");for(const [title,values] of [["Legacy",p.reconciliation.legacy],["Proposed",p.reconciliation.proposed],["Results",p.reconciliation.results]] as const){d.moveDown().fontSize(11).text(title);for(const [k,v] of Object.entries(values))d.fontSize(9).text(safeSpreadsheetText(k)+": "+v);}d.moveDown().text("Hierarchy blockers: "+(p.reconciliation.gates.hierarchyBlocking.join(" | ")||"none"));d.text("Agreement blockers: "+(p.reconciliation.gates.agreementMigrationBlocking.join(" | ")||"none"));d.end();});}
