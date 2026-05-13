import { hasS3Config, uploadFileToS3 } from "./s3.service.js";

let warnedMissingS3Config = false;

const localUploadResult = (file, folder = "documents") => {
  const safeFolder = String(folder || "documents").replace(/^\/+|\/+$/g, "") || "documents";

  return {
    storage: "local",
    fileUrl: `/uploads/${safeFolder}/${file.filename}`,
    s3Key: null,
    bucket: null,
  };
};

export const uploadFile = async (file, folder = "documents") => {
  if (!file) {
    const error = new Error("File is required");
    error.statusCode = 400;
    throw error;
  }

  const storageDriver = String(process.env.STORAGE_DRIVER || "local").toLowerCase();

  if (storageDriver === "s3") {
    if (!hasS3Config()) {
      if (!warnedMissingS3Config) {
        console.warn("S3 credentials missing. Falling back to local storage.");
        warnedMissingS3Config = true;
      }

      return localUploadResult(file, folder);
    }

    try {
      return await uploadFileToS3(file, folder);
    } catch (error) {
      console.warn(`S3 upload failed. Falling back to local storage. ${error.message}`);
      return localUploadResult(file, folder);
    }
  }

  return localUploadResult(file, folder);
};
