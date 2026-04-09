ALTER TABLE users
ADD COLUMN IF NOT EXISTS tipo_usuario text NOT NULL DEFAULT 'buscador';

CREATE TABLE IF NOT EXISTS companeros_piso (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pisoId uuid REFERENCES pisos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  edad integer,
  estudiaOTrabaja text,
  horario text,
  fumar text,
  mascotas text,
  ambiente text,
  descripcion text
);

CREATE INDEX IF NOT EXISTS idx_companeros_piso_pisoId ON companeros_piso(pisoId);
