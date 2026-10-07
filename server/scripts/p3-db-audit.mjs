import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows: [counts] } = await pool.query(`
    select
      (select count(*)::int from invoice_templates) as invoice_templates,
      (select count(*)::int from invoice_template_versions) as invoice_versions,
      (select count(*)::int from issued_invoices) as issued_invoices,
      (select count(*)::int from issued_invoices where is_legacy) as legacy_invoices,
      (select count(*)::int from email_templates) as email_templates,
      (select count(*)::int from email_template_versions) as email_versions,
      (select count(*)::int from campaigns) as campaigns,
      (select count(*)::int from marketing_preferences where opted_in) as opted_in,
      (select count(*)::int from blogs where editor_json is not null) as structured_blogs
  `);
  const { rows: duplicateVersions } = await pool.query(`
    select template_id, version, count(*)::int as duplicates
    from email_template_versions group by template_id, version having count(*) > 1
    union all
    select template_id, version, count(*)::int as duplicates
    from invoice_template_versions group by template_id, version having count(*) > 1
  `);
  const { rows: issued } = await pool.query(`select invoice_number, octet_length(pdf_bytes)::int as bytes, page_count, is_legacy, template_version_id from issued_invoices order by invoice_number`);
  if (duplicateVersions.length) throw new Error('Duplicate immutable version numbers detected.');
  if (issued.some((invoice) => invoice.bytes < 1_000 || invoice.page_count < 1)) throw new Error('Invalid issued PDF artifact detected.');
  console.log(JSON.stringify({ counts, duplicateVersions: duplicateVersions.length, issued }, null, 2));
} finally {
  await pool.end();
}
