-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" TEXT,
    "rent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "lineId" TEXT,
    "idCard" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenancy" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL DEFAULT '',
    "billingMonth" TEXT NOT NULL,
    "prevElectric" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currElectric" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prevWater" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currWater" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherFeeNote" TEXT NOT NULL DEFAULT '',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "slipRef" TEXT,
    "slipVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "electricRate" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "waterRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "apartmentName" TEXT NOT NULL DEFAULT 'อพาร์ตเมนต์ของฉัน',
    "promptPayId" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");

-- CreateIndex
CREATE INDEX "Tenancy_roomId_idx" ON "Tenancy"("roomId");

-- CreateIndex
CREATE INDEX "Tenancy_tenantId_idx" ON "Tenancy"("tenantId");

-- CreateIndex
CREATE INDEX "BillingRecord_roomId_idx" ON "BillingRecord"("roomId");

-- CreateIndex
CREATE INDEX "BillingRecord_billingMonth_idx" ON "BillingRecord"("billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRecord_roomId_billingMonth_key" ON "BillingRecord"("roomId", "billingMonth");

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
