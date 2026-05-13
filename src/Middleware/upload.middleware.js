import fs from "fs";
import path from "path";
import multer from "multer";

const documentsDir = path.join(process.cwd(), "uploads", "documents");

fs.mkdirSync(documentsDir, { recursive: true });

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]);
const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const sanitizeBaseName = (name = "document") =>
  String(name)
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 120) || "document";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeName = sanitizeBaseName(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension)) {
    cb(null, true);
    return;
  }

  const error = new Error("Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.");
  error.statusCode = 400;
  cb(error);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const uploadDocumentFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      error.statusCode = 400;
      error.message = "File size must be 10MB or less.";
    }

    return next(error);
  });
};

export const uploadDocumentFiles = (req, res, next) => {
  upload.array("files")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      error.statusCode = 400;
      error.message = "File size must be 10MB or less.";
    }

    return next(error);
  });
};

export { documentsDir };
