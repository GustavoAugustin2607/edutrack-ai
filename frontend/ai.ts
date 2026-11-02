import { supabase } from './repository';

export type AIKind = 'quiz' | 'flashcards' | 'plan' | 'explain';
export type AIDifficulty = 'basic' | 'intermediate' | 'advanced';
export type QuizDraft = {
  title: string;
  questions: Array<{
    prompt: string;
    options: [string, string, string, string];
    correct_index: number;
    explanation: string;
  }>;
};
export type FlashcardDraft = {
  cards: Array<{ question: string; answer: string }>;
};
export type PlanDraft = {
  summary: string;
  recommendations: Array<{
    task_id: string;
    rationale: string;
    suggested_minutes: number;
  }>;
};
export type ExplainDraft = {
  title: string;
  answer: string;
  checkpoints: string[];
};
export type StudyAIData = QuizDraft | FlashcardDraft | PlanDraft | ExplainDraft;
export type StudyAIResult = {
  version: 1;
  request_id: string;
  kind: AIKind;
  generated_at: string;
  based_on_revision: number;
  data: StudyAIData;
  warnings: string[];
  sources?: Array<{ title: string; url: string }>;
};

type StudyAIRequest = {
  kind: AIKind;
  subject_id: string | null;
  task_ids: string[];
  source_text: string;
  options: {
    count: number;
    difficulty: AIDifficulty;
    days: number;
    start_date: string;
    timezone: string;
  };
};

function messageFromFunctionError(error: unknown) {
  const fallback =
    error instanceof Error ? error.message : 'O Tutor IA não respondeu.';
  const context = (error as { context?: unknown })?.context;
  if (!(context instanceof Response)) return Promise.resolve(fallback);
  return context
    .clone()
    .json()
    .then((body: unknown) =>
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as { message?: unknown }).message === 'string'
        ? (body as { message: string }).message
        : fallback,
    )
    .catch(() => fallback);
}

export async function generateStudyAI(
  request: StudyAIRequest,
  signal?: AbortSignal,
) {
  if (!supabase)
    throw new Error('A conexão segura com o Tutor IA não está disponível.');
  type Pending = { status: 'pending'; request_id: string };
  const first = await supabase.functions.invoke<StudyAIResult | Pending>(
    'study-ai',
    {
      body: {
        version: 1,
        request_id: crypto.randomUUID(),
        ...request,
      },
      signal,
    },
  );
  if (first.error) throw new Error(await messageFromFunctionError(first.error));
  let data = first.data;
  const deadline = Date.now() + 6 * 60 * 1000;
  while (data && 'status' in data && data.status === 'pending') {
    if (Date.now() > deadline) throw new Error('A geração demorou mais do que o esperado. Tente novamente.');
    const requestId = data.request_id;
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 300);
      signal?.addEventListener('abort', abort, { once: true });
    });
    const polled = await supabase.functions.invoke<StudyAIResult | Pending>('study-ai', {
      body: { action: 'local_status', request_id: requestId }, signal,
    });
    data = polled.data;
    if (polled.error) throw new Error(await messageFromFunctionError(polled.error));
  }
  if (!data || !('version' in data) || data.version !== 1 || data.kind !== request.kind)
    throw new Error('O Tutor IA devolveu uma resposta incompatível.');
  return data;
}
