import { createClient } from '@supabase/supabase-js';
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
// Creates an already-confirmed account so sign-up doesn't depend on the
// rate-limited default e-mail service. Same trust level as turning off
// "Confirm email" in Supabase Auth: the address is not verified.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply(405, { message: 'Use POST.' });
  try {
    const text = await request.text();
    if (text.length > 4000) return reply(413, { message: 'Pedido grande demais.' });
    const body = JSON.parse(text);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const name = typeof body?.full_name === 'string' ? body.full_name.trim().slice(0, 40) : '';
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(email)) return reply(400, { message: 'Informe um e-mail válido.' });
    if (password.length < 8 || password.length > 72) return reply(400, { message: 'Sua senha precisa ter entre 8 e 72 caracteres.' });
    if (name.length < 2) return reply(400, { message: 'Informe seu nome para criar a conta.' });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) {
      const exists = /already|registered|exists/i.test(error.message);
      return reply(exists ? 409 : 400, {
        message: exists ? 'Este e-mail já tem conta. Use "Já tenho conta" para entrar.' : 'Não foi possível criar a conta agora.',
      });
    }
    return reply(200, { ok: true });
  } catch {
    return reply(400, { message: 'Pedido inválido.' });
  }
});
