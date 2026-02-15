---
name: ingest-and-verify
description: Re-ingest test data and verify chunks in the database
disable-model-invocation: true
---

# Ingest and Verify

Re-run the ingestion pipeline against test data and verify the database state.

## Steps

1. Run ingestion against `apis.yml`:
   ```bash
   npm run ingest -- --all
   ```

2. Query the database to verify results:
   ```bash
   node -e "
     const Database = require('better-sqlite3');
     const db = new Database('alexandria.db');
     const apis = db.prepare('SELECT id, name FROM apis').all();
     const chunkCount = db.prepare('SELECT COUNT(*) as n FROM chunks').get();
     const ftsCount = db.prepare('SELECT COUNT(*) as n FROM chunks_fts').get();
     const vecCount = db.prepare('SELECT COUNT(*) as n FROM chunks_vec').get();
     console.log('APIs:', apis.length, apis.map(a => a.name));
     console.log('Chunks:', chunkCount.n, '| FTS:', ftsCount.n, '| Vec:', vecCount.n);
     if (chunkCount.n !== ftsCount.n || chunkCount.n !== vecCount.n) {
       console.error('ERROR: table counts mismatch!');
       process.exit(1);
     }
     console.log('All tables in sync.');
   "
   ```

3. Report:
   - Number of APIs indexed
   - Total chunks across all three tables
   - Any errors or count mismatches
