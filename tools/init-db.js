import { neon } from '@neondatabase/serverless';
import { randomBytes, scryptSync } from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Erro: Defina DATABASE_URL no ambiente ou execute com: node --env-file=.env tools/init-db.js');
  process.exit(1);
}

function hashSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const dk = scryptSync(senha, salt, 32).toString('hex');
  return `${salt}:${dk}`;
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log('Conectando ao Neon PostgreSQL...');

  // 1. Cria schema
  await sql`CREATE SCHEMA IF NOT EXISTS mpro;`;
  console.log('✓ Schema mpro garantido');

  // 2. Cria tipos enum se não existirem
  await sql`
    DO $$ BEGIN
      CREATE TYPE mpro.visita_status AS ENUM ('rascunho', 'finalizado');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE mpro.situacao_indicador AS ENUM ('adequado', 'monitorar', 'corrigir');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE mpro.evidencia_tipo AS ENUM ('foto', 'video', 'audio');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;
  await sql`
    DO $$ BEGIN
      CREATE TYPE mpro.equipamento_status AS ENUM ('adequado', 'monitorar', 'manutencao');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;
  await sql`
    DO $$ BEGIN
      ALTER TYPE mpro.usuario_papel ADD VALUE IF NOT EXISTS 'admin';
    EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL; END $$;
  `;

  // 3. Cria tabela de usuários
  await sql`
    CREATE TABLE IF NOT EXISTS mpro.usuarios (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome         text NOT NULL,
      email        text NOT NULL UNIQUE,
      empresa      text,
      cargo        text,
      senha_hash   text,
      papel        text NOT NULL DEFAULT 'tecnico',
      status       text NOT NULL DEFAULT 'pendente',
      criado_em    timestamptz NOT NULL DEFAULT now(),
      aprovado_em  timestamptz,
      aprovado_por text
    );
  `;
  // Garante tipo text e novas colunas
  await sql`ALTER TABLE mpro.usuarios ALTER COLUMN papel TYPE text;`;
  await sql`ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';`;
  await sql`ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;`;
  await sql`ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS aprovado_por text;`;
  console.log('✓ Tabela mpro.usuarios configurada com suporte a admin');

  // 4. Cria tabelas do sistema
  await sql`
    CREATE TABLE IF NOT EXISTS mpro.clientes (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome              text NOT NULL,
      documento         text,
      contato_email     text,
      contato_telefone  text,
      owner             text,
      criado_em         timestamptz NOT NULL DEFAULT now()
    );
  `;

  await sql`
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
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mpro.visitas (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id      uuid NOT NULL REFERENCES mpro.clientes(id) ON DELETE CASCADE,
      propriedade_id  uuid REFERENCES mpro.propriedades(id) ON DELETE SET NULL,
      unidade_id      uuid,
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
      owner           text,
      criado_em       timestamptz NOT NULL DEFAULT now(),
      atualizado_em   timestamptz NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mpro.equipamentos (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id         uuid REFERENCES mpro.clientes(id) ON DELETE CASCADE,
      nome               text NOT NULL,
      tipo               text,
      status             mpro.equipamento_status NOT NULL DEFAULT 'adequado',
      ultima_manutencao  date,
      proxima_manutencao date,
      owner              text,
      criado_em          timestamptz NOT NULL DEFAULT now()
    );
  `;
  console.log('✓ Tabelas principais criadas/garantidas');

  // 5. Inserir ou atualizar a conta de Thyago como Admin
  const emailAdmin = 'thyago10a2007@gmail.com';
  const nomeAdmin = 'Thyago';
  const senhaHash = hashSenha('Thyago13');

  const existente = await sql`SELECT id, email, papel FROM mpro.usuarios WHERE email = ${emailAdmin};`;

  if (existente.length > 0) {
    await sql`
      UPDATE mpro.usuarios 
      SET nome = ${nomeAdmin},
          senha_hash = ${senhaHash},
          papel = 'admin',
          cargo = 'Administrador',
          empresa = 'M-PRO',
          status = 'aprovado',
          aprovado_em = now()
      WHERE email = ${emailAdmin};
    `;
    console.log(`✓ Conta ${emailAdmin} ATUALIZADA com sucesso como ADMIN.`);
  } else {
    await sql`
      INSERT INTO mpro.usuarios (nome, email, senha_hash, papel, cargo, empresa, status, aprovado_em)
      VALUES (${nomeAdmin}, ${emailAdmin}, ${senhaHash}, 'admin', 'Administrador', 'M-PRO', 'aprovado', now());
    `;
    console.log(`✓ Conta ${emailAdmin} CRIADA com sucesso como ADMIN.`);
  }

  // Mostra os usuários cadastrados
  const todos = await sql`SELECT id, nome, email, papel, cargo, status, criado_em FROM mpro.usuarios;`;
  console.log('\nUsuários no banco:');
  console.table(todos);
}

main().catch(err => {
  console.error('Erro na inicialização do banco:', err);
  process.exit(1);
});
