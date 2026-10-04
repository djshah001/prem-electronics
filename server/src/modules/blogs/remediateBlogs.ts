import { asc, eq, sql } from 'drizzle-orm';
import { db, pool } from '../../infrastructure/database/db.js';
import { blogContentRevisions, blogs } from '../../infrastructure/database/schema/index.js';
import { isAllowedBlogImageSource, sanitizeBlogHtml } from './blogSanitizer.js';

const apply = process.env.BLOG_REMEDIATE_APPLY === 'true';
const rows = await db.select().from(blogs).orderBy(asc(blogs.id));
let changed = 0;

for (const row of rows) {
  const content = sanitizeBlogHtml(row.content);
  const imageUrl = isAllowedBlogImageSource(row.imageUrl) ? row.imageUrl : null;
  if (content === row.content && imageUrl === row.imageUrl) continue;
  changed += 1;
  console.log(`[${apply ? 'APPLY' : 'DRY RUN'}] ${row.id} ${row.slug}`);
  if (!apply) continue;
  await db.transaction(async (tx) => {
    await tx.insert(blogContentRevisions).values({
      blogId: row.id,
      content: row.content,
      version: row.version,
      reason: 'sanitization-remediation',
    });
    await tx.update(blogs).set({
      content,
      imageUrl,
      version: sql`${blogs.version} + 1`,
      updatedAt: new Date(),
    }).where(eq(blogs.id, row.id));
  });
}

console.log(`${apply ? 'Updated' : 'Would update'} ${changed} of ${rows.length} blog rows. Original content is preserved in blog_content_revisions when applied.`);
await pool.end();
