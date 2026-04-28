// api/generate.js
// Vercel API Route — proxy para a API da Anthropic

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body correctly whether it arrives as string or object
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: body.model || 'claude-opus-4-5',
        max_tokens: body.max_tokens || 8000,
        messages: body.messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', JSON.stringify(data));
    }

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('API Route error:', error);
    return res.status(500).json({ error: error.message });
  }
}
