-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "nombreInstitucion" TEXT NOT NULL,
    "sectorInstitucion" TEXT NOT NULL,
    "fechaVisita" TEXT NOT NULL,
    "horarioVisita" TEXT NOT NULL,
    "nroPersonas" INTEGER NOT NULL,
    "rangoEdades" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "encargadoVisita" TEXT NOT NULL,
    "idiomaVisita" TEXT NOT NULL,
    "propositoVisita" TEXT NOT NULL,
    "telefonoContacto" TEXT NOT NULL,
    "correoElectronico" TEXT NOT NULL,
    "requerimientoParticular" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" TEXT NOT NULL,
    "reason" TEXT,
    "slots" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_token_key" ON "Reservation"("token");

-- CreateIndex
CREATE INDEX "Reservation_fechaVisita_idx" ON "Reservation"("fechaVisita");

-- CreateIndex
CREATE INDEX "Reservation_cancelled_idx" ON "Reservation"("cancelled");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_fecha_key" ON "BlockedDate"("fecha");
