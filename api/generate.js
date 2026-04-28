// api/generate.js
// Vercel API Route — proxy para a API da Anthropic
// Resolve o problema de CORS e guarda a API key no servidor

export default async function handler(req, res) {
  // Apenas aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('API Route error:', error);
    return res.status(500).json({ error: error.message });
  }
}
