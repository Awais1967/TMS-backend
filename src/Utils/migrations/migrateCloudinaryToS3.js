import { config as configDotenv } from "dotenv";
import axios from "axios";
import pLimit from "p-limit";
import connectToDatabase from "../db.js";
import { cloudinary } from "../cloudinary.js";
import {
  uploadStreamToS3,
  makePublicUrlFromKey,
  sanitizeFileName,
} from "../s3Client.js";
import User from "../../Models/User.js";
import Badge from "../../Models/Badge.js";
import Activity from "../../Models/Activity.js";
import Community from "../../Models/Community.js";
import CommunityPost from "../../Models/CommunityPost.js";

configDotenv();

const DRY_RUN = process.env.DRY_RUN === "true";
const limit = pLimit(3);

const listResourcesForType = async (resourceType) => {
  let resources = [];
  let nextCursor;

  do {
    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: resourceType,
      max_results: 500,
      next_cursor: nextCursor,
    });
    resources = resources.concat(res.resources || []);
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return resources;
};

const listAllCloudinaryResources = async () => {
  const [images, videos, raw] = await Promise.all([
    listResourcesForType("image"),
    listResourcesForType("video"),
    listResourcesForType("raw"),
  ]);
  return [...images, ...videos, ...raw];
};

const downloadAsStream = async (url) => {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  return response.data;
};

const uploadCloudinaryResourceToS3 = async (resource) => {
  const ext = resource.format ? `.${resource.format}` : "";
  const basePublicId = sanitizeFileName(resource.public_id || "asset");
  const key = `${resource.public_id || basePublicId}${ext}`;
  const stream = await downloadAsStream(resource.secure_url);
  const contentType =
    resource.resource_type === "video"
      ? `video/${resource.format || "mp4"}`
      : resource.resource_type === "raw"
      ? "application/octet-stream"
      : `image/${resource.format || "jpeg"}`;

  const uploaded = await uploadStreamToS3({
    stream,
    key,
    contentType,
  });

  return {
    oldUrl: resource.secure_url,
    key: uploaded.key,
    url: uploaded.url || makePublicUrlFromKey(uploaded.key),
  };
};

const migrateAllResources = async (resources) => {
  const uploads = [];
  let failed = 0;

  await Promise.all(
    resources.map((resource) =>
      limit(async () => {
        try {
          const result = await uploadCloudinaryResourceToS3(resource);
          uploads.push(result);
        } catch (err) {
          failed += 1;
          console.error(
            "Failed to migrate resource",
            resource.public_id,
            err?.message || err
          );
        }
      })
    )
  );

  return { uploads, failed };
};

const remapMediaItem = (item, urlMap) => {
  if (!item) return { updated: false, item };
  const base = item.toObject ? item.toObject() : { ...item };
  const mapping = urlMap.get(base.url);
  if (!mapping) return { updated: false, item: base };

  return {
    updated: true,
    item: {
      ...base,
      url: mapping.url,
      key: mapping.key,
      publicId: mapping.key,
      storageProvider: "s3",
    },
  };
};

const updateUsers = async (urlMap) => {
  const users = await User.find({
    $or: [
      { avatar: /res\.cloudinary\.com/ },
      { avatarUrl: /res\.cloudinary\.com/ },
    ],
  });

  const ops = [];

  for (const user of users) {
    const avatarUrl = user.avatarUrl || user.avatar;
    const mapping = urlMap.get(avatarUrl);
    if (!mapping) continue;

    ops.push({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            avatar: mapping.url,
            avatarUrl: mapping.url,
            avatarKey: mapping.key,
            avatarPublicId: user.avatarPublicId || mapping.key,
            storageProvider: "s3",
          },
        },
      },
    });
  }

  if (!ops.length) return 0;
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update ${ops.length} user avatars`);
    return ops.length;
  }

  await User.bulkWrite(ops);
  return ops.length;
};

const updateBadges = async (urlMap) => {
  const badges = await Badge.find({ icon: /res\.cloudinary\.com/ });
  const ops = [];

  for (const badge of badges) {
    const mapping = urlMap.get(badge.icon);
    if (!mapping) continue;

    ops.push({
      updateOne: {
        filter: { _id: badge._id },
        update: {
          $set: {
            icon: mapping.url,
            iconUrl: mapping.url,
            iconKey: mapping.key,
            storageProvider: "s3",
          },
        },
      },
    });
  }

  if (!ops.length) return 0;
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update ${ops.length} badges`);
    return ops.length;
  }

  await Badge.bulkWrite(ops);
  return ops.length;
};

const updateCommunities = async (urlMap) => {
  const communities = await Community.find({
    $or: [{ image: /res\.cloudinary\.com/ }, { coverImage: /res\.cloudinary\.com/ }],
  });
  const ops = [];

  for (const community of communities) {
    let updated = false;
    const payload = {};

    if (community.image) {
      const mapping = urlMap.get(community.image);
      if (mapping) {
        payload.image = mapping.url;
        payload.imageUrl = mapping.url;
        payload.imageKey = mapping.key;
        payload.storageProvider = "s3";
        updated = true;
      }
    }

    if (community.coverImage) {
      const mapping = urlMap.get(community.coverImage);
      if (mapping) {
        payload.coverImage = mapping.url;
        payload.coverImageUrl = mapping.url;
        payload.coverImageKey = mapping.key;
        payload.storageProvider = "s3";
        updated = true;
      }
    }

    if (updated) {
      ops.push({
        updateOne: {
          filter: { _id: community._id },
          update: { $set: payload },
        },
      });
    }
  }

  if (!ops.length) return 0;
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update ${ops.length} communities`);
    return ops.length;
  }

  await Community.bulkWrite(ops);
  return ops.length;
};

const updateCommunityPosts = async (urlMap) => {
  const posts = await CommunityPost.find({ image: /res\.cloudinary\.com/ });
  const ops = [];

  for (const post of posts) {
    const mapping = urlMap.get(post.image);
    if (!mapping) continue;

    ops.push({
      updateOne: {
        filter: { _id: post._id },
        update: {
          $set: {
            image: mapping.url,
            imageUrl: mapping.url,
            imageKey: mapping.key,
            storageProvider: "s3",
          },
        },
      },
    });
  }

  if (!ops.length) return 0;
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update ${ops.length} community posts`);
    return ops.length;
  }

  await CommunityPost.bulkWrite(ops);
  return ops.length;
};

const updateActivities = async (urlMap) => {
  const activities = await Activity.find({
    $or: [
      { "coverImage.url": /res\.cloudinary\.com/ },
      { "gallery.url": /res\.cloudinary\.com/ },
      { "resources.url": /res\.cloudinary\.com/ },
    ],
  });

  const ops = [];

  for (const activity of activities) {
    let updated = false;
    let coverImage = activity.coverImage || null;
    if (coverImage) {
      const mapping = urlMap.get(coverImage.url);
      if (mapping) {
        coverImage = {
          ...(coverImage.toObject ? coverImage.toObject() : coverImage),
          url: mapping.url,
          key: mapping.key,
          publicId: mapping.key,
          storageProvider: "s3",
        };
        updated = true;
      }
    }

    const galleryResult = (activity.gallery || []).map((item) => {
      const { item: mapped, updated: didUpdate } = remapMediaItem(item, urlMap);
      if (didUpdate) updated = true;
      return mapped;
    });

    const resourceResult = (activity.resources || []).map((item) => {
      const { item: mapped, updated: didUpdate } = remapMediaItem(item, urlMap);
      if (didUpdate) updated = true;
      return mapped;
    });

    if (updated) {
      ops.push({
        updateOne: {
          filter: { _id: activity._id },
          update: {
            $set: {
              coverImage,
              gallery: galleryResult,
              resources: resourceResult,
              storageProvider: "s3",
            },
          },
        },
      });
    }
  }

  if (!ops.length) return 0;
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update ${ops.length} activities`);
    return ops.length;
  }

  await Activity.bulkWrite(ops);
  return ops.length;
};

const run = async () => {
  console.log("Starting Cloudinary -> S3 migration");
  await connectToDatabase(process.env.MONGODB_URL);

  const resources = await listAllCloudinaryResources();
  console.log(`Found ${resources.length} Cloudinary assets`);

  const { uploads, failed } = await migrateAllResources(resources);
  const urlMap = new Map(uploads.map((u) => [u.oldUrl, u]));

  console.log(`Uploaded ${uploads.length} assets to S3. Failed: ${failed}`);

  const userUpdates = await updateUsers(urlMap);
  const badgeUpdates = await updateBadges(urlMap);
  const activityUpdates = await updateActivities(urlMap);
  const communityUpdates = await updateCommunities(urlMap);
  const communityPostUpdates = await updateCommunityPosts(urlMap);

  console.log(
    `DB updates - users: ${userUpdates}, badges: ${badgeUpdates}, activities: ${activityUpdates}, communities: ${communityUpdates}, posts: ${communityPostUpdates}`
  );

  if (DRY_RUN) {
    console.log("DRY_RUN enabled: database writes were skipped.");
  }

  console.log("Migration complete");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
