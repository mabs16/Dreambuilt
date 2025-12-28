-- TAGS
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#000000',
    category TEXT, -- 'ORIGIN', 'STATUS', 'PROFILE', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD_TAGS (Many-to-Many)
CREATE TABLE lead_tags (
    lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (lead_id, tag_id)
);

-- FLOWS
CREATE TABLE flows (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_keywords TEXT[], -- Array of keywords that trigger this flow
    graph_data JSONB DEFAULT '{}', -- The visual node structure (React Flow)
    nodes_config JSONB DEFAULT '{}', -- Detailed execution config for nodes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FLOW_SESSIONS
CREATE TABLE flow_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id BIGINT REFERENCES leads(id) NOT NULL,
    flow_id INTEGER REFERENCES flows(id) NOT NULL,
    current_node_id TEXT NOT NULL, -- The ID of the node in the visual graph
    variables JSONB DEFAULT '{}', -- Collected data
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'PAUSED'
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update Leads table for Metadata
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Indexes
CREATE INDEX idx_flow_sessions_active ON flow_sessions(lead_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_flow_keywords ON flows USING GIN(trigger_keywords);
