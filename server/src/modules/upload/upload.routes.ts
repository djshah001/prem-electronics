import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import sharp, { type Metadata } from "sharp";
import { adminOnly } from "../../core/middlewares/authGuard.js";
import { asyncHandler } from "../../core/middlewares/asyncHandler.js";
import { sendSuccess } from "../../core/utils/responseHandler.js";
import { AppError } from "../../core/errors/appError.js";
import { db } from "../../infrastructure/database/db.js";
import { mediaAssets } from "../../infrastructure/database/schema/index.js";
import {
  bannerUploadDirectory,
  serverUploadRoot,
} from "../../core/utils/uploadPaths.js";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/tiff",
];
const MAX_SIZE_MB = 15;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Only JPEG, PNG, WebP, GIF, and AVIF image files are allowed.",
          400,
        ) as any,
      );
    }
  },
});

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(
      null,
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.mimetype,
      ),
    );
  },
});

const router = Router();

router.post(
  "/banner-assets",
  ...adminOnly,
  bannerUpload.single("image"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file)
      throw new AppError("Select a JPEG, PNG, WebP, or AVIF image.", 400);
    let sourceMetadata: Metadata;
    try {
      sourceMetadata = await sharp(req.file.buffer, {
        limitInputPixels: 40_000_000,
        animated: true,
      }).metadata();
    } catch {
      throw new AppError(
        "The uploaded file could not be safely decoded as an image.",
        400,
      );
    }
    if (
      !["jpeg", "png", "webp", "avif"].includes(sourceMetadata.format ?? "")
    ) {
      throw new AppError(
        "Only decoded JPEG, PNG, WebP, and AVIF images are supported.",
        400,
      );
    }
    if ((sourceMetadata.pages ?? 1) > 1)
      throw new AppError("Animated banner images are not supported.", 400);
    if (
      !sourceMetadata.width ||
      !sourceMetadata.height ||
      sourceMetadata.width < 320 ||
      sourceMetadata.height < 180
    ) {
      throw new AppError(
        "Banner images must be at least 320 × 180 pixels.",
        400,
      );
    }
    if (
      sourceMetadata.width > 12_000 ||
      sourceMetadata.height > 12_000 ||
      sourceMetadata.width * sourceMetadata.height > 40_000_000
    ) {
      throw new AppError(
        "Banner image dimensions exceed the 40 megapixel safety limit.",
        400,
      );
    }

    let normalized: Buffer;
    try {
      // High-fidelity WebP compression without perceptible quality decrease
      normalized = await sharp(req.file.buffer, {
        limitInputPixels: 40_000_000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 2560,
          height: 1440,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: 88,
          effort: 5,
          smartSubsample: true,
          alphaQuality: 95,
        })
        .toBuffer();
    } catch {
      throw new AppError(
        "The uploaded image failed full decode validation.",
        400,
      );
    }

    const metadata = await sharp(normalized).metadata();
    const fileName = `${Date.now()}-${randomUUID()}.webp`;
    const directory = bannerUploadDirectory;
    const filePath = path.join(directory, fileName);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, normalized, { flag: "wx" });

    // Also generate a lightweight banner preview thumbnail (640x360 max)
    try {
      const thumbBuffer = await sharp(req.file.buffer, {
        limitInputPixels: 40_000_000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 640,
          height: 360,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();
      const thumbFileName = fileName.replace(/\.webp$/, "-thumb.webp");
      await fs.writeFile(path.join(directory, thumbFileName), thumbBuffer, {
        flag: "wx",
      });
    } catch {
      // Non-blocking thumbnail creation
    }

    try {
      const [asset] = await db
        .insert(mediaAssets)
        .values({
          kind: "banner",
          storageKey: `banners/${fileName}`,
          url: `/uploads/banners/${fileName}`,
          mimeType: "image/webp",
          width: metadata.width!,
          height: metadata.height!,
          byteSize: normalized.byteLength,
          uploadedBy: req.user!.id,
        })
        .returning();
      sendSuccess(
        res,
        { asset },
        "Banner image uploaded and optimized successfully.",
        201,
      );
    } catch (error) {
      await fs.unlink(filePath).catch(() => undefined);
      throw error;
    }
  }),
);

router.post(
  ["/", "/products"],
  ...adminOnly,
  upload.array("images", 10),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0)
      throw new AppError("No files uploaded.", 400);

    const uploadType = String(req.query.type || req.body?.type || "")
      .trim()
      .toLowerCase();
    const requestedRatio = String(req.query.ratio || req.body?.ratio || "")
      .trim()
      .toLowerCase();
    const isNonSquareType = uploadType === "category" || uploadType === "blog";
    const isSquare1to1 =
      requestedRatio === "1:1" || uploadType === "product" || !isNonSquareType;

    const processedFiles: Array<{
      url: string;
      thumbnailUrl: string;
      fileName: string;
      thumbFileName: string;
      width: number;
      height: number;
      size: number;
      thumbWidth: number;
      thumbHeight: number;
      thumbSize: number;
    }> = [];

    const createdPaths: string[] = [];

    try {
      await fs.mkdir(serverUploadRoot, { recursive: true });

      for (const file of files) {
        let sourceMetadata: Metadata;
        try {
          sourceMetadata = await sharp(file.buffer, {
            limitInputPixels: 45_000_000,
            animated: false,
          }).metadata();
        } catch {
          throw new AppError(
            `The file "${file.originalname}" could not be safely decoded as an image.`,
            400,
          );
        }

        if (
          !sourceMetadata.format ||
          !ALLOWED_MIME.some((mime) => mime.includes(sourceMetadata.format!))
        ) {
          throw new AppError(
            `Unsupported image format in "${file.originalname}".`,
            400,
          );
        }

        if (
          !sourceMetadata.width ||
          !sourceMetadata.height ||
          sourceMetadata.width < 10 ||
          sourceMetadata.height < 10
        ) {
          throw new AppError(
            `Image "${file.originalname}" is too small or corrupt.`,
            400,
          );
        }

        const uniqueBase = `${Date.now()}-${randomUUID()}`;
        const mainFileName = `${uniqueBase}.webp`;
        const thumbFileName = `${uniqueBase}-thumb.webp`;

        const mainFilePath = path.join(serverUploadRoot, mainFileName);
        const thumbFilePath = path.join(serverUploadRoot, thumbFileName);

        let mainBuffer: Buffer;
        let thumbBuffer: Buffer;

        if (isSquare1to1) {
          // Automatic 1:1 Aspect Ratio Adjustment for Products:
          // - Enforces output square dimensions between min 500 × 500 px and max 1000 × 1000 px
          // - Uses 'cover' centered cropping so NO background colors or padding bars are added
          // - Product fills the 1:1 frame completely without shrinking
          const origW = sourceMetadata.width;
          const origH = sourceMetadata.height;

          if (origW < 500 || origH < 500) {
            throw new AppError(
              `Product image "${file.originalname}" is too small (${origW} × ${origH} px). Minimum required size is 500 × 500 pixels.`,
              400
            );
          }

          const targetSquareSize = Math.min(1000, Math.max(500, Math.max(origW, origH)));

          mainBuffer = await sharp(file.buffer, {
            limitInputPixels: 45_000_000,
            animated: false,
          })
            .rotate()
            .resize({
              width: targetSquareSize,
              height: targetSquareSize,
              fit: "cover",
              position: "centre",
            })
            .webp({
              quality: 88,
              effort: 5,
              smartSubsample: true,
              alphaQuality: 95,
            })
            .toBuffer();

          thumbBuffer = await sharp(file.buffer, {
            limitInputPixels: 45_000_000,
            animated: false,
          })
            .rotate()
            .resize({
              width: 400,
              height: 400,
              fit: "cover",
              position: "centre",
            })
            .webp({
              quality: 85,
              effort: 4,
              smartSubsample: true,
              alphaQuality: 90,
            })
            .toBuffer();
        } else {
          // Freeform / natural aspect ratio for category banners (3:1) and blog headers
          mainBuffer = await sharp(file.buffer, {
            limitInputPixels: 45_000_000,
            animated: false,
          })
            .rotate()
            .resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({
              quality: 88,
              effort: 5,
              smartSubsample: true,
              alphaQuality: 95,
            })
            .toBuffer();

          thumbBuffer = await sharp(file.buffer, {
            limitInputPixels: 45_000_000,
            animated: false,
          })
            .rotate()
            .resize({
              width: 400,
              height: 400,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({
              quality: 85,
              effort: 4,
              smartSubsample: true,
              alphaQuality: 90,
            })
            .toBuffer();
        }

        const mainMeta = await sharp(mainBuffer).metadata();
        const thumbMeta = await sharp(thumbBuffer).metadata();

        await fs.writeFile(mainFilePath, mainBuffer, { flag: "wx" });
        createdPaths.push(mainFilePath);

        await fs.writeFile(thumbFilePath, thumbBuffer, { flag: "wx" });
        createdPaths.push(thumbFilePath);

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        processedFiles.push({
          url: `${baseUrl}/uploads/${mainFileName}`,
          thumbnailUrl: `${baseUrl}/uploads/${thumbFileName}`,
          fileName: mainFileName,
          thumbFileName: thumbFileName,
          width: mainMeta.width ?? 0,
          height: mainMeta.height ?? 0,
          size: mainBuffer.byteLength,
          thumbWidth: thumbMeta.width ?? 0,
          thumbHeight: thumbMeta.height ?? 0,
          thumbSize: thumbBuffer.byteLength,
        });
      }

      sendSuccess(
        res,
        {
          urls: processedFiles.map((f) => f.url),
          thumbnails: processedFiles.map((f) => f.thumbnailUrl),
          items: processedFiles,
        },
        "Files uploaded, compressed, and thumbnails generated successfully.",
      );
    } catch (error) {
      await Promise.allSettled(
        createdPaths.map((p) => fs.unlink(p).catch(() => undefined)),
      );
      throw error;
    }
  }),
);

export default router;
