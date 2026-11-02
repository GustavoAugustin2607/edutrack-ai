// EduTrack game engine. Everything here is derived from the study workspace,
// so XP can't drift from what the student actually did. The only persisted
// extras live in `workspace.game`: claimed quests, purchases, unlocked
// achievements, review/quiz logs and cosmetic choices.
import {
  addDays,
  day,
  gameOf,
  type GameClaim,
  type GameState,
  type Task,
  type Workspace,
} from './model';

/* ------------------------------------------------------------------ XP */

export type XPSource = 'task' | 'focus' | 'review' | 'quiz' | 'quest' | 'achievement' | 'arcade';
export type XPEntry = {
  date: string;
  xp: number;
  source: XPSource;
  label: string;
};

export const XP_RULES = {
  task: 30,
  taskHigh: 15,
  taskMedium: 5,
  onTime: 10,
  perMinute: 2,
  fullSession: 15,
  fullSessionMinutes: 25,
  review: 5,
  quizCorrect: 10,
  quizPerfect: 25,
};

export function taskXP(t: Task) {
  let xp = XP_RULES.task;
  if (t.priority === 'high') xp += XP_RULES.taskHigh;
  if (t.priority === 'medium') xp += XP_RULES.taskMedium;
  if (onTime(t)) xp += XP_RULES.onTime;
  return xp;
}
export function onTime(t: Task) {
  if (!t.completed_at || !t.due_date) return false;
  const done = new Date(t.completed_at);
  return !Number.isNaN(done.getTime()) && day(done) <= t.due_date;
}
export function sessionXP(minutes: number) {
  return (
    minutes * XP_RULES.perMinute +
    (minutes >= XP_RULES.fullSessionMinutes ? XP_RULES.fullSession : 0)
  );
}
export function quizXP(correct: number, total: number) {
  return correct * XP_RULES.quizCorrect + (total > 0 && correct === total ? XP_RULES.quizPerfect : 0);
}

const safeDay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : day(d);
};

/** Every XP grant, newest first. Entries without a date are legacy grants. */
export function ledger(s: Workspace): XPEntry[] {
  const g = gameOf(s);
  const out: XPEntry[] = [];
  for (const t of s.tasks)
    if (t.awarded)
      out.push({
        date: safeDay(t.completed_at) || safeDay(t.created_at),
        xp: taskXP(t),
        source: 'task',
        label: t.title,
      });
  for (const x of s.sessions)
    out.push({
      date: safeDay(x.created_at),
      xp: sessionXP(x.minutes),
      source: 'focus',
      label: `Foco · ${x.minutes} min`,
    });
  // Reviews: dated log for new reviews, legacy count for the rest.
  const totalReviews = s.cards.reduce((a, c) => a + Math.min(c.reviews, 50), 0);
  let logged = 0;
  for (const [date, count] of Object.entries(g.reviews)) {
    logged += count;
    out.push({ date, xp: count * XP_RULES.review, source: 'review', label: `${count} revisões` });
  }
  if (totalReviews > logged)
    out.push({
      date: '',
      xp: (totalReviews - logged) * XP_RULES.review,
      source: 'review',
      label: 'Revisões anteriores',
    });
  for (const q of g.quizzes)
    out.push({
      date: q.date,
      xp: quizXP(q.correct, q.total),
      source: 'quiz',
      label: `Quiz · ${q.correct}/${q.total}`,
    });
  for (const r of g.arcade)
    if (r.xp)
      out.push({ date: r.date, xp: r.xp, source: 'arcade', label: `Arena · ${ARCADE_NAMES[r.game]} (${r.score} pts)` });
  for (const c of g.claims)
    if (c.xp)
      out.push({ date: c.date, xp: c.xp, source: 'quest', label: questLabel(c.key) });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function totalXP(s: Workspace) {
  return ledger(s).reduce((a, e) => a + e.xp, 0);
}

/* -------------------------------------------------------------- Levels */

/** XP needed to go from `level` to `level + 1`. */
export const levelCost = (level: number) => 150 + (level - 1) * 50;

export const RANKS = [
  { min: 1, name: 'Calouro', tier: 'bronze' },
  { min: 5, name: 'Aprendiz', tier: 'silver' },
  { min: 10, name: 'Dedicado', tier: 'gold' },
  { min: 15, name: 'Erudito', tier: 'platinum' },
  { min: 20, name: 'Mestre', tier: 'diamond' },
  { min: 30, name: 'Sábio', tier: 'master' },
  { min: 40, name: 'Lenda', tier: 'legend' },
] as const;

export function levelInfo(points: number) {
  let level = 1,
    floor = 0;
  while (points >= floor + levelCost(level) && level < 200) {
    floor += levelCost(level);
    level++;
  }
  const cost = levelCost(level);
  const into = points - floor;
  const rank = [...RANKS].reverse().find(r => level >= r.min) ?? RANKS[0];
  const nextRank = RANKS.find(r => r.min > level);
  return {
    level,
    into,
    cost,
    toNext: cost - into,
    progress: Math.min(100, (into / cost) * 100),
    rank,
    nextRank,
  };
}

/* ------------------------------------------------------- Activity days */

export function activityByDay(s: Workspace) {
  const g = gameOf(s);
  const map = new Map<string, number>();
  const bump = (d: string, n: number) => d && map.set(d, (map.get(d) ?? 0) + n);
  for (const x of s.sessions) bump(safeDay(x.created_at), x.minutes);
  for (const t of s.tasks) if (t.status === 'done') bump(safeDay(t.completed_at), 10);
  for (const [d, n] of Object.entries(g.reviews)) bump(d, n * 2);
  for (const q of g.quizzes) bump(q.date, q.total * 2);
  for (const r of g.arcade) bump(r.date, 5);
  return map;
}

export function streakInfo(s: Workspace, today = day()) {
  const g = gameOf(s);
  const active = activityByDay(s);
  const frozen = new Set(g.frozen);
  const alive = (d: string) => (active.get(d) ?? 0) > 0 || frozen.has(d);
  const doneToday = (active.get(today) ?? 0) > 0;
  let cursor = doneToday ? today : addDays(today, -1);
  let current = 0;
  while (alive(cursor) && current < 5000) {
    current++;
    cursor = addDays(cursor, -1);
  }
  // Best streak ever, from the whole history.
  const days = [...new Set([...active.keys(), ...frozen])].filter(alive).sort();
  let best = 0,
    run = 0,
    prev = '';
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return {
    current,
    best: Math.max(best, current, g.best_streak),
    doneToday,
    atRisk: current > 0 && !doneToday,
    freezes: freezeCount(g),
  };
}

export function freezeCount(g: GameState) {
  return Math.max(0, g.purchases.filter(p => p.item === 'freeze').length - g.frozen.length);
}

/**
 * If yesterday was empty but the streak was alive before it, spend a streak
 * protector to cover it. Returns the updated game or null when nothing to do.
 */
export function autoFreeze(s: Workspace, today = day()): GameState | null {
  const g = gameOf(s);
  const yesterday = addDays(today, -1);
  if (!freezeCount(g) || g.frozen.includes(yesterday)) return null;
  const active = activityByDay(s);
  if ((active.get(yesterday) ?? 0) > 0) return null;
  const before = streakInfo(s, yesterday); // streak as of the day before yesterday
  if (before.current === 0) return null;
  return { ...g, frozen: [...g.frozen, yesterday] };
}

/* -------------------------------------------------------------- Quests */

export type Quest = {
  key: string;
  id: string;
  title: string;
  detail: string;
  icon: string;
  value: number;
  target: number;
  xp: number;
  coins: number;
  claimed: boolean;
  done: boolean;
};

type QuestTemplate = {
  id: string;
  icon: string;
  xp: number;
  coins: number;
  available?: (s: Workspace) => boolean;
  target: (s: Workspace) => number;
  title: (target: number) => string;
  detail: string;
  value: (s: Workspace, from: string, to: string) => number;
};

const inRange = (iso: string | undefined, from: string, to: string) => {
  const d = safeDay(iso);
  return !!d && d >= from && d <= to;
};
const minutesIn = (s: Workspace, from: string, to: string) =>
  s.sessions.filter(x => inRange(x.created_at, from, to)).reduce((a, x) => a + x.minutes, 0);
const tasksIn = (s: Workspace, from: string, to: string, filter: (t: Task) => boolean = () => true) =>
  s.tasks.filter(t => t.status === 'done' && inRange(t.completed_at, from, to) && filter(t)).length;
const reviewsIn = (s: Workspace, from: string, to: string) =>
  Object.entries(gameOf(s).reviews)
    .filter(([d]) => d >= from && d <= to)
    .reduce((a, [, n]) => a + n, 0);
const hasPending = (s: Workspace) => s.tasks.some(t => t.status !== 'done');
const round5 = (n: number) => Math.max(15, Math.round(n / 5) * 5);

const DAILY: QuestTemplate[] = [
  {
    id: 'minutes',
    icon: 'timer',
    xp: 40,
    coins: 15,
    target: s => round5(s.settings.daily_minutes * 0.5),
    title: n => `Estude ${n} minutos`,
    detail: 'Some o tempo de todas as sessões de foco de hoje.',
    value: minutesIn,
  },
  {
    id: 'full-session',
    icon: 'flame',
    xp: 35,
    coins: 15,
    target: () => 1,
    title: () => 'Faça uma sessão completa de 25 min',
    detail: 'Uma única sessão de foco com pelo menos 25 minutos.',
    value: (s, f, t) =>
      s.sessions.filter(x => x.minutes >= 25 && inRange(x.created_at, f, t)).length,
  },
  {
    id: 'two-sessions',
    icon: 'repeat',
    xp: 45,
    coins: 20,
    target: () => 2,
    title: () => 'Complete 2 sessões de foco',
    detail: 'Volte depois da pausa: consistência vale mais que maratona.',
    value: (s, f, t) => s.sessions.filter(x => inRange(x.created_at, f, t)).length,
  },
  {
    id: 'task',
    icon: 'check',
    xp: 40,
    coins: 15,
    available: hasPending,
    target: () => 1,
    title: () => 'Conclua 1 tarefa',
    detail: 'Qualquer tarefa marcada como concluída hoje conta.',
    value: (s, f, t) => tasksIn(s, f, t),
  },
  {
    id: 'two-tasks',
    icon: 'list',
    xp: 60,
    coins: 25,
    available: s => s.tasks.filter(t => t.status !== 'done').length >= 2,
    target: () => 2,
    title: () => 'Conclua 2 tarefas',
    detail: 'Avance em duas frentes no mesmo dia.',
    value: (s, f, t) => tasksIn(s, f, t),
  },
  {
    id: 'high',
    icon: 'mountain',
    xp: 55,
    coins: 25,
    available: s => s.tasks.some(t => t.status !== 'done' && t.priority === 'high'),
    target: () => 1,
    title: () => 'Enfrente uma tarefa de prioridade alta',
    detail: 'Comece pelo mais difícil — vale mais XP.',
    value: (s, f, t) => tasksIn(s, f, t, x => x.priority === 'high'),
  },
  {
    id: 'reviews',
    icon: 'layers',
    xp: 40,
    coins: 15,
    available: s => s.cards.length >= 3,
    target: s => Math.min(5, s.cards.length),
    title: n => `Revise ${n} cartões`,
    detail: 'Repetição espaçada: lembrar hoje para não reaprender amanhã.',
    value: reviewsIn,
  },
  {
    id: 'early',
    icon: 'sunrise',
    xp: 35,
    coins: 15,
    target: () => 1,
    title: () => 'Estude antes do meio-dia',
    detail: 'Registre uma sessão de foco pela manhã.',
    value: (s, f, t) =>
      s.sessions.filter(x => inRange(x.created_at, f, t) && new Date(x.created_at).getHours() < 12)
        .length,
  },
  {
    id: 'arcade',
    icon: 'gamepad',
    xp: 30,
    coins: 15,
    target: () => 1,
    title: () => 'Jogue uma partida na Arena',
    detail: 'Qualquer jogo da Arena conta. Revisar brincando também é estudar.',
    value: (s, f, t) => gameOf(s).arcade.filter(r => r.date >= f && r.date <= t).length,
  },
  {
    id: 'plan',
    icon: 'calendar',
    xp: 30,
    coins: 10,
    available: hasPending,
    target: () => 2,
    title: () => 'Tenha 2 blocos planejados à frente',
    detail: 'Reserve horários no Planejamento para os próximos dias.',
    value: (s, f) => s.blocks.filter(b => b.date > f).length,
  },
];

const WEEKLY: QuestTemplate[] = [
  {
    id: 'w-days',
    icon: 'flame',
    xp: 150,
    coins: 60,
    target: () => 5,
    title: n => `Estude em ${n} dias diferentes`,
    detail: 'Dias com qualquer atividade de estudo registrada.',
    value: (s, f, t) => [...activityByDay(s).keys()].filter(d => d >= f && d <= t).length,
  },
  {
    id: 'w-minutes',
    icon: 'timer',
    xp: 140,
    coins: 55,
    target: s => round5(s.settings.daily_minutes * 3),
    title: n => `Acumule ${Math.round(n / 6) / 10}h de foco`,
    detail: 'Todas as sessões de foco desta semana somadas.',
    value: minutesIn,
  },
  {
    id: 'w-tasks',
    icon: 'check',
    xp: 130,
    coins: 50,
    available: hasPending,
    target: () => 6,
    title: n => `Conclua ${n} tarefas`,
    detail: 'Tarefas concluídas entre segunda e domingo.',
    value: (s, f, t) => tasksIn(s, f, t),
  },
  {
    id: 'w-ontime',
    icon: 'clock',
    xp: 120,
    coins: 50,
    available: hasPending,
    target: () => 4,
    title: n => `Entregue ${n} tarefas no prazo`,
    detail: 'Concluídas até a data de entrega.',
    value: (s, f, t) => tasksIn(s, f, t, onTime),
  },
  {
    id: 'w-reviews',
    icon: 'layers',
    xp: 120,
    coins: 45,
    available: s => s.cards.length >= 5,
    target: () => 25,
    title: n => `Faça ${n} revisões`,
    detail: 'Cartões revisados na semana.',
    value: reviewsIn,
  },
];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function pick<T extends { id: string }>(pool: T[], seed: string, n: number) {
  return [...pool].sort((a, b) => hash(seed + a.id) - hash(seed + b.id)).slice(0, n);
}

export function mondayOf(date: string) {
  const offset = (new Date(date + 'T12:00:00').getDay() + 6) % 7;
  return addDays(date, -offset);
}

function build(s: Workspace, list: QuestTemplate[], prefix: string, from: string, to: string): Quest[] {
  const claimed = new Set(gameOf(s).claims.map(c => c.key));
  return list.map(q => {
    const target = q.target(s);
    const value = Math.min(target, q.value(s, from, to));
    const key = `${prefix}:${from}:${q.id}`;
    return {
      key,
      id: q.id,
      icon: q.icon,
      title: q.title(target),
      detail: q.detail,
      value,
      target,
      xp: q.xp,
      coins: q.coins,
      claimed: claimed.has(key),
      done: value >= target,
    };
  });
}

/** Today's three missions. The selection is stable for the whole day. */
export function dailyQuests(s: Workspace, today = day()): Quest[] {
  const claimedIds = new Set(
    gameOf(s).claims.filter(c => c.key.startsWith(`d:${today}:`)).map(c => c.key.split(':')[2]),
  );
  // Claimed quests stay on the board even if they stop being "available".
  const pool = DAILY.filter(q => claimedIds.has(q.id) || !q.available || q.available(s));
  const chosen = pick(pool.filter(q => q.id !== 'minutes'), today, 2);
  return build(s, [DAILY[0], ...chosen], 'd', today, today);
}
export function weeklyQuests(s: Workspace, today = day()): Quest[] {
  const from = mondayOf(today);
  const claimedIds = new Set(
    gameOf(s).claims.filter(c => c.key.startsWith(`w:${from}:`)).map(c => c.key.split(':')[2]),
  );
  const pool = WEEKLY.filter(q => claimedIds.has(q.id) || !q.available || q.available(s));
  return build(s, pick(pool, from, 3), 'w', from, addDays(from, 6));
}
export const CHEST = { xp: 50, coins: 40 };
export function chestKey(today = day()) {
  return `d:${today}:chest`;
}

export function claim(s: Workspace, key: string, xp: number, coins: number): Workspace {
  const g = gameOf(s);
  if (g.claims.some(c => c.key === key)) return s;
  const entry: GameClaim = { key, date: day(), xp, coins };
  return { ...s, game: { ...g, claims: [...g.claims, entry] } };
}

const QUEST_NAMES: Record<string, string> = {
  minutes: 'Minutos do dia',
  'full-session': 'Sessão completa',
  'two-sessions': 'Duas sessões',
  task: 'Uma tarefa',
  'two-tasks': 'Duas tarefas',
  high: 'Prioridade alta',
  reviews: 'Revisões do dia',
  early: 'Estudo matinal',
  plan: 'Agenda à frente',
  arcade: 'Partida na Arena',
  'w-days': 'Dias ativos',
  'w-minutes': 'Horas de foco',
  'w-tasks': 'Tarefas da semana',
  'w-ontime': 'Entregas no prazo',
  'w-reviews': 'Revisões da semana',
};
function questLabel(key: string) {
  const [kind, , id] = key.split(':');
  if (id === 'chest') return 'Baú diário';
  return `${kind === 'w' ? 'Desafio semanal' : 'Missão'} · ${QUEST_NAMES[id] ?? id}`;
}

/* -------------------------------------------------------- Achievements */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITY: Record<Rarity, { label: string; coins: number }> = {
  common: { label: 'Comum', coins: 10 },
  rare: { label: 'Rara', coins: 25 },
  epic: { label: 'Épica', coins: 50 },
  legendary: { label: 'Lendária', coins: 100 },
};

export type AchievementDef = {
  id: string;
  title: string;
  text: string;
  icon: string;
  group: string;
  rarity: Rarity;
  target: number;
  hidden?: boolean;
  value: (s: Workspace, ctx: Ctx) => number;
};
type Ctx = { xp: number; level: number; best: number };

const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);
const done = (s: Workspace) => s.tasks.filter(t => t.status === 'done' || t.awarded);
const focusMin = (s: Workspace) => sum(s.sessions.map(x => x.minutes));
const reviewTotal = (s: Workspace) => sum(s.cards.map(c => c.reviews));
const hourCount = (s: Workspace, test: (h: number) => boolean) =>
  s.sessions.filter(x => test(new Date(x.created_at).getHours())).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  // Tarefas
  { id: 'first-task', group: 'Tarefas', icon: 'check', rarity: 'common', title: 'Primeiro passo', text: 'Conclua sua primeira tarefa.', target: 1, value: s => done(s).length },
  { id: 'tasks-10', group: 'Tarefas', icon: 'target', rarity: 'common', title: 'Missão cumprida', text: 'Conclua 10 tarefas.', target: 10, value: s => done(s).length },
  { id: 'tasks-50', group: 'Tarefas', icon: 'medal', rarity: 'rare', title: 'Máquina de entregas', text: 'Conclua 50 tarefas.', target: 50, value: s => done(s).length },
  { id: 'tasks-150', group: 'Tarefas', icon: 'crown', rarity: 'epic', title: 'Imparável', text: 'Conclua 150 tarefas.', target: 150, value: s => done(s).length },
  { id: 'ontime-10', group: 'Tarefas', icon: 'clock', rarity: 'rare', title: 'Pontualidade britânica', text: 'Entregue 10 tarefas dentro do prazo.', target: 10, value: s => s.tasks.filter(onTime).length },
  { id: 'high-5', group: 'Tarefas', icon: 'mountain', rarity: 'rare', title: 'Encara o difícil', text: 'Conclua 5 tarefas de prioridade alta.', target: 5, value: s => s.tasks.filter(t => t.status === 'done' && t.priority === 'high').length },
  // Foco
  { id: 'focus-60', group: 'Foco', icon: 'timer', rarity: 'common', title: 'Mente em foco', text: 'Acumule 1 hora de foco.', target: 60, value: focusMin },
  { id: 'focus-600', group: 'Foco', icon: 'brain', rarity: 'rare', title: 'Dez horas de voo', text: 'Acumule 10 horas de foco.', target: 600, value: focusMin },
  { id: 'focus-3000', group: 'Foco', icon: 'rocket', rarity: 'epic', title: 'Cinquenta horas', text: 'Acumule 50 horas de foco.', target: 3000, value: focusMin },
  { id: 'focus-10000', group: 'Foco', icon: 'gem', rarity: 'legendary', title: 'Regra das 10 mil… minutos', text: 'Acumule 10.000 minutos de foco.', target: 10000, value: focusMin },
  { id: 'sessions-25', group: 'Foco', icon: 'repeat', rarity: 'rare', title: 'Ritual diário', text: 'Registre 25 sessões de foco.', target: 25, value: s => s.sessions.length },
  { id: 'marathon', group: 'Foco', icon: 'zap', rarity: 'epic', title: 'Maratonista', text: 'Uma única sessão de 90 minutos ou mais.', target: 90, value: s => Math.max(0, ...s.sessions.map(x => x.minutes)) },
  // Sequência
  { id: 'streak-3', group: 'Sequência', icon: 'flame', rarity: 'common', title: 'Pegando ritmo', text: 'Estude 3 dias seguidos.', target: 3, value: (_, c) => c.best },
  { id: 'streak-7', group: 'Sequência', icon: 'flame', rarity: 'rare', title: 'Semana em chamas', text: 'Estude 7 dias seguidos.', target: 7, value: (_, c) => c.best },
  { id: 'streak-30', group: 'Sequência', icon: 'flame', rarity: 'epic', title: 'Hábito formado', text: 'Estude 30 dias seguidos.', target: 30, value: (_, c) => c.best },
  { id: 'streak-100', group: 'Sequência', icon: 'flame', rarity: 'legendary', title: 'Centenário', text: 'Estude 100 dias seguidos.', target: 100, value: (_, c) => c.best },
  // Revisões e IA
  { id: 'reviews-10', group: 'Memória', icon: 'layers', rarity: 'common', title: 'Memória em dia', text: 'Faça 10 revisões.', target: 10, value: reviewTotal },
  { id: 'reviews-100', group: 'Memória', icon: 'library', rarity: 'rare', title: 'Arquivista', text: 'Faça 100 revisões.', target: 100, value: reviewTotal },
  { id: 'reviews-500', group: 'Memória', icon: 'brain', rarity: 'epic', title: 'Memória de elefante', text: 'Faça 500 revisões.', target: 500, value: reviewTotal },
  { id: 'cards-mastered', group: 'Memória', icon: 'star', rarity: 'rare', title: 'Domínio total', text: 'Leve 10 cartões ao estágio máximo.', target: 10, value: s => s.cards.filter(c => c.stage >= 4).length },
  { id: 'quiz-first', group: 'Memória', icon: 'sparkles', rarity: 'common', title: 'Primeiro quiz', text: 'Responda um quiz completo do Tutor IA.', target: 1, value: s => gameOf(s).quizzes.length },
  { id: 'quiz-perfect', group: 'Memória', icon: 'trophy', rarity: 'rare', title: 'Gabaritou', text: 'Acerte todas as perguntas de um quiz.', target: 1, value: s => gameOf(s).quizzes.filter(q => q.total > 0 && q.correct === q.total).length },
  // Organização e progresso
  { id: 'subjects-3', group: 'Jornada', icon: 'book', rarity: 'common', title: 'Grade montada', text: 'Cadastre 3 disciplinas.', target: 3, value: s => s.subjects.length },
  { id: 'planner-10', group: 'Jornada', icon: 'calendar', rarity: 'common', title: 'Estrategista', text: 'Tenha 10 blocos planejados na agenda.', target: 10, value: s => s.blocks.length },
  { id: 'quests-10', group: 'Jornada', icon: 'scroll', rarity: 'rare', title: 'Aventureiro', text: 'Resgate 10 missões.', target: 10, value: s => gameOf(s).claims.filter(c => !c.key.endsWith(':chest')).length },
  { id: 'quests-60', group: 'Jornada', icon: 'scroll', rarity: 'epic', title: 'Caçador de missões', text: 'Resgate 60 missões.', target: 60, value: s => gameOf(s).claims.filter(c => !c.key.endsWith(':chest')).length },
  { id: 'level-5', group: 'Jornada', icon: 'shield', rarity: 'common', title: 'Aprendiz', text: 'Alcance o nível 5.', target: 5, value: (_, c) => c.level },
  { id: 'level-10', group: 'Jornada', icon: 'shield', rarity: 'rare', title: 'Dedicado', text: 'Alcance o nível 10.', target: 10, value: (_, c) => c.level },
  { id: 'level-20', group: 'Jornada', icon: 'crown', rarity: 'legendary', title: 'Mestre', text: 'Alcance o nível 20.', target: 20, value: (_, c) => c.level },
  // Arena e Casas
  { id: 'sorted', group: 'Arena', icon: 'crown', rarity: 'common', title: 'O chapéu decidiu', text: 'Descubra sua casa no Chapéu Seletor.', target: 1, value: s => (gameOf(s).house ? 1 : 0) },
  { id: 'arcade-first', group: 'Arena', icon: 'gamepad', rarity: 'common', title: 'Primeira partida', text: 'Jogue qualquer jogo da Arena.', target: 1, value: s => gameOf(s).arcade.length },
  { id: 'arcade-25', group: 'Arena', icon: 'gamepad', rarity: 'rare', title: 'Frequentador da Arena', text: 'Jogue 25 partidas.', target: 25, value: s => gameOf(s).arcade.length },
  { id: 'blitz-20', group: 'Arena', icon: 'zap', rarity: 'epic', title: 'Raio', text: 'Faça 20 pontos no Quiz Relâmpago.', target: 20, value: s => Math.max(0, ...gameOf(s).arcade.filter(r => r.game === 'blitz').map(r => r.score)) },
  { id: 'memory-perfect', group: 'Arena', icon: 'brain', rarity: 'epic', title: 'Memória perfeita', text: 'Ganhe 100 pontos no Jogo da Memória.', target: 100, value: s => Math.max(0, ...gameOf(s).arcade.filter(r => r.game === 'memory').map(r => r.score)) },
  // Secretas
  { id: 'night-owl', group: 'Secretas', icon: 'moon', rarity: 'rare', hidden: true, title: 'Coruja', text: 'Estude depois das 22h.', target: 1, value: s => hourCount(s, h => h >= 22) },
  { id: 'early-bird', group: 'Secretas', icon: 'sunrise', rarity: 'rare', hidden: true, title: 'Madrugador', text: 'Estude antes das 7h.', target: 1, value: s => hourCount(s, h => h < 7) },
  { id: 'weekend', group: 'Secretas', icon: 'sofa', rarity: 'rare', hidden: true, title: 'Fim de semana produtivo', text: 'Estude no sábado e no domingo da mesma semana.', target: 1, value: s => {
    const days = new Set(s.sessions.map(x => safeDay(x.created_at)));
    return [...days].some(d => new Date(d + 'T12:00:00').getDay() === 6 && days.has(addDays(d, 1))) ? 1 : 0;
  } },
  { id: 'chest-7', group: 'Secretas', icon: 'gift', rarity: 'epic', hidden: true, title: 'Colecionador de baús', text: 'Abra 7 baús diários.', target: 7, value: s => gameOf(s).claims.filter(c => c.key.endsWith(':chest')).length },
];

export function achievementStatus(s: Workspace) {
  const xp = totalXP(s);
  const ctx: Ctx = { xp, level: levelInfo(xp).level, best: streakInfo(s).best };
  const unlocked = gameOf(s).achievements;
  return ACHIEVEMENTS.map(a => {
    const value = Math.min(a.target, a.value(s, ctx));
    return {
      ...a,
      value,
      unlockedAt: unlocked[a.id] as string | undefined,
      reached: value >= a.target,
    };
  });
}

/** Achievements reached now but not yet recorded. */
export function newAchievements(s: Workspace) {
  return achievementStatus(s).filter(a => a.reached && !a.unlockedAt);
}

/* ---------------------------------------------------------------- Shop */

export type ShopItem = {
  id: string;
  kind: 'theme' | 'frame' | 'title' | 'consumable';
  name: string;
  text: string;
  price: number;
  level?: number;
  swatch?: string[];
  max?: number;
};

export const SHOP: ShopItem[] = [
  { id: 'freeze', kind: 'consumable', name: 'Protetor de sequência', text: 'Cobre automaticamente um dia sem estudo. Guarde até 3.', price: 60, max: 3 },
  { id: 'theme-emerald', kind: 'theme', name: 'Esmeralda', text: 'Verde calmo para longas sessões.', price: 120, swatch: ['#0f8a5f', '#d8f3e6'] },
  { id: 'theme-amber', kind: 'theme', name: 'Âmbar', text: 'Tons quentes de fim de tarde.', price: 120, swatch: ['#c26a12', '#fbe7cf'] },
  { id: 'theme-violet', kind: 'theme', name: 'Ametista', text: 'Roxo profundo e elegante.', price: 180, level: 4, swatch: ['#7140d8', '#ebe2ff'] },
  { id: 'theme-coral', kind: 'theme', name: 'Coral', text: 'Energia para dias puxados.', price: 180, level: 4, swatch: ['#e04e5a', '#ffe1e3'] },
  { id: 'theme-neon', kind: 'theme', name: 'Neon noturno', text: 'Ciano elétrico. Para quem chegou longe.', price: 320, level: 8, swatch: ['#00a6c7', '#d2f6ff'] },
  { id: 'frame-bronze', kind: 'frame', name: 'Moldura bronze', text: 'Um anel discreto no seu avatar.', price: 80 },
  { id: 'frame-fire', kind: 'frame', name: 'Moldura em chamas', text: 'Gradiente quente que pulsa.', price: 160, level: 3 },
  { id: 'frame-aurora', kind: 'frame', name: 'Moldura aurora', text: 'Cores que giram devagar.', price: 260, level: 6 },
  { id: 'frame-crown', kind: 'frame', name: 'Moldura dourada', text: 'Ouro com brilho. Para lendas.', price: 420, level: 10 },
  { id: 'title-focus', kind: 'title', name: 'O Focado', text: 'Título exibido no seu perfil e no ranking.', price: 90 },
  { id: 'title-owl', kind: 'title', name: 'Coruja dos Livros', text: 'Para quem não larga o estudo.', price: 120 },
  { id: 'title-brain', kind: 'title', name: 'Mente Brilhante', text: 'Título raro para o seu perfil.', price: 200, level: 5 },
  { id: 'title-legend', kind: 'title', name: 'Lenda do Semestre', text: 'O título mais cobiçado.', price: 500, level: 12 },
];

export function owned(g: GameState, item: string) {
  return g.purchases.some(p => p.item === item);
}

/* ------------------------------------------------------------- Summary */

export function coinBalance(s: Workspace, level = levelInfo(totalXP(s)).level) {
  const g = gameOf(s);
  const earned =
    sum(g.claims.map(c => c.coins)) +
    sum(
      Object.keys(g.achievements).map(id => {
        const a = ACHIEVEMENTS.find(x => x.id === id);
        return a ? RARITY[a.rarity].coins : 0;
      }),
    ) +
    (level - 1) * 20;
  const spent = sum(g.purchases.map(p => p.price));
  // Deleting study records can lower the level; never show a negative wallet.
  return { earned, spent, balance: Math.max(0, earned - spent) };
}

export function buy(s: Workspace, item: ShopItem): { state: Workspace; error?: string } {
  const g = gameOf(s);
  const lvl = levelInfo(totalXP(s)).level;
  if (item.level && lvl < item.level) return { state: s, error: `Disponível a partir do nível ${item.level}.` };
  if (item.kind !== 'consumable' && owned(g, item.id)) return { state: s, error: 'Você já tem este item.' };
  if (item.kind === 'consumable' && freezeCount(g) >= (item.max ?? 99))
    return { state: s, error: `Você já guarda o máximo de ${item.max}.` };
  if (coinBalance(s, lvl).balance < item.price) return { state: s, error: 'Moedas insuficientes.' };
  const purchases = [...g.purchases, { item: item.id, date: day(), price: item.price }];
  const equipped = { ...g.equipped };
  if (item.kind === 'theme') equipped.theme = item.id;
  if (item.kind === 'frame') equipped.frame = item.id;
  if (item.kind === 'title') equipped.title = item.id;
  return { state: { ...s, game: { ...g, purchases, equipped } } };
}

export function gameSummary(s: Workspace) {
  const xp = totalXP(s);
  const lvl = levelInfo(xp);
  const streak = streakInfo(s);
  const coins = coinBalance(s, lvl.level);
  const g = gameOf(s);
  const today = day();
  const week = mondayOf(today);
  const entries = ledger(s);
  return {
    xp,
    ...lvl,
    streak,
    coins: coins.balance,
    todayXP: sum(entries.filter(e => e.date === today).map(e => e.xp)),
    weekXP: sum(entries.filter(e => e.date >= week && e.date <= today).map(e => e.xp)),
    title: SHOP.find(i => i.id === g.equipped.title)?.name,
    frame: g.equipped.frame,
    theme: g.equipped.theme,
  };
}
export type GameSummary = ReturnType<typeof gameSummary>;

/* -------------------------------------------------------------- Arena */

export const ARCADE_NAMES = { blitz: 'Quiz Relâmpago', memory: 'Jogo da Memória', truefalse: 'Verdadeiro ou Falso' } as const;
export const ARCADE_DAILY_CAP = 150;

/** XP a run is worth, respecting the daily Arena cap so games can't be farmed. */
export function arcadeXP(s: Workspace, game: keyof typeof ARCADE_NAMES, score: number, today = day()) {
  const already = gameOf(s).arcade.filter(r => r.date === today).reduce((a, r) => a + r.xp, 0);
  const raw = game === 'memory' ? Math.round(score / 4) : game === 'blitz' ? score * 3 : score * 2;
  return Math.max(0, Math.min(raw, 60, ARCADE_DAILY_CAP - already));
}

export function recordArcade(s: Workspace, game: keyof typeof ARCADE_NAMES, score: number): { state: Workspace; xp: number } {
  const g = gameOf(s);
  const xp = arcadeXP(s, game, score);
  const run = { id: crypto.randomUUID(), date: day(), game, score: Math.max(0, Math.round(score)), xp };
  return { state: { ...s, game: { ...g, arcade: [...g.arcade, run].slice(-3000) } }, xp };
}

export function arcadeBest(s: Workspace, game: keyof typeof ARCADE_NAMES) {
  return Math.max(0, ...gameOf(s).arcade.filter(r => r.game === game).map(r => r.score));
}
