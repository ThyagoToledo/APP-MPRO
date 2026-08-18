import { neon } from '@neondatabase/serverless';
import { randomBytes, scryptSync } from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Erro: Defina DATABASE_URL no ambiente ou execute com: node --env-file=.env tools/setup-db.js');
  process.exit(1);
}

function hashSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const dk = scryptSync(senha, salt, 32).toString('hex');
  return `${salt}:${dk}`;
}

const sql = neon(DATABASE_URL);

async function setup() {
  console.log('--- Configurando banco de dados Neon PostgreSQL ---');

  // 1. Schema
  await sql('CREATE SCHEMA IF NOT EXISTS mpro;');
  console.log('1. Schema "mpro" verificado.');

  // 2. Tabela de usuários
  await sql(`
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
  `);
  // Garantir colunas e tipos
  await sql('ALTER TABLE mpro.usuarios ALTER COLUMN papel TYPE text;');
  await sql('ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT \'pendente\';');
  await sql('ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;');
  await sql('ALTER TABLE mpro.usuarios ADD COLUMN IF NOT EXISTS aprovado_por text;');
  console.log('2. Tabela "mpro.usuarios" configurada.');

  // 3. Tabela de clientes
  await sql(`
    CREATE TABLE IF NOT EXISTS mpro.clientes (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome              text NOT NULL,
      documento         text,
      contato_email     text,
      contato_telefone  text,
      endereco          text,
      municipio         text,
      uf                char(2),
      area_total_ha     numeric(10,2),
      owner             text,
      criado_em         timestamptz NOT NULL DEFAULT now(),
      atualizado_em     timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('3. Tabela "mpro.clientes" configurada.');

  // 4. Tabela de propriedades
  await sql(`
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
  `);
  console.log('4. Tabela "mpro.propriedades" configurada.');

  // 5. Tabela de unidades produtivas (talhões / pivôs)
  await sql(`
    CREATE TABLE IF NOT EXISTS mpro.unidades_produtivas (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      propriedade_id  uuid NOT NULL REFERENCES mpro.propriedades(id) ON DELETE CASCADE,
      nome            text NOT NULL,
      area_ha         numeric(10,2),
      solo_tipo       text,
      criado_em       timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('5. Tabela "mpro.unidades_produtivas" configurada.');

  // 6. Tabela de visitas
  await sql(`
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
      situacao        text DEFAULT 'adequado',
      status          text NOT NULL DEFAULT 'rascunho',
      owner           text,
      criado_em       timestamptz NOT NULL DEFAULT now(),
      atualizado_em   timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('6. Tabela "mpro.visitas" configurada.');

  // 7. Tabela de evidências / fotos
  await sql(`
    CREATE TABLE IF NOT EXISTS mpro.evidencias (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      visita_id  uuid NOT NULL REFERENCES mpro.visitas(id) ON DELETE CASCADE,
      tipo       text NOT NULL DEFAULT 'foto',
      url        text,
      data_url   text,
      legenda    text,
      latitude   numeric(9,6),
      longitude  numeric(9,6),
      criado_em  timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('7. Tabela "mpro.evidencias" configurada.');

  // 8. Tabela de equipamentos
  await sql(`
    CREATE TABLE IF NOT EXISTS mpro.equipamentos (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id         uuid REFERENCES mpro.clientes(id) ON DELETE CASCADE,
      nome               text NOT NULL,
      tipo               text,
      status             text NOT NULL DEFAULT 'adequado',
      ultima_manutencao  date,
      proxima_manutencao date,
      owner              text,
      criado_em          timestamptz NOT NULL DEFAULT now()
    );
  `);
  console.log('8. Tabela "mpro.equipamentos" configurada.');

  // 9. Configurar / Garantir a conta de Thyago como Admin Master
  const emailAdmin = 'thyago10a2007@gmail.com';
  const nomeAdmin = 'Thyago';
  const senhaHash = hashSenha('Thyago13');

  const existente = await sql('SELECT id, email, papel, status FROM mpro.usuarios WHERE email = $1', [emailAdmin]);

  if (existente.length > 0) {
    await sql(`
      UPDATE mpro.usuarios 
      SET nome = $1,
          senha_hash = $2,
          papel = 'admin',
          cargo = 'Administrador',
          empresa = 'M-PRO',
          status = 'aprovado',
          aprovado_em = now()
      WHERE email = $3;
    `, [nomeAdmin, senhaHash, emailAdmin]);
    console.log(`✓ Administrador principal (${emailAdmin}) ATUALIZADO com sucesso!`);
  } else {
    await sql(`
      INSERT INTO mpro.usuarios (nome, email, senha_hash, papel, cargo, empresa, status, aprovado_em)
      VALUES ($1, $2, $3, 'admin', 'Administrador', 'M-PRO', 'aprovado', now());
    `, [nomeAdmin, emailAdmin, senhaHash]);
    console.log(`✓ Administrador principal (${emailAdmin}) CRIADO com sucesso!`);
  }

  // 10. Listar todos os usuários no banco
  const usuarios = await sql('SELECT id, nome, email, papel, cargo, status, criado_em FROM mpro.usuarios ORDER BY criado_em DESC;');
  console.log('\n--- Usuários Atuais no Banco Neon ---');
  console.table(usuarios);
}

setup().catch(err => {
  console.error('Erro na configuração do banco:', err);
  process.exit(1);
});
