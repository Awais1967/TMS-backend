import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

const {
  AWS_REGION,
  AWS_S3_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  CDN_BASE_URL,
  S3_PUBLIC_BASE_URL,
  AWS_S3_PUBLIC_BASE_URL,
} = process.env;

/* -------------------------------------------------------------------------- */
/* Client                                                                      */
/* -------------------------------------------------------------------------- */

const createS3Client = () => {
  const config = {
    region: AWS_REGION || "us-east-1",
  };

  // Works both locally (static keys) and in production (IAM role)
  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    };
  }

  return new S3Client(config);
};

const s3Client = createS3Client();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const sanitizeFileName = (originalName = "upload") => {
  return String(originalName)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\./, "")
    .slice(-200);
};

const makePublicUrlFromKey = (key) => {
  if (!key) return null;

  if (CDN_BASE_URL) {
    return `${CDN_BASE_URL.replace(/\/+$/, "")}/${key}`;
  }

  if (AWS_S3_PUBLIC_BASE_URL) {
    return `${AWS_S3_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
  }

  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
  }

  const region = AWS_REGION || "us-east-1";
  const bucket = AWS_S3_BUCKET;
  if (!bucket) return null;

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

/* -------------------------------------------------------------------------- */
/* Uploads                                                                     */
/* -------------------------------------------------------------------------- */

const uploadBufferToS3 = async ({ buffer, key, contentType }) => {
  if (!AWS_S3_BUCKET) throw new Error("AWS_S3_BUCKET is not configured");

  const uploader = new Upload({
    client: s3Client,
    params: {
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    },
  });

  await uploader.done();

  return { key, url: makePublicUrlFromKey(key) };
};

const uploadStreamToS3 = async ({ stream, key, contentType }) => {
  if (!AWS_S3_BUCKET) throw new Error("AWS_S3_BUCKET is not configured");

  const uploader = new Upload({
    client: s3Client,
    params: {
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: stream,
      ContentType: contentType || "application/octet-stream",
    },
  });

  await uploader.done();

  return { key, url: makePublicUrlFromKey(key) };
};

const uploadFileToS3 = async ({ filepath, key, contentType }) => {
  const stream = fs.createReadStream(filepath);
  return uploadStreamToS3({ stream, key, contentType });
};

/* -------------------------------------------------------------------------- */
/* Presigned URL (Direct browser upload -> S3, avoids server overload)         */
/* -------------------------------------------------------------------------- */

const getPresignedPutUrl = async ({ key, contentType, expiresIn = 900 }) => {
  if (!AWS_S3_BUCKET) throw new Error("AWS_S3_BUCKET is not configured");

  const cmd = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });

  // expiresIn seconds (default 15 minutes)
  return getSignedUrl(s3Client, cmd, { expiresIn });
};

/* -------------------------------------------------------------------------- */
/* Downloads                                                                   */
/* -------------------------------------------------------------------------- */

const downloadS3ObjectToFile = async ({ key, filepath }) => {
  if (!AWS_S3_BUCKET) throw new Error("AWS_S3_BUCKET is not configured");
  if (!key) throw new Error("downloadS3ObjectToFile: key is required");
  if (!filepath) throw new Error("downloadS3ObjectToFile: filepath is required");

  await fs.promises.mkdir(path.dirname(filepath), { recursive: true });

  const resp = await s3Client.send(
    new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    })
  );

  if (!resp?.Body) throw new Error("S3 GetObject returned empty body");

  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filepath);
    resp.Body.pipe(ws);
    resp.Body.on("error", reject);
    ws.on("error", reject);
    ws.on("finish", resolve);
  });

  return filepath;
};

/* -------------------------------------------------------------------------- */
/* Deletes                                                                     */
/* -------------------------------------------------------------------------- */

const deleteObjectByKey = async (key) => {
  if (!AWS_S3_BUCKET || !key) return;

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error("deleteObjectByKey error:", err?.message || err);
  }
};

export {
  createS3Client,
  s3Client,
  uploadBufferToS3,
  uploadStreamToS3,
  uploadFileToS3,
  deleteObjectByKey,
  makePublicUrlFromKey,
  sanitizeFileName,
  getPresignedPutUrl,
  downloadS3ObjectToFile,
};
