export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages, system } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'OpenRouter API key not configured' }); return; }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://clinical-dashboard.vercel.app',
        'X-Title': 'Clinical Dashboard'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'system', content: system },
          ...messages
        ],
        max_tokens: 1500,
        temperature: 0.3
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await response.json();
    if (data.error) { res.status(500).json({ error: data.error.message }); return; }
    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (e) {
    if (e.name === 'AbortError') {
      res.status(504).json({ error: '回應逾時，請稍後再試' });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
}
