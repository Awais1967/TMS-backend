import fs from "fs";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import unzipper from "unzipper";
import { parse } from "csv-parse";
import ExcelJS from "exceljs";

import Activity from "../Models/Activity.js";
import BulkActivityImport from "../Models/BulkActivityImport.js";
import { downloadS3ObjectToFile, uploadFileToS3, sanitizeFileName, makePublicUrlFromKey } from "../Utils/s3Client.js";

const WORKER_ID = `${process.pid}@${process.env.HOSTNAME || "local"}`;
const TMP_DIR = process.env.TMPDIR || os.tmpdir();

const POLL_LOCK_STALE_MS = 10 * 60 * 1000;
const BATCH_SIZE = Math.min(2000, Math.max(100, Number(process.env.ACTIVITY_IMPORT_BATCH_SIZE) || 500));
const HEARTBEAT_EVERY_MS = 10_000;

const safeZipPath = (p) => {
  const raw = String(p || "").replace(/\\/g, "/");
  const normalized = path.posix.normalize(raw).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized.replace(/^\/+/, "");
};

const splitList = (v) => {
  if (!v) return [];
  return String(v)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
};

const splitUrls = (v) => {
  if (!v) return [];
  return String(v)
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
};

const normalizeTier = (v) => {
  const t = String(v || "").trim();
  if (["public_weekly_free", "free_registered", "premium"].includes(t)) return t;
  return null;
};

const mapRowToActivityDoc = ({ row, defaults, createdBy, assetMap }) => {
  const title = String(row.title || row.Title || "").trim();
  const description = String(row.description || row.Description || "").trim();
  const learningDomain = String(row.learningDomain || row.domain || row.Domain || "").trim();

  if (!title) throw new Error("Missing title");
  if (!description) throw new Error("Missing description");
  if (!learningDomain) throw new Error("Missing learningDomain");

  const category = String(row.category || defaults.category || "library").trim() || "library";

  const coverRaw = String(row.coverImage || row.coverImageUrl || defaults.coverImageUrl || "").trim();
  const coverUrl = coverRaw && assetMap?.[coverRaw] ? assetMap[coverRaw] : coverRaw;

  const galleryList = splitUrls(row.gallery || row.galleryUrls || "");
  const gallery = galleryList.map((u) => {
    const url = assetMap?.[u] ? assetMap[u] : u;
    return { url, type: "image", publicId: null, key: null, storageProvider: "" };
  });

  const resourcesList = splitUrls(row.resources || row.resourceUrls || "");
  const resources = resourcesList.map((u) => {
    const url = assetMap?.[u] ? assetMap[u] : u;
    return { url, name: "", type: "", publicId: null, key: null, storageProvider: "" };
  });

  const tier = normalizeTier(row.accessTier || defaults.accessTier);
  const isWeeklyFreeEligible = String(row.isWeeklyFreeEligible || defaults.isWeeklyFreeEligible || "").toLowerCase() === "true";

  const externalId = String(row.externalId || row.ExternalId || "").trim() || null;

  const doc = {
    userId: createdBy,                 // schema requires this
    createdBy,                         // admin who imported
    creatorName: String(row.creatorName || defaults.creatorName || "Admin").trim().slice(0, 50),

    title,
    description,
    learningDomain,
    category,

    instructions: splitList(row.instructions || row.Instructions || ""),
    materials: String(row.materials || "").trim(),

    nickname: String(row.nickname || "").trim().slice(0, 50),
    ageGroup: String(row.ageGroup || "").trim(),
    estimatedDuration: String(row.estimatedDuration || row.duration || "").trim(),

    time: String(row.time || "").trim(),
    effect: String(row.effect || "").trim(),
    parentInstructions: String(row.parentInstructions || "").trim(),

    // Admin uploads should go live by default
    isApproved: true,
    status: "Actief",

    averageRating: 0,
    ratings: [],

    coverImage: coverUrl
      ? { url: coverUrl, publicId: null, key: null, storageProvider: "" }
      : { url: null, publicId: null, key: null, storageProvider: "" },

    gallery,
    resources,

    // ✅ freemium fields (safe even if frontend not using yet)
    ...(tier ? { accessTier: tier } : {}),
    ...(isWeeklyFreeEligible ? { isWeeklyFreeEligible: true } : {}),

    ...(externalId ? { externalId } : {}),
  };

  return { doc, externalId };
};

const ensureHeartbeat = async (importId) => {
  await BulkActivityImport.findByIdAndUpdate(importId, {
    $set: { "lock.heartbeatAt": new Date() },
  }).catch(() => {});
};

const claimNextImport = async () => {
  const staleBefore = new Date(Date.now() - POLL_LOCK_STALE_MS);

  const doc = await BulkActivityImport.findOneAndUpdate(
    {
      status: "queued",
      $or: [{ "lock.lockedAt": null }, { "lock.lockedAt": { $lt: staleBefore } }],
    },
    {
      $set: {
        status: "processing",
        startedAt: new Date(),
        "lock.lockedBy": WORKER_ID,
        "lock.lockedAt": new Date(),
        "lock.heartbeatAt": new Date(),
        lastError: "",
      },
    },
    { sort: { createdAt: 1 }, new: true }
  );

  return doc;
};

const writeErrorHeaderIfNeeded = async (ws) => {
  if (ws.__headerWritten) return;
  ws.write("rowNumber,externalId,title,error\n");
  ws.__headerWritten = true;
};

const appendError = async (ws, { rowNumber, externalId, title, error }) => {
  await writeErrorHeaderIfNeeded(ws);
  const safe = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  ws.write([rowNumber, safe(externalId), safe(title), safe(error)].join(",") + "\n");
};

const flushBulkOps = async ({ ops, rowsMeta, dryRun }) => {
  if (!ops.length) return { ok: 0, failed: 0, failures: [] };
  if (dryRun) return { ok: ops.length, failed: 0, failures: [] };

  try {
    await Activity.bulkWrite(ops, { ordered: false });
    return { ok: ops.length, failed: 0, failures: [] };
  } catch (err) {
    // Fallback to per-row to identify exact failing rows
    const failures = [];
    let ok = 0;
    let failed = 0;

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const meta = rowsMeta[i] || {};
      try {
        if (op.insertOne) {
          await Activity.create(op.insertOne.document);
        } else if (op.updateOne) {
          await Activity.updateOne(op.updateOne.filter, op.updateOne.update, { upsert: !!op.updateOne.upsert });
        }
        ok++;
      } catch (e) {
        failed++;
        failures.push({
          rowNumber: meta.rowNumber,
          externalId: meta.externalId,
          title: meta.title,
          error: e?.message || "Write failed",
        });
      }
    }

    return { ok, failed, failures };
  }
};

const processCsvStream = async ({ importDoc, csvPath, defaults, assetMap }) => {
  const tmpErrPath = path.join(TMP_DIR, `activity-import-errors-${importDoc._id}.csv`);
  const errWs = fs.createWriteStream(tmpErrPath, { flags: "w" });

  let totalRows = 0;
  let processedRows = 0;
  let successCount = 0;
  let failedCount = 0;

  const ops = [];
  const rowsMeta = [];

  const createdBy = new mongoose.Types.ObjectId(importDoc.createdBy);

  let lastHeartbeatAt = Date.now();

  const parser = fs
    .createReadStream(csvPath)
    .pipe(parse({ columns: true, relax_quotes: true, relax_column_count: true, trim: true, skip_empty_lines: true }));

  for await (const row of parser) {
    totalRows++;

    // cancellation check every batch-ish
    if (totalRows % BATCH_SIZE === 0) {
      const latest = await BulkActivityImport.findById(importDoc._id).select("status").lean();
      if (latest?.status === "cancelled") break;
    }

    try {
      const { doc, externalId } = mapRowToActivityDoc({
        row,
        defaults,
        createdBy,
        assetMap,
      });

      // Upsert requires externalId (best practice)
      if (importDoc.mode === "upsert") {
        if (!externalId) throw new Error("externalId required for upsert mode");
        ops.push({
          updateOne: {
            filter: { externalId },
            update: { $set: doc, $setOnInsert: { createdAt: new Date() } },
            upsert: true,
          },
        });
      } else {
        ops.push({ insertOne: { document: doc } });
      }

      rowsMeta.push({ rowNumber: totalRows, externalId: externalId || "", title: doc.title });

      if (ops.length >= BATCH_SIZE) {
        const r = await flushBulkOps({ ops, rowsMeta, dryRun: importDoc.dryRun });

        successCount += r.ok;
        failedCount += r.failed;
        processedRows += ops.length;

        for (const f of r.failures || []) {
          await appendError(errWs, f);
        }

        ops.length = 0;
        rowsMeta.length = 0;

        await BulkActivityImport.findByIdAndUpdate(importDoc._id, {
          $set: { "totals.totalRows": totalRows, "totals.processedRows": processedRows, "totals.successCount": successCount, "totals.failedCount": failedCount },
        });

        if (Date.now() - lastHeartbeatAt >= HEARTBEAT_EVERY_MS) {
          await ensureHeartbeat(importDoc._id);
          lastHeartbeatAt = Date.now();
        }
      }
    } catch (e) {
      failedCount++;
      processedRows++;

      await appendError(errWs, {
        rowNumber: totalRows,
        externalId: row.externalId || row.ExternalId || "",
        title: row.title || row.Title || "",
        error: e?.message || "Validation failed",
      });

      if (Date.now() - lastHeartbeatAt >= HEARTBEAT_EVERY_MS) {
        await ensureHeartbeat(importDoc._id);
        lastHeartbeatAt = Date.now();
      }
    }
  }

  // flush remaining
  if (ops.length) {
    const r = await flushBulkOps({ ops, rowsMeta, dryRun: importDoc.dryRun });
    successCount += r.ok;
    failedCount += r.failed;
    processedRows += ops.length;
    for (const f of r.failures || []) await appendError(errWs, f);
  }

  await new Promise((resolve) => errWs.end(resolve));

  return { tmpErrPath, totalRows, processedRows, successCount, failedCount };
};

const extractZipToManifestAndAssets = async ({ importDoc, zipPath }) => {
  const outDir = path.join(TMP_DIR, `activity-import-${importDoc._id}`);
  await fs.promises.mkdir(outDir, { recursive: true });

  let manifestPath = null;
  const assetMap = {}; // "assets/a.jpg" -> "https://..."

  const directory = await unzipper.Open.file(zipPath);

  for (const entry of directory.files) {
    const safe = safeZipPath(entry.path);
    if (!safe || entry.type !== "File") continue;

    // manifest
    if (safe.toLowerCase() === "manifest.csv") {
      manifestPath = path.join(outDir, "manifest.csv");
      await new Promise((resolve, reject) => {
        entry.stream()
          .pipe(fs.createWriteStream(manifestPath))
          .on("finish", resolve)
          .on("error", reject);
      });
      continue;
    }

    // assets/*
    if (safe.startsWith("assets/")) {
      const localPath = path.join(outDir, safe);
      await fs.promises.mkdir(path.dirname(localPath), { recursive: true });

      await new Promise((resolve, reject) => {
        entry.stream()
          .pipe(fs.createWriteStream(localPath))
          .on("finish", resolve)
          .on("error", reject);
      });

      const fileName = sanitizeFileName(path.basename(safe));
      const s3Key = `activity-import-assets/${importDoc._id}/${fileName}`;

      const uploaded = await uploadFileToS3({
        filepath: localPath,
        key: s3Key,
        contentType: "application/octet-stream",
      });

      assetMap[safe] = uploaded.url || makePublicUrlFromKey(uploaded.key);
      continue;
    }
  }

  if (!manifestPath) throw new Error("ZIP missing manifest.csv at root");

  return { manifestPath, assetMap };
};

const processXlsxToTempCsv = async ({ xlsxPath, outCsvPath }) => {
  // Convert first sheet to CSV-like rows (columns from header row)
  const wb = new ExcelJS.stream.xlsx.WorkbookReader(xlsxPath);
  const ws = fs.createWriteStream(outCsvPath, { flags: "w" });

  let headers = null;

  for await (const worksheetReader of wb) {
    for await (const row of worksheetReader) {
      const values = row.values || [];
      const cells = values.slice(1); // exceljs rows start at 1

      if (!headers) {
        headers = cells.map((c) => String(c || "").trim());
        ws.write(headers.join(",") + "\n");
        continue;
      }

      const safe = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      ws.write(cells.map(safe).join(",") + "\n");
    }
    break; // first worksheet only
  }

  await new Promise((resolve) => ws.end(resolve));
  return outCsvPath;
};

export const runOneActivityImport = async () => {
  const importDoc = await claimNextImport();
  if (!importDoc) return false;

  console.log(
    `[ActivityImportWorker] claimed importId=${importDoc._id} type=${importDoc.type} mode=${importDoc.mode}`
  );

  try {
    const tmpPath = path.join(TMP_DIR, `activity-import-${importDoc._id}.${importDoc.type}`);
    await downloadS3ObjectToFile({ key: importDoc.file.key, filepath: tmpPath });

    let csvPath = tmpPath;
    let assetMap = null;

    if (importDoc.type === "zip") {
      const r = await extractZipToManifestAndAssets({ importDoc, zipPath: tmpPath });
      csvPath = r.manifestPath;
      assetMap = r.assetMap;
    }

    if (importDoc.type === "xlsx") {
      const outCsv = path.join(TMP_DIR, `activity-import-${importDoc._id}.csv`);
      csvPath = await processXlsxToTempCsv({ xlsxPath: tmpPath, outCsvPath: outCsv });
    }

    const defaults = importDoc.defaults || {};

    const res = await processCsvStream({ importDoc, csvPath, defaults, assetMap });

    // upload error report if any failures
    let errorKey = null;
    let errorUrl = null;
    if (res.failedCount > 0 && fs.existsSync(res.tmpErrPath)) {
      errorKey = `activity-import-errors/${importDoc._id}.csv`;
      const uploaded = await uploadFileToS3({ filepath: res.tmpErrPath, key: errorKey, contentType: "text/csv" });
      errorUrl = uploaded.url || makePublicUrlFromKey(uploaded.key);
    }

    const latest = await BulkActivityImport.findById(importDoc._id).select("status").lean();

    const finalStatus = latest?.status === "cancelled" ? "cancelled" : "completed";

    await BulkActivityImport.findByIdAndUpdate(importDoc._id, {
      $set: {
        status: finalStatus,
        finishedAt: new Date(),
        "totals.totalRows": res.totalRows,
        "totals.processedRows": res.processedRows,
        "totals.successCount": res.successCount,
        "totals.failedCount": res.failedCount,
        ...(errorKey ? { errorReport: { key: errorKey, url: errorUrl } } : {}),
        "lock.heartbeatAt": new Date(),
      },
    });

    return true;
  } catch (err) {
    console.error("activityImportWorker failed:", err?.stack || err);

    await BulkActivityImport.findByIdAndUpdate(importDoc._id, {
      $set: {
        status: "failed",
        finishedAt: new Date(),
        lastError: err?.message || "Import failed",
        "lock.heartbeatAt": new Date(),
      },
    }).catch(() => {});

    return true;
  }
};
