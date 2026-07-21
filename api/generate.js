// Vercel serverless function — proxies requests to the Anthropic API so the
// real API key stays server-side and is never exposed to the browser.
//
// Set ANTHROPIC_API_KEY in Vercel's project settings (Settings > Environment
// Variables), not in this file.
//
// The app's two AI features (AI Plan Generator, Drill Detail) should call
// this endpoint — POST /api/generate — with the same {system, messages,
// max_tokens} shape they already send to Anthropic directly today.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
    }

  const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
          return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY — set it in Vercel project settings.' });
    }

  const { system, messages, max_tokens } = req.body || {};
    if (!messages) {
          return res.status(400).json({ error: 'Missing "messages" in request body.' });
    }

  try {
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                          'Content-Type': 'application/json',
                          'x-api-key': apiKey,
                          'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                          model: 'claude-sonnet-4-6',
                          max_tokens: max_tokens || 1000,
                          system: system || undefined,
                          messages
                })
        });

      const data = await upstream.json();
        if (!upstream.ok) {
                return res.status(upstream.status).json({ error: data.error || 'Anthropic API error', detail: data });
        }
        return res.status(200).json(data);
  } catch (err) {
        return res.status(500).json({ error: 'Proxy request failed', detail: String(err) });
  }
}
