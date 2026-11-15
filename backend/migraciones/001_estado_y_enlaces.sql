-- Migracion 001: estado de los eventos y campos que ya usa el panel de administracion
-- Se puede ejecutar varias veces sin romper nada (IF NOT EXISTS).
-- Requiere que exista la tabla de "TablaCultGo!.sql".

-- Estado del evento: permite marcar eventos como reprogramados, cancelados o finalizados.
-- La fecha sigue siendo texto 'DD/MM/YYYY' y NO hay ninguna restriccion
-- que impida guardar o editar eventos con fecha pasada.
ALTER TABLE eventos_cultgo
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activo';

ALTER TABLE eventos_cultgo
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Campos opcionales del formulario del panel
ALTER TABLE eventos_cultgo ADD COLUMN IF NOT EXISTS enlace_spotify TEXT;
ALTER TABLE eventos_cultgo ADD COLUMN IF NOT EXISTS enlace_youtube TEXT;
ALTER TABLE eventos_cultgo ADD COLUMN IF NOT EXISTS imagen TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'eventos_cultgo_estado_valido'
    ) THEN
        ALTER TABLE eventos_cultgo
            ADD CONSTRAINT eventos_cultgo_estado_valido
            CHECK (estado IN ('activo', 'reprogramado', 'cancelado', 'finalizado'));
    END IF;
END $$;
