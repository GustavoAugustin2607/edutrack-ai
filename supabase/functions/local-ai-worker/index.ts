import { createClient } from '@supabase/supabase-js';
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
// Private machine authentication uses a random, narrowly scoped worker capability.
// Browser sessions are not accepted. The SQL RPC validates its SHA-256 hash.
// "claim" long-polls: it waits up to CLAIM_WAIT_MS for a job, so the PC picks
// up requests almost instantly while making few invocations.
const CLAIM_WAIT_MS = 20_000;
const CLAIM_STEP_MS = 500;
Deno.serve(async request => {
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return reply(405, { error: 'POST required' });
  try {
    if (!request.body) return reply(400, { error: 'Missing body' });
    const reader = request.body.getReader();
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 130000) { await reader.cancel(); return reply(413, { error: 'Too large' }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body.p_token !== 'string' || !/^[a-f0-9]{64}$/.test(body.p_token)) return reply(401, { error: 'Unauthorized' });
    if (!['heartbeat','offline','claim','finish'].includes(body.p_action)) return reply(400, { error: 'Invalid action' });
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const call = () => service.rpc('local_ai_worker', {
      p_token: body.p_token, p_action: body.p_action, p_id: body.p_id ?? null,
      p_lease: body.p_lease ?? null, p_result: body.p_result ?? null, p_error: body.p_error ?? null,
    });
    const wait = body.p_action === 'claim' && body.p_wait === true;
    const deadline = Date.now() + CLAIM_WAIT_MS;
    let { data, error } = await call();
    while (wait && !error && !data && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, CLAIM_STEP_MS));
      ({ data, error } = await call());
    }
    if (error) return reply(error.code === '42501' ? 401 : 400, { error: 'Worker request refused' });
    return reply(200, data);
  } catch { return reply(400, { error: 'Invalid request' }); }
});
