import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';

export const AssetStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDirectory = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory, { recursive: true });
    }

    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});
