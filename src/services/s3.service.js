import fs from "fs/promises";
import path from "path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const getS3Config = () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  publicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL,
});

export const hasS3Config = () => {
  const { accessKeyId, secretAccessKey, region, bucket } = getS3Config();
  return Boolean(accessKeyId && secretAccessKey && region && bucket);
};

const sanitizeS3FileName = (originalName = "document") => {
  const extension = path.extname(originalName).toLowerCase();
  const baseName =
    path
      .basename(originalName, extension)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 120) || "document";

  return `${baseName}${extension}`;
};

export const buildS3Key = (file, folder = "documents") => {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeFolder = String(folder || "documents").replace(/^\/+|\/+$/g, "") || "documents";
  const safeName = sanitizeS3FileName(file?.originalname || file?.filename || "document");

  return `${safeFolder}/${year}/${month}/${Date.now()}-${safeName}`;
};

const buildPublicUrl = (key) => {
  const { bucket, publicBaseUrl, region } = getS3Config();
  const cleanBaseUrl = String(publicBaseUrl || "").replace(/\/+$/g, "");

  if (cleanBaseUrl) return `${cleanBaseUrl}/${key}`;

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

export const uploadFileToS3 = async (file, folder = "documents") => {
  if (!file?.path) {
    const error = new Error("File is required");
    error.statusCode = 400;
    throw error;
  }

  if (!hasS3Config()) {
    const error = new Error("S3 credentials missing");
    error.code = "S3_CONFIG_MISSING";
    throw error;
  }

  const { accessKeyId, secretAccessKey, region, bucket } = getS3Config();
  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const s3Key = buildS3Key(file, folder);
  const body = await fs.readFile(file.path);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: body,
      ContentType: file.mimetype || "application/octet-stream",
    })
  );

  return {
    storage: "s3",
    fileUrl: buildPublicUrl(s3Key),
    s3Key,
    bucket,
  };
};
