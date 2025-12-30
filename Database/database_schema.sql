-- ENUMS
CREATE TYPE lead_status AS ENUM ('NUEVO', 'PRECALIFICADO', 'ASIGNADO', 'CONTACTADO', 'CITA', 'SEGUIMIENTO', 'CIERRE', 'PERDIDO');
CREATE TYPE assignment_sla_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- TABLES
CREATE TABLE advisors (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    source TEXT NOT NULL,
    status lead_status DEFAULT 'NUEVO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id BIGINT REFERENCES leads(id) NOT NULL,
    advisor_id BIGINT REFERENCES advisors(id) NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    -- Ensure only one active assignment per lead
    CONSTRAINT one_active_assignment_per_lead UNIQUE (lead_id, ended_at)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id BIGINT REFERENCES leads(id) NOT NULL,
    advisor_id BIGINT REFERENCES advisors(id),
    type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sla_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id BIGINT REFERENCES leads(id) NOT NULL,
    advisor_id BIGINT REFERENCES advisors(id) NOT NULL,
    type TEXT DEFAULT 'CONTACT_SLA',
    due_at TIMESTAMPTZ NOT NULL,
    reassignment_count INTEGER DEFAULT 0,
    status assignment_sla_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id BIGINT REFERENCES advisors(id) NOT NULL,
    lead_id BIGINT REFERENCES leads(id) NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_assignments_active ON assignments(lead_id) WHERE ended_at IS NULL;
CREATE INDEX idx_events_lead ON events(lead_id);
CREATE INDEX idx_sla_jobs_pending ON sla_jobs(status) WHERE status = 'PENDING';
