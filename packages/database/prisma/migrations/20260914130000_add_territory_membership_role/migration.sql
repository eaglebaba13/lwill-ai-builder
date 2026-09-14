-- CreateTable
CREATE TABLE "TerritoryMembershipRole" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "territoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryMembershipRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryMembershipRole_tenantId_membershipId_roleId_territ_key" ON "TerritoryMembershipRole"("tenantId", "membershipId", "roleId", "territoryId");

-- CreateIndex
CREATE INDEX "TerritoryMembershipRole_tenantId_membershipId_idx" ON "TerritoryMembershipRole"("tenantId", "membershipId");

-- CreateIndex
CREATE INDEX "TerritoryMembershipRole_tenantId_territoryId_idx" ON "TerritoryMembershipRole"("tenantId", "territoryId");

-- AddForeignKey
ALTER TABLE "TerritoryMembershipRole" ADD CONSTRAINT "TerritoryMembershipRole_tenantId_membershipId_fkey" FOREIGN KEY ("tenantId", "membershipId") REFERENCES "TenantMembership"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryMembershipRole" ADD CONSTRAINT "TerritoryMembershipRole_tenantId_roleId_fkey" FOREIGN KEY ("tenantId", "roleId") REFERENCES "Role"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryMembershipRole" ADD CONSTRAINT "TerritoryMembershipRole_tenantId_territoryId_fkey" FOREIGN KEY ("tenantId", "territoryId") REFERENCES "Territory"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
