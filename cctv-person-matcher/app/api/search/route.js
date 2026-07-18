import { NextResponse } from 'next/server';
import { readIndex } from '../../../lib/blob';
import { embedImage } from '../../../lib/embeddings';
import { bestFaceSimilarity } from '../../../lib/similarity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Accept one query image, embed the face in it, then rank every image in the
// database by how similar its best-matching face is to the query.
export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = form.get('image');
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
    return NextResponse.json({ error: 'No query image provided.' }, { status: 400 });
  }

  const threshold = parseFloat(process.env.MATCH_THRESHOLD ?? '0.35');
  const topK = parseInt(process.env.MATCH_TOP_K ?? '10', 10);

  let queryFaces;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    queryFaces = await embedImage(bytes, file.name || 'query');
  } catch (err) {
    return NextResponse.json(
      { error: `Could not embed query image: ${err.message || err}` },
      { status: 500 }
    );
  }

  if (!queryFaces || queryFaces.length === 0) {
    return NextResponse.json(
      { error: 'No face was detected in the query image.', matches: [] },
      { status: 200 }
    );
  }

  // Use the first (typically most prominent) detected face as the query.
  const queryEmbedding = queryFaces[0].embedding || queryFaces[0];

  const index = await readIndex();

  const scored = index.images
    .map((img) => {
      const { score, faceIndex } = bestFaceSimilarity(queryEmbedding, img.faces);
      return {
        id: img.id,
        filename: img.filename,
        url: img.url,
        uploadedAt: img.uploadedAt,
        faceCount: img.faceCount,
        score,
        matchedFaceIndex: faceIndex,
      };
    })
    .filter((r) => r.score > -1)
    .sort((a, b) => b.score - a.score);

  const matches = scored.filter((r) => r.score >= threshold).slice(0, topK);

  return NextResponse.json({
    queryFaceCount: queryFaces.length,
    threshold,
    databaseSize: index.images.length,
    matches,
    // Best few even if below threshold, to help calibrate.
    nearMisses: scored.filter((r) => r.score < threshold).slice(0, 3),
  });
}
