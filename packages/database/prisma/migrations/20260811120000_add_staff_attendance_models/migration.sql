-- CreateTable
CREATE TABLE "Staff" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Staff_tenantId_isActive_idx" ON "Staff"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Staff_tenantId_branchId_idx" ON "Staff"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_checkInAt_idx" ON "Attendance"("tenantId", "checkInAt");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_status_idx" ON "Attendance"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_tenantId_id_key" ON "Staff"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_tenantId_id_key" ON "Attendance"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenantId_id_key" ON "Branch"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "Staff"
ADD CONSTRAINT "Staff_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff"
ADD CONSTRAINT "Staff_tenantId_branchId_fkey"
FOREIGN KEY ("tenantId", "branchId") REFERENCES "Branch"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_tenantId_staffId_fkey"
FOREIGN KEY ("tenantId", "staffId") REFERENCES "Staff"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
