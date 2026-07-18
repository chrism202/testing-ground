# CCTV Person Matcher

Upload a bulk repository of CCTV images to use as a database, then supply a
single image and the tool ranks the stored frames by how likely they are to
contain a person similar to the one you provided.

- **Framework:** Next.js (App Router), deployable to Vercel with zero config.
- **Database:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) holds
  both the raw CCTV images *and* a single JSON index of their face embeddings.
- **Matching:** an external face-recognition API (Replicate by default) turns
  each image into face embedding vectors; search is cosine similarity over
  those vectors.

---

## How it works

```
                        ┌────────────────────── Vercel Blob ──────────────────────┐
 bulk upload ──▶ /api/upload ──▶ store image ──┐                                    │
                    │                           ├─▶ cctv-images/*  (raw frames)     │
                    └─▶ face-embed each image ──┘                                    │
                                     │                                               │
                                     └─────────▶ cctv-index/index.json (embeddings)  │
                        └──────────────────────────────────────────────────────────┘

 query image ──▶ /api/search ──▶ face-embed query ──▶ cosine-similarity vs index ──▶ ranked matches
```

- Each database image can contain **multiple faces**; every face gets its own
  vector. An image's match score is its best-matching face against the query.
- Search returns everything at or above `MATCH_THRESHOLD`, capped at
  `MATCH_TOP_K`, plus a few "near misses" to help you calibrate the threshold.

---

## Local setup

```bash
cd cctv-person-matcher
npm install
cp .env.example .env.local     # then fill in the values (see below)
npm run dev                    # http://localhost:3000
```

### Environment variables

| Variable                | Required | Purpose |
|-------------------------|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | yes      | Vercel Blob access. Auto-injected on Vercel once you add a Blob store; for local dev copy it from the store's `.env.local` in the dashboard. |
| `EMBEDDING_PROVIDER`    | no       | `replicate` (default, real face matching) or `mock` (fake, for testing the pipeline with no account). |
| `REPLICATE_API_TOKEN`   | if replicate | From https://replicate.com/account/api-tokens |
| `REPLICATE_FACE_MODEL`  | if replicate | A face-embedding model reference, `owner/name` or `owner/name:version`. |
| `MATCH_THRESHOLD`       | no       | Cosine cutoff for a "match" (default `0.35`). Tune per model. |
| `MATCH_TOP_K`           | no       | Max results returned (default `10`). |

#### Try it with no account first

Set `EMBEDDING_PROVIDER=mock` and you can upload images and run searches
immediately — the pipeline (Blob storage, indexing, ranking UI) works
end-to-end. Mock embeddings are derived from a hash of the image bytes, so
identical images match perfectly and different images don't; it is **not** real
face recognition. Switch to `replicate` for actual matching.

#### Picking a Replicate face model

`REPLICATE_FACE_MODEL` must point at a model that takes an `image` input and
returns a face embedding vector (ArcFace / InsightFace-style models are ideal,
and models that return one embedding per detected face work best for busy CCTV
frames). Paste its full `owner/name:version` reference. The response parser in
`lib/embeddings.js` accepts the common output shapes (a vector, an array of
vectors, or an array of `{ embedding, bbox }` objects); if your chosen model
uses a different input key or output shape, that one file is the only thing to
adjust.

---

## Deploy to Vercel

1. Push this folder to a Git repo and import it into Vercel (set the project
   root to `cctv-person-matcher` if it lives in a monorepo).
2. In the project, **Storage → Create → Blob**. This injects
   `BLOB_READ_WRITE_TOKEN` automatically.
3. Add the embedding env vars under **Settings → Environment Variables**:
   `EMBEDDING_PROVIDER=replicate`, `REPLICATE_API_TOKEN`, `REPLICATE_FACE_MODEL`
   (and optionally `MATCH_THRESHOLD` / `MATCH_TOP_K`).
4. Deploy.

`vercel.json` raises the upload/search function timeout to 60s (Pro plan). On
the Hobby plan the limit is 10s — keep upload chunks small (the UI already
sends images in batches of 4) and expect the first request to a cold Replicate
model to be slow.

---

## API

| Route | Method | Body | Returns |
|-------|--------|------|---------|
| `/api/upload` | POST | multipart `files[]` | per-file result + new total |
| `/api/search` | POST | multipart `image` | ranked `matches[]` with scores |
| `/api/images` | GET  | –                  | database listing + stats |
| `/api/images?id=…` | DELETE | – | remove one image |
| `/api/images?all=true` | DELETE | – | clear the database |

---

## Notes on scale and accuracy

- The index is a single JSON blob loaded into memory per search — great up to
  the low tens of thousands of faces. Beyond that, move the vectors into a
  dedicated vector store (e.g. Vercel Postgres + `pgvector`); only
  `lib/blob.js` and `lib/similarity.js` would change.
- Bulk uploads do a read-modify-write of the index per request, so the UI
  sends chunks **sequentially** to avoid clobbering it. Don't fire parallel
  uploads from multiple tabs.
- Accuracy is entirely a function of the face model you choose and the
  `MATCH_THRESHOLD` you tune. Watch the reported "near miss" scores to find the
  right cutoff for your model and camera.

## Responsible use

This tool performs facial similarity matching. Use it only on imagery you are
authorised to process, in line with the privacy and biometric-data laws that
apply to you (e.g. GDPR/UK GDPR, BIPA, CCPA). Face matching is probabilistic —
treat results as leads to review, never as positive identification.
