import "server-only";
import { createAuthorizationService } from "@lwill/authorization-service/src/authorization-service";
import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";
import { prisma } from "../../../../../packages/database/src/client";
import {
  createFranchiseHierarchyService,
  type CityAreaInput,
  type CityFranchiseInput,
  type CoverageMode,
  type StateFranchiseInput,
} from "../../../../../packages/authentication-context-prisma/src/franchise-hierarchy-service";
import { authorizeFromContext } from "../auth/authorization-boundary";
import { getAuthenticationContext } from "../auth/server-context";
import type {
  HierarchyAuthorization,
  HierarchyRouteServices,
} from "./franchise-hierarchy-route-handlers";

const hierarchy = createFranchiseHierarchyService(prisma);
const authorizationService = createAuthorizationService({ loadPermissionGrants });

async function authorize(permission: string): Promise<HierarchyAuthorization> {
  const context = await getAuthenticationContext();
  if (!context.authenticated) return { outcome: "unauthenticated" };
  if (context.tenantContext === null) return { outcome: "forbidden" };
  const tenantId = context.tenantContext.tenantId;
  const decision = await authorizeFromContext(
    context,
    { permissionCode: permission, scope: { kind: "tenant", tenantId } },
    authorizationService,
  );
  return decision.allowed
    ? { outcome: "authorized", tenantId, userId: context.user.userId }
    : { outcome: "forbidden" };
}

function stateServiceInput(tenantId:string,input:Record<string,unknown>):StateFranchiseInput{
  return{tenantId,partnerId:input.partnerId as string,stateId:input.stateId as string,
    code:input.code as string,displayName:input.displayName as string,
    coverageMode:input.coverageMode as CoverageMode,pincodeIds:input.pincodeIds as readonly string[],
    effectiveFrom:input.effectiveFrom as Date,effectiveTo:input.effectiveTo as Date|null,
    conflictApprovedAt:input.conflictApprovedAt as Date|null,
    conflictApprovedBy:input.conflictApprovedBy as string|null|undefined,
    conflictApprovalReference:input.conflictApprovalReference as string|null|undefined};
}
function cityServiceInput(tenantId:string,input:Record<string,unknown>):CityFranchiseInput{
  return{tenantId,stateFranchiseId:input.stateFranchiseId as string|null,partnerId:input.partnerId as string,
    cityId:input.cityId as string,areaCode:input.areaCode as string,displayName:input.displayName as string,
    areas:input.areas as readonly CityAreaInput[],effectiveFrom:input.effectiveFrom as Date,
    effectiveTo:input.effectiveTo as Date|null,conflictApprovedAt:input.conflictApprovedAt as Date|null,
    conflictApprovedBy:input.conflictApprovedBy as string|null|undefined,
    conflictApprovalReference:input.conflictApprovalReference as string|null|undefined};
}
function withoutTenant<T extends {tenantId:string}>(input:T):Omit<T,"tenantId">{
  const {tenantId:_tenantId,...rest}=input;
  void _tenantId;
  return rest;
}
export function createFranchiseHierarchyRouteServices(): HierarchyRouteServices {
  return {
    authorize,
    listStates: (tenantId) => hierarchy.listStateFranchises({ tenantId }),
    getState: (tenantId, stateFranchiseId) => hierarchy.getStateFranchise({ tenantId, stateFranchiseId }),
    createState: (tenantId, input) => hierarchy.createStateFranchise(stateServiceInput(tenantId,input)),
    updateState: (tenantId, stateFranchiseId, input) =>
      hierarchy.updateDraftStateFranchise({ tenantId, stateFranchiseId, input:withoutTenant(stateServiceInput(tenantId,input)) }),
    activateState: (tenantId, stateFranchiseId) => hierarchy.activateStateFranchise({ tenantId, stateFranchiseId }),
    endState: (tenantId, stateFranchiseId, effectiveTo) =>
      hierarchy.endStateFranchise({ tenantId, stateFranchiseId, effectiveTo }),
    listCities: (tenantId, stateFranchiseId) => hierarchy.listCityFranchises({ tenantId, stateFranchiseId }),
    getCity: (tenantId, cityFranchiseId) => hierarchy.getCityFranchise({ tenantId, cityFranchiseId }),
    createCity: (tenantId, input) => hierarchy.createCityFranchise(cityServiceInput(tenantId,input)),
    updateCity: (tenantId, cityFranchiseId, input) =>
      hierarchy.updateDraftCityFranchise({ tenantId, cityFranchiseId, input:withoutTenant(cityServiceInput(tenantId,input)) }),
    activateCity: (tenantId, cityFranchiseId) => hierarchy.activateCityFranchise({ tenantId, cityFranchiseId }),
    endCity: (tenantId, cityFranchiseId, effectiveTo) =>
      hierarchy.endCityFranchise({ tenantId, cityFranchiseId, effectiveTo }),
    assignOutlet: (tenantId, outletProfileId, input) =>
      hierarchy.assignOutletToCityFranchise({ tenantId,outletProfileId,cityFranchiseId:input.cityFranchiseId as string,effectiveFrom:input.effectiveFrom as Date,effectiveTo:input.effectiveTo as Date|null,transferReference:input.transferReference as string|null }),
    reassignOutlet: (tenantId, outletProfileId, input) =>
      hierarchy.reassignOutletToCityFranchise({ tenantId,outletProfileId,cityFranchiseId:input.cityFranchiseId as string,effectiveFrom:input.effectiveFrom as Date,transferReference:input.transferReference as string|null }),
    getCurrentAssignment: (tenantId, outletProfileId, at) =>
      hierarchy.getCurrentOutletAssignment({ tenantId, outletProfileId, at }),
    listAssignmentHistory: (tenantId, outletProfileId) =>
      hierarchy.listOutletAssignmentHistory({ tenantId, outletProfileId }),
    resolveOutlet: (tenantId, outletProfileId, timestamp) =>
      hierarchy.resolveOutletHierarchyAt({ tenantId, outletProfileId, timestamp }),
  };
}
