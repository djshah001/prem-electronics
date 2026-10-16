import path from 'path';
import { fileURLToPath } from 'url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

// Resolves to <server>/uploads from both src/core/utils and dist/core/utils.
export const serverUploadRoot = path.resolve(moduleDirectory, '../../../uploads');
export const bannerUploadDirectory = path.join(serverUploadRoot, 'banners');
