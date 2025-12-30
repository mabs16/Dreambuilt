-- PASO 1: Eliminar las restricciones actuales que impiden borrar asesores
ALTER TABLE assignments DROP CONSTRAINT assignments_advisor_id_fkey;
ALTER TABLE events DROP CONSTRAINT events_advisor_id_fkey;
ALTER TABLE sla_jobs DROP CONSTRAINT sla_jobs_advisor_id_fkey;
ALTER TABLE scores DROP CONSTRAINT scores_advisor_id_fkey;

-- PASO 2: Volver a crearlas con ON DELETE CASCADE
ALTER TABLE assignments 
ADD CONSTRAINT assignments_advisor_id_fkey 
FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE;

ALTER TABLE events 
ADD CONSTRAINT events_advisor_id_fkey 
FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE;

ALTER TABLE sla_jobs 
ADD CONSTRAINT sla_jobs_advisor_id_fkey 
FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE;

ALTER TABLE scores 
ADD CONSTRAINT scores_advisor_id_fkey 
FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE;
