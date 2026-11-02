import { readFileSync, writeFileSync, appendFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8').replace(/^﻿/, ''));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = message => appendFileSync(join(root, 'logs', 'worker.log'), `${new Date().toISOString()} ${message}\n`);
async function rpc(action, extra = {}, timeout = 15000) {
  const response = await fetch(`${config.url}/functions/v1/local-ai-worker`, {
    method: 'POST', headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: config.token, p_action: action, ...extra }), signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`Queue HTTP ${response.status}`);
  return response.json();
}

// Keep the model in VRAM between requests: reloading costs ~10 s per answer.
// "Desligar IA" still unloads it explicitly.
const KEEP_ALIVE = '15m';
const STYLE =
  'Responda em português do Brasil, de forma correta e didática. Use texto simples, sem LaTeX ou Markdown; ' +
  'escreva frações como 2/3. Retorne apenas JSON no esquema fornecido.';

async function chat(messages, schema, signal, options = {}) {
  const response = await fetch('http://127.0.0.1:11435/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({
      model: config.model, stream: false, think: false, messages, format: schema, keep_alive: KEEP_ALIVE,
      options: { temperature: 0.3, num_ctx: 8192, num_predict: 3000, ...options },
    }),
  });
  if (!response.ok) throw new Error(`Inference HTTP ${response.status}`);
  const body = await response.json();
  log(`Generated ${body.eval_count ?? 0} tokens`);
  return JSON.parse(body.message.content);
}

// Sources first, then the request: small models follow the most recent text.
function userMessage(input) {
  const { web_sources: sources = [], ...rest } = input;
  const reference = sources.length
    ? sources.map((s, i) => `FONTE ${i + 1}: ${s.title}\n${s.excerpt}`).join('\n\n')
    : 'Nenhuma fonte encontrada: use apenas conhecimento escolar consolidado e seja conservador.';
  return `MATERIAL DE REFERÊNCIA (pesquisado na web para este pedido):\n${reference}\n\nPEDIDO DO ESTUDANTE (JSON):\n${JSON.stringify(rest)}`;
}

/**
 * Quiz self-check: generate a couple of spare questions, have the model answer
 * each one blind against the sources and keep the ones whose key matches.
 */
async function verifiedQuiz(job, signal) {
  const count = job.payload.input.count;
  const schema = structuredClone(job.payload.schema);
  const items = schema.properties.questions;
  items.minItems = items.maxItems = Math.min(10, count + 1);
  const system = { role: 'system', content: `${job.payload.instructions}\n${STYLE}` };
  const draft = await chat([system, { role: 'user', content: userMessage(job.payload.input) }], schema, signal);
  const questions = Array.isArray(draft.questions) ? draft.questions : [];
  if (questions.length <= count) return { ...draft, questions: questions.slice(0, count) };
  const check = await chat(
    [
      { role: 'system', content: `Você é um professor revisando um quiz. Para cada pergunta, escolha a alternativa correta (0 a 3) usando o material de referência e conhecimento consolidado. ${STYLE}` },
      {
        role: 'user',
        content: `${userMessage({ web_sources: job.payload.input.web_sources ?? [] })}\n\nQUIZ:\n${JSON.stringify(
          questions.map((q, i) => ({ n: i, pergunta: q.prompt, alternativas: q.options })),
        )}`,
      },
    ],
    {
      type: 'object', required: ['answers'],
      properties: { answers: { type: 'array', minItems: questions.length, maxItems: questions.length, items: { type: 'integer', minimum: 0, maximum: 3 } } },
    },
    signal,
    { temperature: 0, num_predict: 300 },
  ).catch(() => null);
  const answers = Array.isArray(check?.answers) ? check.answers : [];
  const agreed = questions.filter((q, i) => answers[i] === q.correct_index);
  const doubtful = questions.filter((q, i) => answers[i] !== q.correct_index);
  log(`Quiz check: ${agreed.length}/${questions.length} confirmed`);
  return { ...draft, questions: [...agreed, ...doubtful].slice(0, count) };
}

async function generate(job, signal) {
  if (job.payload.normalized?.kind === 'quiz' && job.payload.schema?.properties?.questions)
    return verifiedQuiz(job, signal);
  return chat(
    [
      { role: 'system', content: `${job.payload.instructions}\n${STYLE}` },
      { role: 'user', content: userMessage(job.payload.input) },
    ],
    job.payload.schema,
    signal,
  );
}

let running = true;
let activeController;
const heartbeat = setInterval(() => rpc('heartbeat').catch(() => log('Heartbeat unavailable')), 15000);
const stopCheck = setInterval(() => {
  if (existsSync(join(root, 'stop.flag'))) { running = false; activeController?.abort(); }
}, 500);
process.on('SIGTERM', () => { running = false; activeController?.abort(); });
process.on('SIGINT', () => { running = false; activeController?.abort(); });
writeFileSync(join(root, 'worker.pid'), String(process.pid));
log('Worker started');
try {
  await rpc('heartbeat');
  // Warm the model so the first student request doesn't pay the load time.
  fetch('http://127.0.0.1:11435/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, keep_alive: KEEP_ALIVE }) }).then(() => log('Model warm')).catch(() => log('Warm-up failed'));
  while (running) {
    try {
      // Long-poll: the server holds this request up to 20 s until a job arrives.
      const job = await rpc('claim', { p_wait: true }, 30000);
      if (!job) continue;
      log(`Generating ${job.payload.normalized.kind} with ${job.payload.input?.web_sources?.length ?? 0} sources`);
      activeController = new AbortController();
      const timeout = setTimeout(() => activeController.abort(), 300000);
      let result = null;
      let error = null;
      try {
        result = await generate(job, activeController.signal);
      } catch {
        error = running ? 'Não foi possível concluir a geração local. Tente um pedido menor.' : 'A IA foi desligada para liberar o computador.';
        log('Generation failed or stopped');
      } finally { clearTimeout(timeout); activeController = undefined; }
      for (let attempt = 0; attempt < 3; attempt++) {
        try { await rpc('finish', { p_id: job.id, p_lease: job.lease, p_result: result, p_error: error }); break; }
        catch { log('Result delivery retry'); await sleep(2000); }
      }
    } catch { log('Connection unavailable; retrying'); await sleep(5000); }
  }
} finally {
  clearInterval(heartbeat); clearInterval(stopCheck);
  await rpc('offline').catch(() => {});
  await fetch('http://127.0.0.1:11435/api/generate', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ model: config.model, keep_alive: 0 }), signal: AbortSignal.timeout(5000) }).catch(() => {});
  if (existsSync(join(root, 'worker.pid'))) unlinkSync(join(root, 'worker.pid'));
  log('Worker stopped');
}
