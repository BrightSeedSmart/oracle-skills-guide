-- Oracle Dashboard — Supabase Schema
-- รัน SQL นี้ใน Supabase Dashboard → SQL Editor

-- ─── 1. Conversation history ─────────────────────────────────────────────────
create table if not exists oracle_messages (
  id              bigint generated always as identity primary key,
  agent_key       text        not null,
  task_id         text        not null default 'main',
  role            text        not null check (role in ('user','assistant')),
  content         text        not null,
  input_tokens    int,
  output_tokens   int,
  source          text        not null default 'pc',  -- 'pc' | 'vps'
  created_at      timestamptz not null default now()
);

create index if not exists oracle_messages_agent_task
  on oracle_messages (agent_key, task_id, created_at desc);
create index if not exists oracle_messages_source
  on oracle_messages (source, created_at desc);

-- ─── 2. Token usage log ───────────────────────────────────────────────────────
create table if not exists oracle_token_log (
  id                      bigint generated always as identity primary key,
  agent_key               text        not null,
  model                   text,
  input_tokens            int         default 0,
  output_tokens           int         default 0,
  cache_creation_tokens   int         default 0,
  cache_read_tokens       int         default 0,
  source                  text        not null default 'pc',
  created_at              timestamptz not null default now()
);

create index if not exists oracle_token_log_agent
  on oracle_token_log (agent_key, created_at desc);
create index if not exists oracle_token_log_source
  on oracle_token_log (source, created_at desc);

-- ─── 3. Task registry ─────────────────────────────────────────────────────────
create table if not exists oracle_tasks (
  id          bigint generated always as identity primary key,
  agent_key   text        not null,
  task_id     text        not null,
  title       text        not null,
  status      text        not null default 'active'
                          check (status in ('active','completed','archived')),
  summary     text,                       -- AI-generated summary (ลด token ในครั้งถัดไป)
  source      text        not null default 'pc',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (agent_key, task_id)
);

create index if not exists oracle_tasks_agent
  on oracle_tasks (agent_key, status, updated_at desc);
create index if not exists oracle_tasks_source
  on oracle_tasks (source, status);

-- ─── 4. Row Level Security (optional — เปิดถ้าต้องการ) ─────────────────────
-- alter table oracle_messages  enable row level security;
-- alter table oracle_token_log enable row level security;
-- alter table oracle_tasks     enable row level security;

-- ─── 5. Realtime (เปิดให้ VPS↔PC sync แบบ realtime) ────────────────────────
alter publication supabase_realtime add table oracle_tasks;
alter publication supabase_realtime add table oracle_messages;
