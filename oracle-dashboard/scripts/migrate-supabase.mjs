/**
 * Oracle Brain — Supabase Schema Migration
 * รัน: node scripts/migrate-supabase.mjs [db_password]
 * หรือ: DB_PASS=xxx node scripts/migrate-supabase.mjs
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { createWriteStream } from "node:fs";
import https from "node:https";

const require = createRequire(import.meta.url);

const PROJ = "alqosvxszammxedqefec";
const pass = process.argv[2] || process.env.DB_PASS || "";
if (!pass) {
  console.error("Usage: node scripts/migrate-supabase.mjs <db_password>");
  console.error("   or: DB_PASS=xxx node scripts/migrate-supabase.mjs");
  process.exit(1);
}

// Try common Supabase regions
const hosts = [
  `db.${PROJ}.supabase.co`,
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `aws-0-us-west-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-eu-central-1.pooler.supabase.com`,
];

const SQL = `
-- Oracle Dashboard — Supabase Schema

create table if not exists oracle_messages (
  id              bigint generated always as identity primary key,
  agent_key       text        not null,
  task_id         text        not null default 'main',
  role            text        not null check (role in ('user','assistant')),
  content         text        not null,
  input_tokens    int,
  output_tokens   int,
  source          text        not null default 'pc',
  created_at      timestamptz not null default now()
);

create index if not exists oracle_messages_agent_task
  on oracle_messages (agent_key, task_id, created_at desc);

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

create table if not exists oracle_tasks (
  id          bigint generated always as identity primary key,
  agent_key   text        not null,
  task_id     text        not null,
  title       text        not null,
  status      text        not null default 'active'
                          check (status in ('active','completed','archived')),
  summary     text,
  source      text        not null default 'pc',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (agent_key, task_id)
);

create index if not exists oracle_tasks_agent
  on oracle_tasks (agent_key, status, updated_at desc);

create table if not exists oracle_cache (
  id            bigint generated always as identity primary key,
  agent_key     text        not null,
  q_hash        text        not null,
  question      text        not null,
  answer        text        not null,
  model         text,
  input_tokens  int         default 0,
  hit_count     int         default 0,
  tokens_saved  int         default 0,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  last_hit_at   timestamptz,
  unique (agent_key, q_hash)
);

create index if not exists oracle_cache_agent on oracle_cache (agent_key, hit_count desc);
`;

async function tryPg(host, port, user) {
  return new Promise((resolve, reject) => {
    let pg;
    try { pg = require("pg"); } catch {
      reject(new Error("pg not installed"));
      return;
    }
    const client = new pg.Client({
      host, port, database: "postgres", user, password: pass, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000,
    });
    client.connect()
      .then(() => client.query(SQL))
      .then(() => { console.log(`✓ Schema created via ${host}:${port}`); return client.end(); })
      .then(resolve)
      .catch(reject);
  });
}

async function installPg() {
  console.log("Installing pg (node-postgres)...");
  await promisify(execFile)("npm", ["install", "--no-save", "pg"], { timeout: 60000, windowsHide: true });
  console.log("pg installed.");
}

async function main() {
  try { require("pg"); } catch { await installPg(); }

  for (const host of hosts) {
    for (const [port, user] of [[5432, "postgres"], [6543, `postgres.${PROJ}`]]) {
      try {
        await tryPg(host, port, String(user));
        console.log("✅ Oracle schema migration complete!");
        process.exit(0);
      } catch (e) {
        console.log(`  ✗ ${host}:${port} — ${e.message?.slice(0, 80)}`);
      }
    }
  }
  console.error("\n❌ Could not connect to database. Please check your password or run schema.sql manually in Supabase SQL Editor.");
  process.exit(1);
}

main();
