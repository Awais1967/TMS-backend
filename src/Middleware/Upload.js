import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "application/pdf",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Unsupported file type"), false);
  },
});

export default upload;
