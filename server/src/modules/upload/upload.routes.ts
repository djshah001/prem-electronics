import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { adminOnly } from '../../core/middlewares/authGuard.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { sendSuccess } from '../../core/utils/responseHandler.js';
import { AppError } from '../../core/errors/appError.js';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 15;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPEG, PNG, WebP and GIF files are allowed.', 400) as any);
    }
  },
});

const isValidImageHeader = async (filePath: string): Promise<boolean> => {
  try {
    const handle = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buf, 0, 12, 0);
    await handle.close();

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
    // GIF: 47 49 46 (GIF87a / GIF89a)
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if (
      bytesRead >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const router = Router();

router.post(
  '/',
  ...adminOnly,
  upload.array('images', 10),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw new AppError('No files uploaded.', 400);

    // Validate magic bytes to prevent spoofed/malformed uploads
    for (const f of files) {
      const valid = await isValidImageHeader(f.path);
      if (!valid) {
        await Promise.allSettled(files.map((file) => fs.unlink(file.path)));
        throw new AppError(`Invalid or corrupted image format detected in ${f.originalname}.`, 400);
      }
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = files.map((f) => `${baseUrl}/uploads/${f.filename}`);
    sendSuccess(res, { urls }, 'Files uploaded successfully.');
  })
);

export default router;
