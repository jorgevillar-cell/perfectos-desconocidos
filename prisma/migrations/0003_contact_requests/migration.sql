ALTER TABLE "matches"
ADD COLUMN IF NOT EXISTS "mensajePresentacion" VARCHAR(300),
ADD COLUMN IF NOT EXISTS "estado" TEXT NOT NULL DEFAULT 'solicitud_pendiente',
ADD COLUMN IF NOT EXISTS "tokenAceptar" TEXT,
ADD COLUMN IF NOT EXISTS "fechaSolicitud" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "matches_tokenAceptar_key" ON "matches"("tokenAceptar");
CREATE INDEX IF NOT EXISTS "matches_estado_idx" ON "matches"("estado");
CREATE INDEX IF NOT EXISTS "matches_fechaSolicitud_idx" ON "matches"("fechaSolicitud");