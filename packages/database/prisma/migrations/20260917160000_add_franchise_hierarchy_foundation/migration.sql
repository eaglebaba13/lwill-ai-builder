-- CreateEnum
CREATE TYPE "FranchiseAssignmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "FranchiseCoverageMode" AS ENUM ('WHOLE_STATE', 'PINCODE_SET');

-- AlterTable
ALTER TABLE "FranchiseOutletProfile" ADD COLUMN     "assignmentStatus" "FranchiseAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "currentCityFranchiseId" UUID;

-- CreateTable
CREATE TABLE "GeoCountry" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GeoCountry_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "GeoState" (
    "id" UUID NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GeoState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoCity" (
    "id" UUID NOT NULL,
    "stateId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GeoCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoPincode" (
    "id" UUID NOT NULL,
    "stateId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "value" CHAR(6) NOT NULL,

    CONSTRAINT "GeoPincode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateFranchise" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "stateId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "coverageMode" "FranchiseCoverageMode" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "FranchiseAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "conflictApprovedAt" TIMESTAMP(3),
    "conflictApprovedBy" TEXT,
    "conflictApprovalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateFranchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateFranchisePincode" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "stateFranchiseId" UUID NOT NULL,
    "pincodeId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "StateFranchisePincode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityFranchise" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "stateFranchiseId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "areaCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "FranchiseAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "conflictApprovedAt" TIMESTAMP(3),
    "conflictApprovedBy" TEXT,
    "conflictApprovalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityFranchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityFranchiseArea" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cityFranchiseId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,

    CONSTRAINT "CityFranchiseArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityFranchisePincode" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cityFranchiseId" UUID NOT NULL,
    "areaId" UUID,
    "pincodeId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "CityFranchisePincode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchiseOutletAssignment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "outletProfileId" UUID NOT NULL,
    "cityFranchiseId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "FranchiseAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "transferReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseOutletAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoState_countryCode_code_key" ON "GeoState"("countryCode", "code");

-- CreateIndex
CREATE INDEX "GeoCity_stateId_name_idx" ON "GeoCity"("stateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GeoCity_stateId_id_key" ON "GeoCity"("stateId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "GeoCity_stateId_code_key" ON "GeoCity"("stateId", "code");

-- CreateIndex
CREATE INDEX "GeoPincode_cityId_value_idx" ON "GeoPincode"("cityId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "GeoPincode_value_key" ON "GeoPincode"("value");

-- CreateIndex
CREATE INDEX "StateFranchise_tenantId_stateId_status_idx" ON "StateFranchise"("tenantId", "stateId", "status");

-- CreateIndex
CREATE INDEX "StateFranchise_tenantId_partnerId_status_idx" ON "StateFranchise"("tenantId", "partnerId", "status");

-- CreateIndex
CREATE INDEX "StateFranchise_tenantId_effectiveFrom_effectiveTo_idx" ON "StateFranchise"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "StateFranchise_tenantId_id_key" ON "StateFranchise"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StateFranchise_tenantId_code_key" ON "StateFranchise"("tenantId", "code");

-- CreateIndex
CREATE INDEX "StateFranchisePincode_tenantId_pincodeId_effectiveFrom_effe_idx" ON "StateFranchisePincode"("tenantId", "pincodeId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "StateFranchisePincode_tenantId_stateFranchiseId_pincodeId_e_key" ON "StateFranchisePincode"("tenantId", "stateFranchiseId", "pincodeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CityFranchise_tenantId_cityId_status_idx" ON "CityFranchise"("tenantId", "cityId", "status");

-- CreateIndex
CREATE INDEX "CityFranchise_tenantId_stateFranchiseId_status_idx" ON "CityFranchise"("tenantId", "stateFranchiseId", "status");

-- CreateIndex
CREATE INDEX "CityFranchise_tenantId_partnerId_status_idx" ON "CityFranchise"("tenantId", "partnerId", "status");

-- CreateIndex
CREATE INDEX "CityFranchise_tenantId_effectiveFrom_effectiveTo_idx" ON "CityFranchise"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "CityFranchise_tenantId_id_key" ON "CityFranchise"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CityFranchise_tenantId_stateFranchiseId_cityId_areaCode_eff_key" ON "CityFranchise"("tenantId", "stateFranchiseId", "cityId", "areaCode", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "CityFranchiseArea_tenantId_id_key" ON "CityFranchiseArea"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CityFranchiseArea_tenantId_cityFranchiseId_normalizedName_key" ON "CityFranchiseArea"("tenantId", "cityFranchiseId", "normalizedName");

-- CreateIndex
CREATE INDEX "CityFranchisePincode_tenantId_pincodeId_effectiveFrom_effec_idx" ON "CityFranchisePincode"("tenantId", "pincodeId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "CityFranchisePincode_tenantId_cityFranchiseId_pincodeId_eff_key" ON "CityFranchisePincode"("tenantId", "cityFranchiseId", "pincodeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "FranchiseOutletAssignment_tenantId_outletProfileId_effectiv_idx" ON "FranchiseOutletAssignment"("tenantId", "outletProfileId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "FranchiseOutletAssignment_tenantId_cityFranchiseId_status_idx" ON "FranchiseOutletAssignment"("tenantId", "cityFranchiseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseOutletAssignment_tenantId_id_key" ON "FranchiseOutletAssignment"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseOutletAssignment_tenantId_outletProfileId_effectiv_key" ON "FranchiseOutletAssignment"("tenantId", "outletProfileId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "FranchiseOutletProfile_tenantId_currentCityFranchiseId_idx" ON "FranchiseOutletProfile"("tenantId", "currentCityFranchiseId");

-- CreateIndex
CREATE INDEX "FranchiseOutletProfile_tenantId_assignmentStatus_idx" ON "FranchiseOutletProfile"("tenantId", "assignmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseOutletProfile_tenantId_id_key" ON "FranchiseOutletProfile"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "GeoState" ADD CONSTRAINT "GeoState_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "GeoCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoCity" ADD CONSTRAINT "GeoCity_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "GeoState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoPincode" ADD CONSTRAINT "GeoPincode_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "GeoState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoPincode" ADD CONSTRAINT "GeoPincode_stateId_cityId_fkey" FOREIGN KEY ("stateId", "cityId") REFERENCES "GeoCity"("stateId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateFranchise" ADD CONSTRAINT "StateFranchise_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateFranchise" ADD CONSTRAINT "StateFranchise_tenantId_partnerId_fkey" FOREIGN KEY ("tenantId", "partnerId") REFERENCES "FranchisePartner"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateFranchise" ADD CONSTRAINT "StateFranchise_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "GeoState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateFranchisePincode" ADD CONSTRAINT "StateFranchisePincode_tenantId_stateFranchiseId_fkey" FOREIGN KEY ("tenantId", "stateFranchiseId") REFERENCES "StateFranchise"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateFranchisePincode" ADD CONSTRAINT "StateFranchisePincode_pincodeId_fkey" FOREIGN KEY ("pincodeId") REFERENCES "GeoPincode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateFranchisePincode" ADD CONSTRAINT "StateFranchisePincode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchise" ADD CONSTRAINT "CityFranchise_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchise" ADD CONSTRAINT "CityFranchise_tenantId_stateFranchiseId_fkey" FOREIGN KEY ("tenantId", "stateFranchiseId") REFERENCES "StateFranchise"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchise" ADD CONSTRAINT "CityFranchise_tenantId_partnerId_fkey" FOREIGN KEY ("tenantId", "partnerId") REFERENCES "FranchisePartner"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchise" ADD CONSTRAINT "CityFranchise_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "GeoCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchiseArea" ADD CONSTRAINT "CityFranchiseArea_tenantId_cityFranchiseId_fkey" FOREIGN KEY ("tenantId", "cityFranchiseId") REFERENCES "CityFranchise"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchiseArea" ADD CONSTRAINT "CityFranchiseArea_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchisePincode" ADD CONSTRAINT "CityFranchisePincode_tenantId_cityFranchiseId_fkey" FOREIGN KEY ("tenantId", "cityFranchiseId") REFERENCES "CityFranchise"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchisePincode" ADD CONSTRAINT "CityFranchisePincode_tenantId_areaId_fkey" FOREIGN KEY ("tenantId", "areaId") REFERENCES "CityFranchiseArea"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchisePincode" ADD CONSTRAINT "CityFranchisePincode_pincodeId_fkey" FOREIGN KEY ("pincodeId") REFERENCES "GeoPincode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityFranchisePincode" ADD CONSTRAINT "CityFranchisePincode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseOutletAssignment" ADD CONSTRAINT "FranchiseOutletAssignment_tenantId_outletProfileId_fkey" FOREIGN KEY ("tenantId", "outletProfileId") REFERENCES "FranchiseOutletProfile"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseOutletAssignment" ADD CONSTRAINT "FranchiseOutletAssignment_tenantId_cityFranchiseId_fkey" FOREIGN KEY ("tenantId", "cityFranchiseId") REFERENCES "CityFranchise"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseOutletAssignment" ADD CONSTRAINT "FranchiseOutletAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseOutletProfile" ADD CONSTRAINT "FranchiseOutletProfile_tenantId_currentCityFranchiseId_fkey" FOREIGN KEY ("tenantId", "currentCityFranchiseId") REFERENCES "CityFranchise"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Add row-local integrity checks not expressible in the Prisma schema.
ALTER TABLE "GeoPincode"
  ADD CONSTRAINT "GeoPincode_value_format_check"
  CHECK ("value" ~ '^[0-9]{6}$');

ALTER TABLE "StateFranchise"
  ADD CONSTRAINT "StateFranchise_effective_period_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"),
  ADD CONSTRAINT "StateFranchise_conflict_approval_check"
  CHECK (
    ("conflictApprovedAt" IS NULL AND "conflictApprovedBy" IS NULL AND "conflictApprovalReference" IS NULL)
    OR
    ("conflictApprovedAt" IS NOT NULL AND "conflictApprovedBy" IS NOT NULL AND "conflictApprovalReference" IS NOT NULL)
  );

ALTER TABLE "StateFranchisePincode"
  ADD CONSTRAINT "StateFranchisePincode_effective_period_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");

ALTER TABLE "CityFranchise"
  ADD CONSTRAINT "CityFranchise_effective_period_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"),
  ADD CONSTRAINT "CityFranchise_conflict_approval_check"
  CHECK (
    ("conflictApprovedAt" IS NULL AND "conflictApprovedBy" IS NULL AND "conflictApprovalReference" IS NULL)
    OR
    ("conflictApprovedAt" IS NOT NULL AND "conflictApprovedBy" IS NOT NULL AND "conflictApprovalReference" IS NOT NULL)
  );

ALTER TABLE "CityFranchisePincode"
  ADD CONSTRAINT "CityFranchisePincode_effective_period_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");

ALTER TABLE "FranchiseOutletAssignment"
  ADD CONSTRAINT "FranchiseOutletAssignment_effective_period_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");
