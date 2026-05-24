const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  try {
    const store = getStore({ name: 'qa-logs', consistency: 'strong' });

    // GET — log listesini getir
    if (event.httpMethod === 'GET') {
      const { blobs } = await store.list();
      
      const logs = await Promise.all(
        blobs
          .sort((a, b) => b.key.localeCompare(a.key))
          .slice(0, 100)
          .map(async (blob) => {
            const data = await store.get(blob.key, { type: 'json' });
            return data;
          })
      );

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ logs: logs.filter(Boolean) })
      };
    }

    // POST — yeni log kaydet
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const timestamp = Date.now();
      const key = 'log_' + timestamp;

      const entry = {
        id: key,
        timestamp,
        date: new Date(timestamp).toISOString(),
        verdict: body.verdict,
        score: body.score || 0,
        textPreview: (body.textPreview || '').slice(0, 150),
        contentType: body.contentType || 'Новость',
        errorCount: body.errorCount || 0,
        categories: body.categories || []
      };

      await store.setJSON(key, entry);

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: true, id: key })
      };
    }

    // DELETE — log sil
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (id) await store.delete(id);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };

  } catch (err) {
    console.error('Log error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
