import { NextResponse } from 'next/server';
import { readIndex, deleteImage, clearAll } from '../../../lib/blob';
import { activeProvider } from '../../../lib/embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// List the database contents (without shipping the raw embedding vectors).
export async function GET() {
  const index = await readIndex();
  const images = index.images.map((img) => ({
    id: img.id,
    filename: img.filename,
    url: img.url,
    size: img.size,
    uploadedAt: img.uploadedAt,
    faceCount: img.faceCount,
    error: img.error || null,
  }));
  return NextResponse.json({
    provider: activeProvider(),
    updatedAt: index.updatedAt,
    count: images.length,
    facesTotal: images.reduce((n, i) => n + (i.faceCount || 0), 0),
    images,
  });
}

// Delete one image (?id=...) or clear the whole database (?all=true).
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('all') === 'true') {
    await clearAll();
    return NextResponse.json({ cleared: true });
  }
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Provide ?id= or ?all=true.' }, { status: 400 });
  }
  const { removed } = await deleteImage(id);
  return NextResponse.json({ removed });
}
