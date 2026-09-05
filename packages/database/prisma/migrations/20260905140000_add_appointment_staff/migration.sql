-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "staffId" UUID;

-- CreateIndex
CREATE INDEX "Appointment_tenantId_staffId_idx" ON "Appointment"("tenantId", "staffId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_staffId_fkey" FOREIGN KEY ("tenantId", "staffId") REFERENCES "Staff"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
