import { sql, send } from './_db.js';

export default async function handler(req, res) {
  try {
    const r = await sql.query(`
      select
        (select count(*) from mpro.clientes)     as clientes,
        (select count(*) from mpro.visitas)       as visitas,
        (select count(*) from mpro.equipamentos)  as equipamentos,
        (select count(*) from mpro.usuarios)      as usuarios
    `);
    return send(res, 200, { ok: true, db: 'neon', counts: r[0] });
  } catch (e) {
    return send(res, 500, { ok: false, error: String(e && e.message || e) });
  }
}
