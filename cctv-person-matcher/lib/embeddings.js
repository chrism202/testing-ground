// Face-embedding provider abstraction.
//
// The rest of the app only calls `embedImage(bytes, filename)` and gets back a
// normalized array of faces: [{ embedding: number[], bbox?: number[] }].
// Swapping face-recognition backends means implementing one function here.

import Replicate from 'replicate';

function mimeFromFilename(filename = '') {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'image/jpeg';
  }
}

function toDataUri(bytes, filename) {
  const b64 = Buffer.from(bytes).toString('base64');
  return `data:${mimeFromFilename(filename)};base64,${b64}`;
}

// ---------------------------------------------------------------------------
// Mock provider — deterministic pseudo-embeddings so the pipeline can be
// exercised end-to-end with no external account. NOT real face matching:
// identical images match perfectly, different images differ, and that's it.
// ---------------------------------------------------------------------------
const MOCK_DIM = 128;

function hashBytes(bytes) {
  // FNV-1a over the raw bytes -> 32-bit seed.
  let h = 0x811c9dc5;
  const view = Buffer.from(bytes);
  for (let i = 0; i < view.length; i++) {
    h ^= view[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mockEmbed(bytes) {
  const rng = mulberry32(hashBytes(bytes));
  const vec = new Array(MOCK_DIM);
  let norm = 0;
  for (let i = 0; i < MOCK_DIM; i++) {
    const v = rng() * 2 - 1;
    vec[i] = v;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < MOCK_DIM; i++) vec[i] /= norm;
  return [{ embedding: vec, bbox: null }];
}

// ---------------------------------------------------------------------------
// Replicate provider — real face embeddings from a hosted model.
// ---------------------------------------------------------------------------

// Normalize whatever shape a face model returns into [{ embedding, bbox }].
function normalizeFaces(output) {
  if (output == null) return [];

  // Some models return a JSON string.
  if (typeof output === 'string') {
    try {
      output = JSON.parse(output);
    } catch {
      return [];
    }
  }

  const isNumberArray = (x) =>
    Array.isArray(x) && x.length > 0 && x.every((n) => typeof n === 'number');

  // A single embedding vector.
  if (isNumberArray(output)) {
    return [{ embedding: output, bbox: null }];
  }

  // An array of embedding vectors, or an array of face objects.
  if (Array.isArray(output)) {
    const faces = [];
    for (const item of output) {
      if (isNumberArray(item)) {
        faces.push({ embedding: item, bbox: null });
      } else if (item && typeof item === 'object') {
        const emb = item.embedding || item.embeddings || item.vector || item.feature;
        if (isNumberArray(emb)) {
          faces.push({ embedding: emb, bbox: item.bbox || item.box || item.bounding_box || null });
        }
      }
    }
    return faces;
  }

  // An object wrapper.
  if (typeof output === 'object') {
    if (isNumberArray(output.embedding)) {
      return [{ embedding: output.embedding, bbox: output.bbox || null }];
    }
    if (Array.isArray(output.embeddings)) {
      return normalizeFaces(output.embeddings);
    }
    if (Array.isArray(output.faces)) {
      return normalizeFaces(output.faces);
    }
  }

  return [];
}

async function replicateEmbed(bytes, filename) {
  const token = process.env.REPLICATE_API_TOKEN;
  const model = process.env.REPLICATE_FACE_MODEL;
  if (!token) throw new Error('REPLICATE_API_TOKEN is not set.');
  if (!model) throw new Error('REPLICATE_FACE_MODEL is not set (owner/name or owner/name:version).');

  const replicate = new Replicate({ auth: token });
  const dataUri = toDataUri(bytes, filename);

  // Most face models take the image under an "image" input key. If the model
  // you pick uses a different key, adjust here.
  const output = await replicate.run(model, { input: { image: dataUri } });
  return normalizeFaces(output);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function embedImage(bytes, filename) {
  const provider = (process.env.EMBEDDING_PROVIDER || 'replicate').toLowerCase();
  if (provider === 'mock') return mockEmbed(bytes);
  return replicateEmbed(bytes, filename);
}

export function activeProvider() {
  return (process.env.EMBEDDING_PROVIDER || 'replicate').toLowerCase();
}
