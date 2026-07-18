// Vector math for comparing face embeddings.

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Given a query face embedding and an image's list of face embeddings,
// return the highest similarity (the best-matching face in that image).
export function bestFaceSimilarity(queryEmbedding, faces) {
  let best = -1;
  let bestIdx = -1;
  if (!Array.isArray(faces)) return { score: best, faceIndex: bestIdx };
  faces.forEach((face, i) => {
    const emb = face && face.embedding ? face.embedding : face;
    const score = cosineSimilarity(queryEmbedding, emb);
    if (score > best) {
      best = score;
      bestIdx = i;
    }
  });
  return { score: best, faceIndex: bestIdx };
}
