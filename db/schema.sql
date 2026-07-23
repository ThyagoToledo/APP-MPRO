-- M-PRO — schema do banco (PostgreSQL / Neon)
-- Idempotente: pode ser reaplicado sem erro.
-- Modelo derivado dos requisitos em mpro-app-visao-requisitos (cliente > propriedade >
-- unidade produtiva > cultura; visita técnica; evidências; transcrição; relatório; equipamentos).

CREATE SCHEMA IF NOT EXISTS mpro;
SET search_path TO mpro, public;

-- ---------- Tipos ----------
DO $$ BEGIN
  CREATE TYPE mpro.visita_status AS ENUM ('rascunho', 'finalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mpro.situacao_indicador AS ENUM ('adequado', 'monitorar', 'corrigir');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mpro.evidencia_tipo AS ENUM ('foto', 'video', 'audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mpro.equipamento_status AS ENUM ('adequado', 'monitorar', 'manutencao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mpro.usuario_papel AS ENUM ('tecnico', 'gestor', 'cliente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Núcleo de cadastro ----------
CREATE TABLE IF NOT EXISTS mpro.usuarios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  email        text NOT NULL UNIQUE,
  empresa      text,
  cargo        text,
  senha_hash   text,
  papel        mpro.usuario_papel NOT NULL DEFAULT 'tecnico',
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mpro.clientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              text NOT NULL,
  documento         text,
  contato_email     text,
  contato_telefone  text,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mpro.propriedades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES mpro.clientes(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  municipio   text,
  uf          char(2),
  latitude    numeric(9,6),
  longitude   numeric(9,6),
  area_ha     numeric(10,2),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mpro.unidades_produtivas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propriedade_id  uuid NOT NULL REFERENCES mpro.propriedades(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  tipo            text, -- estufa, talhao, canteiro, ...
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- Cultura associada a uma unidade por período (RF-03: não assumir cultura fixa).
CREATE TABLE IF NOT EXISTS mpro.culturas_unidade (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id   uuid NOT NULL REFERENCES mpro.unidades_produtivas(id) ON DELETE CASCADE,
  cultura      text NOT NULL,
  data_inicio  date,
  data_fim     date
);

-- ---------- Visita técnica ----------
CREATE TABLE IF NOT EXISTS mpro.visitas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES mpro.clientes(id) ON DELETE CASCADE,
  propriedade_id  uuid REFERENCES mpro.propriedades(id) ON DELETE SET NULL,
  unidade_id      uuid REFERENCES mpro.unidades_produtivas(id) ON DELETE SET NULL,
  tecnico_id      uuid REFERENCES mpro.usuarios(id) ON DELETE SET NULL,
  cultura         text,
  data_visita     date NOT NULL DEFAULT current_date,
  responsavel     text,
  condicao_geral  text,
  irrigacao       text,
  nutricao        text,
  sanidade        text,
  solo_raiz       text,
  recomendacoes   text,
  conclusao       text,
  situacao        mpro.situacao_indicador,
  status          mpro.visita_status NOT NULL DEFAULT 'rascunho',
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- Medições pontuais da visita (RF-08: valor + unidade + contexto, ex.: 1,5 bar).
CREATE TABLE IF NOT EXISTS mpro.medicoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id  uuid NOT NULL REFERENCES mpro.visitas(id) ON DELETE CASCADE,
  rotulo     text NOT NULL,
  valor      numeric,
  unidade    text,
  contexto   text
);

-- ---------- Evidências e transcrição ----------
-- Fotos, vídeos e áudios fixados à visita de origem (título, legenda, ordem, data).
CREATE TABLE IF NOT EXISTS mpro.evidencias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id    uuid NOT NULL REFERENCES mpro.visitas(id) ON DELETE CASCADE,
  tipo         mpro.evidencia_tipo NOT NULL,
  url          text,
  titulo       text,
  legenda      text,
  ordem        int NOT NULL DEFAULT 0,
  duracao_seg  int,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mpro.transcricoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidencia_id  uuid NOT NULL REFERENCES mpro.evidencias(id) ON DELETE CASCADE,
  texto         text,
  estruturado   jsonb,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- ---------- Relatório imutável ----------
CREATE TABLE IF NOT EXISTS mpro.relatorios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id   uuid NOT NULL REFERENCES mpro.visitas(id) ON DELETE CASCADE,
  cliente_id  uuid NOT NULL REFERENCES mpro.clientes(id) ON DELETE CASCADE,
  versao      int NOT NULL DEFAULT 1,
  pdf_url     text,
  gerado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visita_id, versao)
);

-- ---------- Equipamentos ----------
CREATE TABLE IF NOT EXISTS mpro.equipamentos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  propriedade_id     uuid REFERENCES mpro.propriedades(id) ON DELETE SET NULL,
  cliente_id         uuid REFERENCES mpro.clientes(id) ON DELETE CASCADE,
  nome               text NOT NULL,
  tipo               text, -- sensor, bomba, ...
  status             mpro.equipamento_status NOT NULL DEFAULT 'adequado',
  ultima_manutencao  date,
  proxima_manutencao date,
  criado_em          timestamptz NOT NULL DEFAULT now()
);

-- ---------- Assistente IA (log com rastreabilidade) ----------
CREATE TABLE IF NOT EXISTS mpro.consultas_ia (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid REFERENCES mpro.usuarios(id) ON DELETE SET NULL,
  cliente_id   uuid REFERENCES mpro.clientes(id) ON DELETE SET NULL,
  pergunta     text NOT NULL,
  resposta     text,
  referencias  jsonb, -- ids das visitas/relatórios usados na resposta
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- ---------- Índices ----------
CREATE INDEX IF NOT EXISTS idx_propriedades_cliente   ON mpro.propriedades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_unidades_propriedade    ON mpro.unidades_produtivas(propriedade_id);
CREATE INDEX IF NOT EXISTS idx_culturas_unidade        ON mpro.culturas_unidade(unidade_id);
CREATE INDEX IF NOT EXISTS idx_visitas_cliente_data    ON mpro.visitas(cliente_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_visitas_unidade         ON mpro.visitas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_visita         ON mpro.medicoes(visita_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_visita       ON mpro.evidencias(visita_id);
CREATE INDEX IF NOT EXISTS idx_transcricoes_evidencia  ON mpro.transcricoes(evidencia_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_cliente      ON mpro.relatorios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_cliente    ON mpro.equipamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_cliente       ON mpro.consultas_ia(cliente_id);

-- ---------- Trigger: atualizado_em em visitas ----------
CREATE OR REPLACE FUNCTION mpro.set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visitas_atualizado_em ON mpro.visitas;
CREATE TRIGGER trg_visitas_atualizado_em
  BEFORE UPDATE ON mpro.visitas
  FOR EACH ROW EXECUTE FUNCTION mpro.set_atualizado_em();
