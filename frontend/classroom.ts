import {
  colors,
  day,
  id,
  type Workspace,
} from './model';
const SCOPES =
  'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly';
type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  scope?: string;
};
type GoogleAPI = {
  accounts: {
    oauth2: {
      initTokenClient: (x: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback: (e: { type: string }) => void;
      }) => { requestAccessToken: (o: { prompt: string }) => void };
      revoke: (token: string, callback: () => void) => void;
      hasGrantedAnyScope?: (response: TokenResponse, ...scopes: string[]) => boolean;
    };
  };
};
declare global {
  interface Window {
    google?: GoogleAPI;
  }
}
let token = '',
  expires = 0,
  scriptPromise: Promise<void> | null = null;
export function warmGoogle() {
  if (window.google) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(
        new Error(
          'Não foi possível carregar a conexão com o Google. Verifique a rede.',
        ),
      );
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export async function connectGoogle(clientId: string) {
  if (!clientId.trim().endsWith('.apps.googleusercontent.com'))
    throw new Error(
      'Informe o Client ID OAuth do Google nas configurações da integração.',
    );
  if (!window.google) {
    await warmGoogle();
    throw new Error(
      'Google carregado. Clique em conectar novamente para abrir a autorização.',
    );
  }
  await new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) {
          const reasons: Record<string, string> = {
            access_denied: 'Você recusou a permissão na janela do Google.',
            admin_policy_enforced:
              'O administrador da sua instituição bloqueou o acesso ao Classroom para apps. Peça liberação ao suporte de TI.',
            org_internal:
              'Este app é interno da organização: entre com a conta institucional dona do projeto Google Cloud.',
          };
          reject(
            new Error(
              reasons[r.error ?? ''] ??
                `A autorização do Google não foi concluída${r.error ? ` (${r.error})` : ''}.`,
            ),
          );
          return;
        }
        // Granular consent may report scopes in other forms; only refuse when
        // Google says nothing Classroom-related was granted. A missing scope
        // still surfaces later as a 403 from the Classroom API.
        const granted = (r.scope ?? '').split(/[\s,]+/).filter(Boolean);
        const official = window.google!.accounts.oauth2.hasGrantedAnyScope?.(
          r,
          ...SCOPES.split(' '),
        );
        if (granted.length && official === false && !granted.some(s => s.includes('classroom'))) {
          reject(
            new Error(
              'Faltou marcar as permissões. Na janela do Google, marque as duas caixas do Classroom (turmas e atividades) antes de continuar.',
            ),
          );
          return;
        }
        token = r.access_token;
        expires = Date.now() + (r.expires_in ?? 3600) * 1000;
        resolve();
      },
      error_callback: () =>
        reject(
          new Error(
            'A janela do Google foi fechada ou bloqueada. Tente conectar novamente.',
          ),
        ),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}
async function getAll<T>(
  path: string,
  key: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const rows: T[] = [];
  let next = '';
  do {
    const url = new URL('https://classroom.googleapis.com/v1/' + path);
    Object.entries({
      ...params,
      pageSize: '100',
      ...(next ? { pageToken: next } : {}),
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (response.status !== 429 && response.status < 500) break;
      if (attempt < 2)
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
    if (!response?.ok) {
      if (response?.status === 401) {
        token = '';
        throw new Error('A autorização expirou. Reconecte sua conta Google.');
      }
      throw new Error(
        response?.status === 403
          ? 'O Google não liberou esta leitura. Reconecte e marque as duas permissões do Classroom; se persistir, confira se a Classroom API está ativa e as regras da instituição.'
          : 'Não foi possível sincronizar o Classroom. Nenhum dado importado foi alterado.',
      );
    }
    const body = (await response.json()) as Record<string, unknown>;
    rows.push(...((body[key] ?? []) as T[]));
    next = (body.nextPageToken as string) ?? '';
  } while (next);
  return rows;
}
type Course = {
  id: string;
  name: string;
  description?: string;
  section?: string;
};
type CourseWork = {
  id: string;
  title: string;
  description?: string;
  alternateLink?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number; seconds?: number };
};
type Submission = { courseWorkId: string; state: string };
export function safeGoogleUrl(url?: string) {
  try {
    const u = new URL(url ?? '');
    return u.protocol === 'https:' &&
      (u.hostname === 'classroom.google.com' ||
        u.hostname === 'drive.google.com')
      ? u.href
      : '';
  } catch {
    return '';
  }
}
export async function syncClassroom(state: Workspace) {
  if (!token || Date.now() >= expires)
    throw new Error('Conecte sua conta Google para sincronizar.');
  const courses = await getAll<Course>('courses', 'courses', {
    studentId: 'me',
    courseStates: 'ACTIVE',
  });
  const subjects = [...state.subjects],
    tasks = [...state.tasks];
  let imported = 0;
  for (const course of courses) {
    let subject = subjects.find((s) => s.google_id === course.id);
    if (!subject) {
      subject = {
        id: id(),
        name: course.name,
        teacher: '',
        hours: 60,
        description: course.description ?? course.section ?? '',
        color: colors[subjects.length % colors.length],
        start_date: day(),
        end_date: '',
        archived: false,
        google_id: course.id,
      };
      subjects.push(subject);
    }
    const coursework = await getAll<CourseWork>(
      `courses/${encodeURIComponent(course.id)}/courseWork`,
      'courseWork',
    );
    const submissions = await getAll<Submission>(
      `courses/${encodeURIComponent(course.id)}/courseWork/-/studentSubmissions`,
      'studentSubmissions',
      { userId: 'me' },
    );
    for (const item of coursework) {
      const google_id = `${course.id}:${item.id}`,
        existing = tasks.findIndex((t) => t.google_id === google_id);
      let due_date = '';
      if (item.dueDate) {
        const d = item.dueDate,
          time = item.dueTime;
        due_date = day(
          new Date(
            Date.UTC(
              d.year,
              d.month - 1,
              d.day,
              time?.hours ?? 0,
              time?.minutes ?? 0,
              time?.seconds ?? 0,
            ),
          ),
        );
      }
      const external = {
        title: item.title,
        due_date,
        google_url: safeGoogleUrl(item.alternateLink),
        google_state:
          submissions.find((s) => s.courseWorkId === item.id)?.state ??
          'UNKNOWN',
      };
      if (existing >= 0) {
        tasks[existing] = { ...tasks[existing], ...external };
      } else {
        tasks.push({
          id: id(),
          subject_id: subject.id,
          description: item.description ?? '',
          ...external,
          status: 'todo',
          priority: 'medium',
          estimated_minutes: 25,
          awarded: false,
          created_at: new Date().toISOString(),
          google_id,
        });
        imported++;
      }
    }
  }
  return { subjects, tasks, imported, courses: courses.length };
}
export async function disconnectGoogle() {
  if (token && window.google)
    await new Promise<void>((resolve) =>
      window.google!.accounts.oauth2.revoke(token, () => resolve()),
    );
  token = '';
  expires = 0;
}

export function clearGoogleToken() {
  token = '';
  expires = 0;
}
