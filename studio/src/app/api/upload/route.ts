import { hash } from "@studio/lib/hash-edge";
import { concat } from "@studio/lib/utils";
import withUser from "@studio/lib/with-user";
import { NextResponse } from "next/server";
import { ok, err } from "@justmiracle/result";
import { R2 } from "@studio/lib/r2";
import { db } from "@studio/db";
import { user as userTable, user_file } from "@studio/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateId } from "lucia";
import { ApiError } from "@studio/lib/api-error";
import { HttpStatus } from "@studio/constants/http-status";
import { env } from "@studio/env";
import { filetypeinfo } from "magic-bytes.js";

export const runtime = "edge";

// 500MB
const STORAGE_LIMIT = 500 * 1000 * 1000;

export const POST = withUser(async ({ req, user }) => {
  const envs = [
    env.R2_URL,
    env.R2_PUBLIC_URL,
    env.R2_BUCKET,
    env.R2_ACCESS_KEY,
    env.R2_SECRET_ACCESS_KEY,
  ];

  if (envs.some((env) => !env)) {
    throw new ApiError({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "R2 is not configured!",
    });
  }

  const formData = await req.formData().then(ok).catch(err);

  if (formData.error) {
    throw new ApiError({
      status: HttpStatus.BAD_REQUEST,
      message: "Something went wrong, please try again later",
      detailedMessage: formData.error.message,
    });
  }

  const file = formData.value.get("file");

  if (!file || !(file instanceof Blob)) {
    throw new ApiError({
      status: HttpStatus.BAD_REQUEST,
      message: "Invalid file",
    });
  }

  const newStorageUsage = user.storageUsage + file.size;

  if (newStorageUsage > STORAGE_LIMIT) {
    throw new ApiError({
      status: HttpStatus.INSUFFICIENT_STORAGE,
      message: "Storage limit exceeded",
    });
  }

  // we can do compression or resizing here and return a new buffer
  const buffer = new Uint8Array(await file.arrayBuffer());

  // e.g. image/png -> png
  const fallbackFileType = file.type.split("/")[1] || "";
  const fallbackExtension = file.name.split(".").pop() || fallbackFileType;

  const { extension = fallbackExtension, mime = file.type } =
    filetypeinfo(buffer)[0];

  // hash the content and append the file extension
  const hashedFilename = concat(await hash(buffer), ".", extension);

  const uploadToR2 = await R2.upload({
    buffer,
    userId: user.id,
    filename: hashedFilename,
    contentType: mime,
  })
    .then(ok)
    .catch(err);

  if (uploadToR2.error)
    throw new ApiError({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Failed to upload your image",
      detailedMessage: uploadToR2.error.message,
    });

  const updateUserStorageUsageQuery = db
    .update(userTable)
    .set({ storageUsage: sql`${userTable.storageUsage} + ${file.size}` })
    .where(eq(userTable.id, user.id));

  const insertFileQuery = db.insert(user_file).values({
    id: generateId(15),
    user_id: user.id,
    filename: file.name,
    hashed: hashedFilename,
    path: uploadToR2.value.url,
    size_in_byte: file.size,
    created_at: Date.now(),
  });

  const batch = await db
    .batch([updateUserStorageUsageQuery, insertFileQuery])
    .then(ok)
    .catch(err);

  if (batch.error) {
    throw new ApiError({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Failed to upload your image",
      detailedMessage: batch.error.message,
    });
  }

  return NextResponse.json({ url: uploadToR2.value.url });
});
