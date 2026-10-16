import path from 'path';
import fs from 'fs/promises';
import { and, eq } from 'drizzle-orm';
import { db, pool } from '../../infrastructure/database/db.js';
import { mediaAssets } from '../../infrastructure/database/schema/index.js';
import logger from '../../core/logger/logger.js';
import { serverUploadRoot } from '../../core/utils/uploadPaths.js';

const MAX_PER_RUN = 100;
const MIN_AGE_HOURS = 24;

async function cleanup() {
  const result = await pool.query<{ id: string; storage_key: string }>(`
    SELECT asset.id, asset.storage_key
    FROM media_assets asset
    WHERE asset.kind = 'banner'
      AND asset.created_at < now() - interval '${MIN_AGE_HOURS} hours'
      AND NOT EXISTS (
        SELECT 1 FROM banners banner
        WHERE banner.desktop_asset_id = asset.id OR banner.mobile_asset_id = asset.id
      )
    ORDER BY asset.created_at ASC
    LIMIT $1
  `, [MAX_PER_RUN]);
  const uploadRoot = serverUploadRoot;
  let removed = 0;
  for (const asset of result.rows) {
    const filePath = path.resolve(uploadRoot, asset.storage_key);
    if (!filePath.startsWith(`${uploadRoot}${path.sep}`) || !asset.storage_key.startsWith('banners/')) {
      logger.warn(`Skipped unsafe banner storage key: ${asset.storage_key}`);
      continue;
    }
    await fs.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
    await db.delete(mediaAssets).where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.kind, 'banner')));
    removed += 1;
  }
  logger.info(`Banner asset cleanup removed ${removed} unreferenced asset(s); limit ${MAX_PER_RUN}, minimum age ${MIN_AGE_HOURS}h.`);
  await pool.end();
}

cleanup().catch(async (error) => {
  logger.error('Banner asset cleanup failed.', error);
  await pool.end().catch(() => undefined);
  process.exitCode = 1;
});
