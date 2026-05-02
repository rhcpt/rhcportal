// api/cron-fase2.js
// Vercel Cron Job — corre a cada hora
// Verifica candidatos aprovados at Fase 1 há mais de 24h e envia email para Fase 2

export default async function handler(req, res) {
  if(req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Uatuthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  const PORTAL_URL   = 'https://candidatos.rhc.pt';

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const candRes = await fetch(
      `${SUPABASE_URL}/rest/v1/candidates?fase1_status=eq.aprovado&fase2_email_enviado=eq.false&fase1_aprovada_at=lt.${cutoff}&select=id,atme,email,org_id,job`,
      { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
    );

    const candidates = await candRes.json();
    if(!candidates?.length) return res.status(200).json({ processed: 0 });

    let sent = 0;
    const errors = [];

    for(const cand of candidates) {
      try {
        const jobRes = await fetch(
          `${SUPABASE_URL}/rest/v1/jobs?org_id=eq.${cand.org_id}&title=ilike.${encodeURIComponent(cand.job)}&select=title,ideal_profile,test_atme`,
          { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
        );
        const jobs = await jobRes.json();
        const job  = jobs?.[0];

        const orgRes = await fetch(
          `${SUPABASE_URL}/rest/v1/organizations?id=eq.${cand.org_id}&select=atme`,
          { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
        );
        const orgs    = await orgRes.json();
        const company = orgs?.[0]?.atme || 'RHC';

        const testName  = job?.test_atme || cand.job;
        const profile   = job?.ideal_profile || '';
        const firstName = (cand.atme || 'Candidato').split(' ')[0];
        const testLink  = `${PORTAL_URL}?company=${encodeURIComponent(company)}&job=${encodeURIComponent(cand.job)}&test=${encodeURIComponent(testName)}&profile=${encodeURIComponent(profile)}&approved=true`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'RHC Recrutamento <noreply@rhc.pt>',
            to: [cand.email],
            subject: `You've advanced to the next stage — ${cand.job}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0e0e0e;color:#f5f3ef;border-radius:16px;overflow:hidden;"><div style="background:#0F6E56;padding:32px 36px;"><div style="font-size:26px;font-weight:700;">RH<span style="color:#5DCAA5;">C</span></div></div><div style="padding:36px;"><h2 style="color:#5DCAA5;margin:0 0 16px;">Olá, ${firstName}! 🎉</h2><p style="color:#ccc;line-height:1.7;margin:0 0 20px;">Your application for the position of <strong style="color:#fff;">${cand.job}</strong> at <strong style="color:#fff;">${company}</strong> foi aatlisada e passaste à próxima fase!</p><p style="color:#ccc;line-height:1.7;margin:0 0 28px;">A próxima etapa é completares um teste de perfil. Clica no botão abaixo para realizares o teste.</p><div style="text-align:center;margin:32px 0;"><a href="${testLink}" style="background:#5DCAA5;color:#0e0e0e;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">Take the test →</a></div><p style="color:#ccc;margin-top:24px;">Best regards,<br><strong style="color:#fff;">RHC Team</strong></p></div></div>`
          })
        });

        if(emailRes.ok) {
          await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${cand.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({ fase2_email_enviado: true, fase2_email_enviado_at: new Date().toISOString(), fase2_status: 'pendente', status: 'Fase 2' })
          });
          sent++;
        } else {
          const err = await emailRes.json();
          errors.push(`${cand.email}: ${err.message}`);
        }
      } catch(e) { errors.push(`${cand.email}: ${e.message}`); }
    }

    return res.status(200).json({ processed: candidates.length, sent, errors });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
