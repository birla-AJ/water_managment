import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

const uploadRoot = path.resolve(process.cwd(), env.uploads.dir);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.uploads.maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});
