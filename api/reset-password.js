// api/reset-password.js
// Vercel API Route — altera a password do utilizador usando a service role key
// A service role key tem permissão para alterar passwords sem autenticação

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, password } = body;

    if(!email || !password) return res.status(400).json({ error: 'Email e password são obrigatórios' });
    if(password.length < 6)  return res.status(400).json({ error: 'Password demasiado curta' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

    if(!SERVICE_KEY) return res.status(500).json({ error: 'Configuração em falta no servidor' });

    // Find user by email using admin API
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    const listData = await listRes.json();
    const user = listData.users?.[0];

    if(!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

    // Update password
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ password })
    });

    if(!updateRes.ok) {
      const err = await updateRes.json();
      return res.status(400).json({ error: err.message || 'Erro ao alterar password' });
    }

    return res.status(200).json({ success: true });
  } catch(e) {
    console.error('reset-password error:', e);
    return res.status(500).json({ error: e.message });
  }
}
