import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { adminOnly } from '../../core/middlewares/authGuard';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { sendSuccess } from '../../core/utils/responseHandler';
import { AppError } from '../../core/errors/appError';

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
      cb(new AppError(`Only JPEG, PNG, WebP and GIF files are allowed.`, 400) as any);
    }
  },
});

const router = Router();

router.post(
  '/',
  ...adminOnly,
  upload.array('images', 10),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw new AppError('No files uploaded.', 400);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = files.map((f) => `${baseUrl}/uploads/${f.filename}`);
    sendSuccess(res, { urls }, 'Files uploaded successfully.');
  })
);

export default router;
