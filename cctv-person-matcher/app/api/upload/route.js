import { NextResponse } from 'next/server';
import { storeImage, readIndex, writeIndex } from '../../../lib/blob';
import { embedImage, activeProvider } from '../../../lib/embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bulk-upload a chunk of CCTV images. For each image we:
//   1. store the raw file in Vercel Blob,
//   2. compute its face embedding(s),
//   3. append an entry to the JSON index (read-modify-write once per request).
//
// Send images in sequential chunks from the client to avoid clobbering the
// index (see the UI in app/page.js).
export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is not configured.' },
      { status: 500 }
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f) => typeof f === 'object' && 'arrayBuffer' in f);
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
  }

  const index = await readIndex();
  const results = [];

  for (const file of files) {
    const filename = file.name || 'image';
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const blob = await storeImage(bytes, filename, file.type);

      let faces = [];
      let faceError = null;
      try {
        faces = await embedImage(bytes, filename);
      } catch (err) {
        faceError = err.message || 'embedding failed';
      }

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        filename,
        url: blob.url,
        pathname: blob.pathname,
        size: bytes.length,
        contentType: file.type || null,
        uploadedAt: new Date().toISOString(),
        provider: activeProvider(),
        faceCount: faces.length,
        faces,
        error: faceError,
      };
      index.images.push(entry);
      results.push({
        filename,
        url: blob.url,
        faceCount: faces.length,
        error: faceError,
      });
    } catch (err) {
      results.push({ filename, error: err.message || 'upload failed' });
    }
  }

  await writeIndex(index);

  return NextResponse.json({
    uploaded: results.filter((r) => !r.error || r.faceCount >= 0).length,
    total: index.images.length,
    results,
  });
}
