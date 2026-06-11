export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages, system } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'OpenRouter API key not configured' }); return; }

  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free'
  ];

  for (const model of models) {
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
          model,
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
      if (data.error) continue;
      const text = data.choices?.[0]?.message?.content || '';
      if (!text) continue;
      res.status(200).json({ content: [{ type: 'text', text }] });
      return;
    } catch (e) {
      continue;
    }
  }

  res.status(500).json({ error: '所有模型目前無法使用，請稍後再試' });
}
