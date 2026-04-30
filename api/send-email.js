// api/send-email.js
// Vercel API Route — proxy para o Resend
// Resolve o problema de CORS ao enviar emails do browser

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) console.error('Resend error:', JSON.stringify(data));
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('send-email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
