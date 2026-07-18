// Vercel Blob is the database: it stores both the CCTV images and a single
// JSON index that holds the face embeddings for every image.

import { put, list, del } from '@vercel/blob';

const IMAGE_PREFIX = 'cctv-images/';
const INDEX_PATH = 'cctv-index/index.json';

function token() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function emptyIndex() {
  return { version: 1, updatedAt: null, images: [] };
}

// Read the embedding index. Cache-busted so we always get the latest write.
export async function readIndex() {
  const { blobs } = await list({ prefix: INDEX_PATH, token: token() });
  const found = blobs.find((b) => b.pathname === INDEX_PATH);
  if (!found) return emptyIndex();
  try {
    const res = await fetch(`${found.url}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return emptyIndex();
    const data = await res.json();
    if (!data || !Array.isArray(data.images)) return emptyIndex();
    return data;
  } catch {
    return emptyIndex();
  }
}

export async function writeIndex(index) {
  index.updatedAt = new Date().toISOString();
  await put(INDEX_PATH, JSON.stringify(index), {
    access: 'public',
    contentType: 'application/json',
    token: token(),
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
  return index;
}

// Store one image file in Blob and return its public metadata.
export async function storeImage(bytes, filename, contentType) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${IMAGE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const blob = await put(key, bytes, {
    access: 'public',
    contentType: contentType || 'application/octet-stream',
    token: token(),
    addRandomSuffix: false,
  });
  return blob; // { url, pathname, ... }
}

// Delete an image blob and drop it from the index.
export async function deleteImage(id) {
  const index = await readIndex();
  const entry = index.images.find((img) => img.id === id);
  if (!entry) return { removed: false, index };
  try {
    await del(entry.url, { token: token() });
  } catch {
    // If the blob is already gone, still remove it from the index.
  }
  index.images = index.images.filter((img) => img.id !== id);
  await writeIndex(index);
  return { removed: true, index };
}

export async function clearAll() {
  const { blobs } = await list({ prefix: IMAGE_PREFIX, token: token() });
  await Promise.all(blobs.map((b) => del(b.url, { token: token() }).catch(() => {})));
  await writeIndex(emptyIndex());
  return true;
}
