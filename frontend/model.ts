import { levelInfo, totalXP } from './game';
export type Subject = {
  id: string;
  name: string;
  teacher: string;
  hours: number;
  description: string;
  color: string;
  start_date: string;
  end_date: string;
  archived: boolean;
  google_id?: string;
};
export type Task = {
  id: string;
  title: string;
  subject_id: string;
  description: string;
  due_date: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'high' | 'medium' | 'low';
  estimated_minutes: number;
  awarded: boolean;
  created_at: string;
  completed_at?: string;
  google_id?: string;
  google_url?: string;
  google_state?: string;
};
export type Session = {
  id: string;
  task_id: string;
  subject_id: string;
  minutes: number;
  created_at: string;
};
export type Flashcard = {
  id: string;
  subject_id: string;
  question: string;
  answer: string;
  stage: number;
  due_date: string;
  reviews: number;
};
export type Block = {
  id: string;
  task_id: string;
  date: string;
  time: string;
  minutes: number;
};
export type Settings = {
  name: string;
  daily_minutes: number;
  focus_minutes: number;
  break_minutes: number;
  study_start: string;
  dark: boolean;
  google_client_id: string;
  last_sync: string;
};
export type GameClaim = { key: string; date: string; xp: number; coins: number };
export type GamePurchase = { item: string; date: string; price: number };
export type ArcadeRun = { id: string; date: string; game: 'blitz' | 'memory' | 'truefalse'; score: number; xp: number };
export type HouseChoice = { id: 'lumina' | 'eco' | 'forja' | 'raiz'; date: string; scores: Record<string, number> };
export type QuizResult = { id: string; date: string; correct: number; total: number; title: string };
export type GameState = {
  v: 1;
  claims: GameClaim[];
  achievements: Record<string, string>;
  purchases: GamePurchase[];
  equipped: { theme?: string; frame?: string; title?: string };
  frozen: string[];
  reviews: Record<string, number>;
  quizzes: QuizResult[];
  public: boolean;
  best_streak: number;
  house?: HouseChoice;
  arcade: ArcadeRun[];
};
export type Workspace = {
  schema_version: 1;
  subjects: Subject[];
  tasks: Task[];
  sessions: Session[];
  cards: Flashcard[];
  blocks: Block[];
  settings: Settings;
  game?: GameState;
};
export const colors = ['blue', 'purple', 'orange', 'rose', 'cyan'];
export const id = () => crypto.randomUUID();
export function day(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return day(d);
}
export function prettyDate(date: string) {
  if (!date) return 'Sem prazo';
  if (date === day()) return 'Hoje';
  if (date === addDays(day(), 1)) return 'Amanhã';
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}
export function minutesLabel(n: number) {
  return n >= 60
    ? `${Math.floor(n / 60)}h ${n % 60 ? `${n % 60}min` : ''}`.trim()
    : `${n} min`;
}
export function emptyWorkspace(): Workspace {
  return {
    schema_version: 1,
    subjects: [],
    tasks: [],
    sessions: [],
    cards: [],
    blocks: [],
    settings: {
      name: 'Estudante',
      daily_minutes: 120,
      focus_minutes: 25,
      break_minutes: 5,
      study_start: '14:00',
      dark: false,
      google_client_id: '',
      last_sync: '',
    },
  };
}
export function demoWorkspace(): Workspace {
  const s = emptyWorkspace(),
    today = day();
  s.subjects = ['Matemática', 'Programação', 'Física', 'Inglês'].map(
    (name, i) => ({
      id: id(),
      name,
      teacher: [
        'Prof. Ana Ribeiro',
        'Prof. Rafael Costa',
        'Prof. Mariana Lima',
        'Prof. Daniel Alves',
      ][i],
      hours: [80, 120, 80, 40][i],
      description: [
        'Funções, limites e aplicações.',
        'Algoritmos e estruturas de dados.',
        'Mecânica e movimento.',
        'Leitura e conversação.',
      ][i],
      color: colors[i],
      start_date: today.slice(0, 4) + '-08-01',
      end_date: today.slice(0, 4) + '-12-15',
      archived: false,
    }),
  );
  s.tasks = [
    ['Lista de exercícios · Funções', 0, 0, 40, 'high'],
    ['Revisar estruturas de dados', 1, 0, 25, 'high'],
    ['Ler capítulo 4 e fazer resumo', 2, 1, 30, 'medium'],
    ['Projeto: lista de tarefas em Python', 1, 3, 120, 'high'],
    ['Praticar listening · 15 minutos', 3, 2, 15, 'low'],
    ['Revisão para a prova de cinemática', 2, 4, 60, 'high'],
    ['Resumir aula de funções', 0, -1, 25, 'medium'],
    ['Resolver exercícios de arrays', 1, -2, 45, 'medium'],
    ['Revisar verbos irregulares', 3, -3, 20, 'low'],
  ].map((t, i) => ({
    id: id(),
    title: t[0] as string,
    subject_id: s.subjects[t[1] as number].id,
    description:
      i === 0
        ? 'Resolver os exercícios 1 a 10. Separar dúvidas para a próxima aula.'
        : '',
    due_date: addDays(today, t[2] as number),
    status: i >= 6 ? 'done' : 'todo',
    priority: t[4] as Task['priority'],
    estimated_minutes: t[3] as number,
    awarded: i >= 6,
    created_at: new Date().toISOString(),
    ...(i >= 6 ? { completed_at: `${addDays(today, (t[2] as number) + (i === 7 ? 1 : 0))}T18:00:00` } : {}),
  }));
  // A recent five-day streak plus an older, irregular history for the heatmap.
  const history = [
    [25, 0], [40, 1], [50, 2], [25, 3], [35, 4],
    [30, 7], [45, 8], [20, 10], [60, 11], [25, 14], [30, 15], [50, 17],
    [25, 21], [35, 22], [40, 24], [30, 29], [25, 31], [45, 36], [20, 43], [30, 50],
  ];
  s.sessions = history.map(([minutes, ago], i) => ({
    id: id(),
    task_id: s.tasks[6 + (i % 3)].id,
    subject_id: s.subjects[i % 4].id,
    minutes,
    created_at: addDays(today, -ago) + (i % 4 === 0 ? 'T09:30:00' : 'T14:00:00'),
  }));
  s.cards = [
    [
      'O que é uma função injetora?',
      'Uma função em que elementos distintos do domínio possuem imagens distintas.',
      0,
    ],
    [
      'Qual a diferença entre lista e tupla em Python?',
      'Listas são mutáveis. Tuplas são imutáveis.',
      1,
    ],
    [
      'Qual é a fórmula da velocidade média?',
      'Velocidade média = deslocamento / intervalo de tempo.',
      2,
    ],
  ].map((t) => ({
    id: id(),
    subject_id: s.subjects[t[2] as number].id,
    question: t[0] as string,
    answer: t[1] as string,
    stage: 0,
    due_date: today,
    reviews: 0,
  }));
  return s;
}
export function xp(s: Workspace) {
  return totalXP(s);
}
export function metrics(s: Workspace) {
  const today = day();
  const recent = s.sessions.filter(
    (x) => {
      const sessionDay = day(new Date(x.created_at));
      return sessionDay >= addDays(today, -6) && sessionDay <= today;
    },
  );
  const points = xp(s);
  const lvl = levelInfo(points);
  return {
    done: s.tasks.filter((t) => t.status === 'done').length,
    total: s.tasks.length,
    minutes: recent.reduce((a, x) => a + x.minutes, 0),
    days: new Set(recent.map((x) => day(new Date(x.created_at)))).size,
    points,
    level: lvl.level,
    levelProgress: lvl.progress,
    toNext: lvl.toNext,
    todayMinutes: s.sessions
      .filter((x) => day(new Date(x.created_at)) === today)
      .reduce((a, x) => a + x.minutes, 0),
  };
}

export type DeliveryStatus =
  | 'on_time'
  | 'late'
  | 'overdue'
  | 'pending'
  | 'unknown'
  | 'no_due_date';

export function deliveryStatus(task: Task, today = day()): DeliveryStatus {
  if (!task.due_date) return 'no_due_date';
  if (task.status !== 'done')
    return task.due_date < today ? 'overdue' : 'pending';
  if (!task.completed_at || Number.isNaN(Date.parse(task.completed_at)))
    return 'unknown';
  return day(new Date(task.completed_at)) <= task.due_date
    ? 'on_time'
    : 'late';
}

export function withoutSubject(state: Workspace, subjectId: string): Workspace {
  const removedTaskIds = new Set(
    state.tasks.filter(task => task.subject_id === subjectId).map(task => task.id),
  );
  return {
    ...state,
    subjects: state.subjects.filter(subject => subject.id !== subjectId),
    tasks: state.tasks.filter(task => task.subject_id !== subjectId),
    sessions: state.sessions.filter(session =>
      session.subject_id !== subjectId && !removedTaskIds.has(session.task_id),
    ),
    cards: state.cards.filter(card => card.subject_id !== subjectId),
    blocks: state.blocks.filter(block => !removedTaskIds.has(block.task_id)),
  };
}
export function taskMinutes(s: Workspace, t: Task) {
  return s.sessions
    .filter((x) => x.task_id === t.id)
    .reduce((a, x) => a + x.minutes, 0);
}
export function priorityScore(t: Task, today = day()) {
  if (t.status === 'done') return -1;
  const days = t.due_date
    ? Math.round(
        (new Date(t.due_date + 'T12:00:00').getTime() -
          new Date(today + 'T12:00:00').getTime()) /
          86400000,
      )
    : 30;
  return (
    (days < 0 ? 100 : days === 0 ? 90 : Math.max(0, 60 - days * 8)) +
    { high: 30, medium: 15, low: 0 }[t.priority] +
    (t.status === 'doing' ? 8 : 0)
  );
}
export function prioritized(s: Workspace) {
  return s.tasks
    .filter(
      (t) =>
        t.status !== 'done' &&
        !s.subjects.find((x) => x.id === t.subject_id)?.archived,
    )
    .sort(
      (a, b) =>
        priorityScore(b) - priorityScore(a) ||
        a.created_at.localeCompare(b.created_at),
    );
}
export function buildPlan(s: Workspace, start = day()) {
  const blocks: Block[] = [],
    capacity = Math.floor(s.settings.daily_minutes * 0.8),
    duration = Math.max(5, s.settings.focus_minutes);
  if (!Number.isFinite(capacity) || !Number.isFinite(duration))
    return { blocks: [], unscheduled: 0 };
  const used = new Map<string, number>();
  let unscheduled = 0;
  for (const t of prioritized(s)) {
    let remaining = Math.max(0, t.estimated_minutes - taskMinutes(s, t));
    for (let i = 0; i < 7 && remaining > 0; i++) {
      const date = addDays(start, i);
      if (date < day()) continue;
      if (t.due_date && t.due_date >= start && date > t.due_date) break;
      let available = capacity - (used.get(date) || 0);
      while (remaining > 0 && available >= 5) {
        const minutes = Math.min(duration, remaining, available);
        const [h, m] = s.settings.study_start.split(':').map(Number);
        const configured = h * 60 + m;
        const now = new Date();
        const earliest =
          date === day()
            ? Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 5) * 5
            : configured;
        const startMinute =
          Math.max(configured, earliest) + (used.get(date) || 0);
        if (startMinute + minutes > 1440) break;
        blocks.push({
          id: id(),
          task_id: t.id,
          date,
          time: `${String(Math.floor(startMinute / 60)).padStart(2, '0')}:${String(startMinute % 60).padStart(2, '0')}`,
          minutes,
        });
        const occupied = minutes + s.settings.break_minutes;
        used.set(date, (used.get(date) || 0) + occupied);
        available -= occupied;
        remaining -= minutes;
      }
    }
    unscheduled += remaining;
  }
  return { blocks, unscheduled };
}
export function reviewCard(
  card: Flashcard,
  rating: 'again' | 'hard' | 'good' | 'easy',
): Flashcard {
  const stage =
    rating === 'again'
      ? 0
      : rating === 'hard'
        ? card.stage
        : Math.min(4, card.stage + (rating === 'easy' ? 2 : 1));
  const intervals = [1, 3, 7, 14, 30];
  return {
    ...card,
    stage,
    due_date: addDays(day(), rating === 'again' ? 1 : intervals[stage]),
    reviews: card.reviews + 1,
  };
}
export function validateWorkspace(v: unknown): v is Workspace {
  try {
    if (!v || typeof v !== 'object') return false;
    const s = v as Workspace,
      obj = (x: unknown) => !!x && typeof x === 'object',
      str = (x: unknown, max = 5000) =>
        typeof x === 'string' && x.length <= max;
    const num = (x: unknown, min: number, max: number) =>
      typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
    const date = (x: unknown) =>
      str(x, 10) &&
      (x === '' ||
        (/^\d{4}-\d{2}-\d{2}$/.test(x as string) &&
          !Number.isNaN(new Date((x as string) + 'T12:00:00').getTime())));
    if (
      s.schema_version !== 1 ||
      !['subjects', 'tasks', 'sessions', 'cards', 'blocks'].every(
        (k) =>
          Array.isArray((s as unknown as Record<string, unknown>)[k]) &&
          (s as unknown as Record<string, unknown[]>)[k].length <= 10000,
      ) ||
      !obj(s.settings)
    )
      return false;
    for (const rows of [s.subjects, s.tasks, s.sessions, s.cards, s.blocks])
      if (
        rows.some((x) => !obj(x) || !str(x.id, 80) || !x.id) ||
        new Set(rows.map((x) => x.id)).size !== rows.length
      )
        return false;
    const st = s.settings;
    if (
      !str(st.name, 40) ||
      !num(st.daily_minutes, 15, 720) ||
      !num(st.focus_minutes, 5, 180) ||
      !num(st.break_minutes, 1, 60) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(st.study_start) ||
      typeof st.dark !== 'boolean' ||
      !str(st.google_client_id, 250) ||
      !str(st.last_sync, 50)
    )
      return false;
    if (s.game !== undefined && !validGame(s.game)) return false;
    if (
      !s.subjects.every(
        (x) =>
          str(x.name, 100) &&
          str(x.teacher, 100) &&
          str(x.description, 20000) &&
          num(x.hours, 1, 5000) &&
          colors.includes(x.color) &&
          date(x.start_date) &&
          date(x.end_date) &&
          typeof x.archived === 'boolean',
      )
    )
      return false;
    const subjects = new Set(s.subjects.map((x) => x.id));
    return (
      s.tasks.every(
        (t) =>
          str(t.title, 1000) &&
          str(t.description, 30000) &&
          subjects.has(t.subject_id) &&
          ['todo', 'doing', 'done'].includes(t.status) &&
          ['high', 'medium', 'low'].includes(t.priority) &&
          num(t.estimated_minutes, 0, 10080) &&
          typeof t.awarded === 'boolean' &&
          date(t.due_date) &&
          str(t.created_at, 50) &&
          (t.completed_at === undefined ||
            (str(t.completed_at, 50) &&
              !Number.isNaN(Date.parse(t.completed_at)))),
      ) &&
      s.sessions.every(
        (x) =>
          num(x.minutes, 1, 1440) &&
          str(x.task_id, 80) &&
          str(x.subject_id, 80) &&
          !Number.isNaN(new Date(x.created_at).getTime()),
      ) &&
      s.cards.every(
        (c) =>
          subjects.has(c.subject_id) &&
          str(c.question, 1000) &&
          str(c.answer, 3000) &&
          num(c.stage, 0, 4) &&
          Number.isInteger(c.stage) &&
          num(c.reviews, 0, 100000) &&
          date(c.due_date),
      ) &&
      s.blocks.every(
        (b) =>
          s.tasks.some((t) => t.id === b.task_id) &&
          date(b.date) &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(b.time) &&
          num(b.minutes, 1, 180),
      )
    );
  } catch {
    return false;
  }
}
export function emptyGame(): GameState {
  return {
    v: 1,
    claims: [],
    achievements: {},
    purchases: [],
    equipped: {},
    frozen: [],
    reviews: {},
    quizzes: [],
    public: false,
    best_streak: 0,
    arcade: [],
  };
}
export function gameOf(s: Workspace): GameState {
  return { ...emptyGame(), ...(s.game ?? {}) };
}
function validGame(g: unknown): boolean {
  if (!g || typeof g !== 'object') return false;
  const x = g as GameState;
  const isDay = (v: unknown) =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const n = (v: unknown, max = 1e7) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  const record = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
  return (
    x.v === 1 &&
    Array.isArray(x.claims) &&
    x.claims.length <= 5000 &&
    x.claims.every(
      c =>
        record(c) &&
        typeof c.key === 'string' &&
        c.key.length <= 80 &&
        isDay(c.date) &&
        n(c.xp, 1000) &&
        n(c.coins, 1000),
    ) &&
    record(x.achievements) &&
    Object.entries(x.achievements).every(([k, v]) => k.length <= 40 && isDay(v)) &&
    Array.isArray(x.purchases) &&
    x.purchases.length <= 500 &&
    x.purchases.every(
      p =>
        record(p) &&
        typeof p.item === 'string' &&
        p.item.length <= 40 &&
        isDay(p.date) &&
        n(p.price, 10000),
    ) &&
    record(x.equipped) &&
    Object.values(x.equipped).every(v => v === undefined || (typeof v === 'string' && v.length <= 40)) &&
    Array.isArray(x.frozen) &&
    x.frozen.length <= 400 &&
    x.frozen.every(isDay) &&
    record(x.reviews) &&
    Object.entries(x.reviews).every(([k, v]) => isDay(k) && n(v, 100000)) &&
    Array.isArray(x.quizzes) &&
    x.quizzes.length <= 2000 &&
    x.quizzes.every(
      q =>
        record(q) &&
        typeof q.id === 'string' &&
        typeof q.title === 'string' &&
        q.title.length <= 300 &&
        isDay(q.date) &&
        n(q.correct, 50) &&
        n(q.total, 50) &&
        q.correct <= q.total,
    ) &&
    typeof x.public === 'boolean' &&
    n(x.best_streak, 100000) &&
    (x.house === undefined ||
      (record(x.house) &&
        ['lumina', 'eco', 'forja', 'raiz'].includes(x.house.id) &&
        isDay(x.house.date) &&
        record(x.house.scores))) &&
    (x.arcade === undefined ||
      (Array.isArray(x.arcade) &&
        x.arcade.length <= 3000 &&
        x.arcade.every(
          r =>
            record(r) &&
            typeof r.id === 'string' &&
            isDay(r.date) &&
            ['blitz', 'memory', 'truefalse'].includes(r.game) &&
            n(r.score, 100000) &&
            n(r.xp, 1000),
        )))
  );
}
