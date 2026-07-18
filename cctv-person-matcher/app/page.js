'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const CHUNK_SIZE = 4; // images per upload request (keeps each request under the function timeout)

function scoreClass(score) {
  if (score >= 0.6) return 'score hi';
  if (score >= 0.4) return 'score mid';
  return 'score';
}

export default function Home() {
  const [dbImages, setDbImages] = useState([]);
  const [dbInfo, setDbInfo] = useState({ provider: '', count: 0, facesTotal: 0 });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState('');

  const [queryFile, setQueryFile] = useState(null);
  const [queryPreview, setQueryPreview] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  const bulkInput = useRef(null);
  const queryInput = useRef(null);

  const loadDb = useCallback(async () => {
    try {
      const res = await fetch('/api/images', { cache: 'no-store' });
      const data = await res.json();
      setDbImages(data.images || []);
      setDbInfo({ provider: data.provider, count: data.count, facesTotal: data.facesTotal });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadDb();
  }, [loadDb]);

  async function handleBulk(files) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploading(true);
    setUploadError('');
    setProgress({ done: 0, total: list.length });

    for (let i = 0; i < list.length; i += CHUNK_SIZE) {
      const chunk = list.slice(i, i + CHUNK_SIZE);
      const form = new FormData();
      chunk.forEach((f) => form.append('files', f, f.name));
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setUploadError(err.error || `Upload failed (HTTP ${res.status}).`);
          break;
        }
      } catch (e) {
        setUploadError(e.message || 'Network error during upload.');
        break;
      }
      setProgress({ done: Math.min(i + CHUNK_SIZE, list.length), total: list.length });
      await loadDb();
    }
    setUploading(false);
  }

  async function handleSearch() {
    if (!queryFile) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    const form = new FormData();
    form.append('image', queryFile, queryFile.name);
    try {
      const res = await fetch('/api/search', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || `Search failed (HTTP ${res.status}).`);
      } else {
        setSearchResult(data);
        if (data.error) setSearchError(data.error);
      }
    } catch (e) {
      setSearchError(e.message || 'Network error during search.');
    }
    setSearching(false);
  }

  function pickQuery(file) {
    if (!file) return;
    setQueryFile(file);
    setSearchResult(null);
    setSearchError('');
    setQueryPreview(URL.createObjectURL(file));
  }

  async function clearAll() {
    if (!confirm('Delete every image in the database?')) return;
    await fetch('/api/images?all=true', { method: 'DELETE' });
    await loadDb();
    setSearchResult(null);
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="wrap">
      <h1>CCTV Person Matcher</h1>
      <p className="sub">
        Upload a bulk repository of CCTV frames as your database, then supply one image and find the
        frames most likely to show a similar person. Images and their face embeddings are stored in
        Vercel Blob.
      </p>

      {dbInfo.provider === 'mock' && (
        <div className="notice">
          <strong>Mock matching mode.</strong> The app is running with a placeholder embedding
          provider so you can test the pipeline. Matches are based on a hash of the image bytes, not
          real faces. Set <code>EMBEDDING_PROVIDER=replicate</code> plus your Replicate credentials
          to enable real face recognition.
        </div>
      )}

      <div className="grid">
        {/* ---------------- Database ---------------- */}
        <div className="card">
          <h2>1 · Build the database</h2>
          <div
            className="drop"
            onClick={() => bulkInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('drag');
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag');
              handleBulk(e.dataTransfer.files);
            }}
          >
            Drop CCTV images here, or click to select multiple files.
          </div>
          <input
            ref={bulkInput}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleBulk(e.target.files)}
          />

          {uploading && (
            <>
              <div className="bar">
                <div style={{ width: `${pct}%` }} />
              </div>
              <p className="muted">
                Processing {progress.done}/{progress.total} images ({pct}%)…
              </p>
            </>
          )}
          {uploadError && <p className="error">{uploadError}</p>}

          <div className="row">
            <span className="pill">{dbInfo.count} images</span>
            <span className="pill">{dbInfo.facesTotal} faces indexed</span>
            <span className="pill">provider: {dbInfo.provider || '…'}</span>
          </div>

          {dbImages.length > 0 && (
            <>
              <div className="gallery">
                {dbImages.map((img) => (
                  <div className="thumb" key={img.id} title={img.filename}>
                    <img src={img.url} alt={img.filename} loading="lazy" />
                    <span className="badge">{img.faceCount ?? 0}👤</span>
                  </div>
                ))}
              </div>
              <div className="row">
                <button className="danger" onClick={clearAll}>
                  Clear database
                </button>
              </div>
            </>
          )}
        </div>

        {/* ---------------- Search ---------------- */}
        <div className="card">
          <h2>2 · Find a similar person</h2>
          <div
            className="drop"
            onClick={() => queryInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('drag');
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag');
              pickQuery(e.dataTransfer.files[0]);
            }}
          >
            Drop the person image to search for, or click to choose one.
          </div>
          <input
            ref={queryInput}
            type="file"
            accept="image/*"
            onChange={(e) => pickQuery(e.target.files[0])}
          />

          {queryPreview && <img className="querypreview" src={queryPreview} alt="query" />}

          <div className="row">
            <button onClick={handleSearch} disabled={!queryFile || searching || dbInfo.count === 0}>
              {searching ? 'Searching…' : 'Search database'}
            </button>
            {dbInfo.count === 0 && <span className="muted">Add images to the database first.</span>}
          </div>
          {searchError && <p className="error">{searchError}</p>}

          {searchResult && (
            <>
              <p className="muted" style={{ marginTop: 16 }}>
                Searched {searchResult.databaseSize} images · threshold{' '}
                {searchResult.threshold} · {searchResult.matches.length} match
                {searchResult.matches.length === 1 ? '' : 'es'}.
              </p>
              <div className="results">
                {searchResult.matches.map((m) => (
                  <a className="match" key={m.id} href={m.url} target="_blank" rel="noreferrer">
                    <img src={m.url} alt={m.filename} loading="lazy" />
                    <div className="meta">
                      <span className={scoreClass(m.score)}>{(m.score * 100).toFixed(1)}%</span>
                      <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.filename}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              {searchResult.matches.length === 0 && searchResult.nearMisses?.length > 0 && (
                <p className="muted" style={{ marginTop: 12 }}>
                  No results above the threshold. Closest was{' '}
                  {(searchResult.nearMisses[0].score * 100).toFixed(1)}%. Lower{' '}
                  <code>MATCH_THRESHOLD</code> if you expected a match.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
