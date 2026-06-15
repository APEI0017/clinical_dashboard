// /api/ai.js
// 統一 AI 呼叫介面，支援 Gemini / Claude / OpenAI
// API key 存在 Vercel 環境變數，不暴露前端

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, model, prompt, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '內容不能為空' });
  }

  try {
    let result;
    switch (provider) {
      case 'gemini':
        result = await callGemini(model || 'gemini-2.5-flash-lite', prompt, content);
        break;
      case 'claude':
        result = await callClaude(model || 'claude-haiku-4-5-20251001', prompt, content);
        break;
      case 'openai':
        result = await callOpenAI(model || 'gpt-4o-mini', prompt, content);
        break;
      default:
        return res.status(400).json({ error: '不支援的 AI 供應商' });
    }
    return res.status(200).json({ result });
  } catch (e) {
    console.error('AI API error:', e);
    return res.status(500).json({ error: e.message });
  }
}

// ── Gemini ──（改用 v1，不用 v1beta）
async function callGemini(model, prompt, content) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY 未設定');

  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt + '\n\n' + content }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error('Gemini error: ' + t);
  }

  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Claude ──
async function callClaude(model, prompt, content) {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) throw new Error('CLAUDE_API_KEY 未設定');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt + '\n\n' + content }]
    })
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error('Claude error: ' + t);
  }

  const data = await r.json();
  return data.content?.[0]?.text || '';
}

// ── OpenAI ──
async function callOpenAI(model, prompt, content) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY 未設定');

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt + '\n\n' + content }],
      temperature: 0.3,
      max_tokens: 4096
    })
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error('OpenAI error: ' + t);
  }

  const data = await r.json();
  return data.choices?.[0]?.message?.content || '';
}
