import { sql } from '../api/_db.js';
await sql`CREATE SCHEMA IF NOT EXISTS mpro`;
await sql`CREATE TABLE IF NOT EXISTS mpro.usuarios (
  id bigserial PRIMARY KEY, nome text NOT NULL, email text UNIQUE NOT NULL,
  empresa text NOT NULL DEFAULT 'M-PRO', cargo text NOT NULL DEFAULT 'Técnico de campo',
  senha_hash text NOT NULL, papel text NOT NULL DEFAULT 'tecnico', status text NOT NULL DEFAULT 'pendente',
  aprovado_em timestamptz, aprovado_por text, criado_em timestamptz NOT NULL DEFAULT now()
)`;
await sql`CREATE TABLE IF NOT EXISTS mpro.registros (
  usuario_id text NOT NULL, colecao text NOT NULL, item_id text NOT NULL, dados jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(), removido boolean NOT NULL DEFAULT false,
  PRIMARY KEY (usuario_id, colecao, item_id)
)`;
await sql`ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS aprovado_em timestamptz`;
await sql`ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS aprovado_por text`;
console.log('Tabelas de contas e sincronização verificadas. Nenhuma conta padrão criada.');
await sql`CREATE TABLE IF NOT EXISTS mpro.feedback (
  id bigserial PRIMARY KEY, usuario_id text NOT NULL, motivo text NOT NULL, resposta text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
)`;
