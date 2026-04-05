-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MatchEstado" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "PisoEstado" AS ENUM ('DISPONIBLE', 'RESERVADO', 'OCUPADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "PagoEstado" AS ENUM ('PENDIENTE', 'PAGADO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "IncidenciaEstado" AS ENUM ('ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "IncidenciaPrioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "apellidos" VARCHAR(160),
    "telefono" VARCHAR(30),
    "fecha_nacimiento" DATE,
    "foto_url" TEXT,
    "ciudad" VARCHAR(120),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_convivencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "limpieza_nivel" INTEGER NOT NULL DEFAULT 3,
    "ruido_nivel" INTEGER NOT NULL DEFAULT 3,
    "fumador" BOOLEAN NOT NULL DEFAULT false,
    "acepta_mascotas" BOOLEAN NOT NULL DEFAULT false,
    "horario" VARCHAR(120),
    "invitados_frecuencia" VARCHAR(120),
    "presupuesto_min" DECIMAL(10,2),
    "presupuesto_max" DECIMAL(10,2),
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_convivencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pisos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propietario_id" UUID NOT NULL,
    "titulo" VARCHAR(140) NOT NULL,
    "descripcion" TEXT,
    "direccion" VARCHAR(255) NOT NULL,
    "ciudad" VARCHAR(120) NOT NULL,
    "codigo_postal" VARCHAR(20),
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "precio_mensual" DECIMAL(10,2) NOT NULL,
    "fianza" DECIMAL(10,2),
    "gastos_incluidos" BOOLEAN NOT NULL DEFAULT false,
    "habitaciones_totales" INTEGER NOT NULL DEFAULT 1,
    "banos_totales" INTEGER NOT NULL DEFAULT 1,
    "superficie_m2" DECIMAL(10,2),
    "disponible_desde" DATE,
    "normas" TEXT,
    "estado" "PisoEstado" NOT NULL DEFAULT 'DISPONIBLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "piso_id" UUID NOT NULL,
    "score" DECIMAL(5,2),
    "estado" "MatchEstado" NOT NULL DEFAULT 'PENDIENTE',
    "nota" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "emisor_id" UUID NOT NULL,
    "receptor_id" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "piso_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concepto" VARCHAR(120) NOT NULL,
    "importe" DECIMAL(10,2) NOT NULL,
    "moneda" VARCHAR(10) NOT NULL DEFAULT 'EUR',
    "fecha_vencimiento" DATE NOT NULL,
    "fecha_pago" DATE,
    "estado" "PagoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "metodo_pago" VARCHAR(80),
    "referencia" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "piso_id" UUID NOT NULL,
    "reportada_por_id" UUID NOT NULL,
    "asignada_a_id" UUID,
    "titulo" VARCHAR(180) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "IncidenciaPrioridad" NOT NULL DEFAULT 'MEDIA',
    "estado" "IncidenciaEstado" NOT NULL DEFAULT 'ABIERTA',
    "fecha_resolucion" TIMESTAMP(3),
    "coste_estimado" DECIMAL(10,2),
    "coste_final" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_convivencia_user_id_key" ON "perfil_convivencia"("user_id");

-- CreateIndex
CREATE INDEX "pisos_propietario_id_idx" ON "pisos"("propietario_id");

-- CreateIndex
CREATE INDEX "pisos_ciudad_estado_idx" ON "pisos"("ciudad", "estado");

-- CreateIndex
CREATE INDEX "matches_piso_id_idx" ON "matches"("piso_id");

-- CreateIndex
CREATE INDEX "matches_estado_idx" ON "matches"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "matches_user_id_piso_id_key" ON "matches"("user_id", "piso_id");

-- CreateIndex
CREATE INDEX "mensajes_match_id_created_at_idx" ON "mensajes"("match_id", "created_at");

-- CreateIndex
CREATE INDEX "mensajes_receptor_id_leido_idx" ON "mensajes"("receptor_id", "leido");

-- CreateIndex
CREATE INDEX "pagos_piso_id_idx" ON "pagos"("piso_id");

-- CreateIndex
CREATE INDEX "pagos_user_id_estado_idx" ON "pagos"("user_id", "estado");

-- CreateIndex
CREATE INDEX "pagos_fecha_vencimiento_idx" ON "pagos"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "incidencias_piso_id_estado_idx" ON "incidencias"("piso_id", "estado");

-- CreateIndex
CREATE INDEX "incidencias_reportada_por_id_idx" ON "incidencias"("reportada_por_id");

-- CreateIndex
CREATE INDEX "incidencias_asignada_a_id_idx" ON "incidencias"("asignada_a_id");

-- AddForeignKey
ALTER TABLE "perfil_convivencia" ADD CONSTRAINT "perfil_convivencia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pisos" ADD CONSTRAINT "pisos_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_piso_id_fkey" FOREIGN KEY ("piso_id") REFERENCES "pisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_emisor_id_fkey" FOREIGN KEY ("emisor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_receptor_id_fkey" FOREIGN KEY ("receptor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_piso_id_fkey" FOREIGN KEY ("piso_id") REFERENCES "pisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_piso_id_fkey" FOREIGN KEY ("piso_id") REFERENCES "pisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_reportada_por_id_fkey" FOREIGN KEY ("reportada_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_asignada_a_id_fkey" FOREIGN KEY ("asignada_a_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

