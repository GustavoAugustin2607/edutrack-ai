import { addDays, day, id, prioritized, taskMinutes, type Workspace, type Task, type Block } from './model';

export const clockMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const clockLabel = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const planningCapacity = (s: Workspace) => Math.floor(s.settings.daily_minutes * 0.8);
export function upcoming(s: Workspace, exclude = '') {
  const now = Date.now();
  return s.blocks.filter(b => b.id !== exclude && new Date(`${b.date}T${b.time}:00`).getTime() + (b.minutes + s.settings.break_minutes) * 60000 > now && s.tasks.some(t => t.id === b.task_id && t.status !== 'done'));
}
export function unplanned(s: Workspace, t: Task, exclude = '') {
  return Math.max(0, t.estimated_minutes - taskMinutes(s, t) - upcoming(s, exclude).filter(b => b.task_id === t.id).reduce((n, b) => n + b.minutes, 0));
}
export function dayLoad(s: Workspace, date: string, exclude = '') {
  const study = s.sessions.filter(x => day(new Date(x.created_at)) === date).reduce((n, x) => n + x.minutes, 0);
  const blocks = upcoming(s, exclude).filter(b => b.date === date);
  const planned = blocks.reduce((n, b) => n + b.minutes, 0);
  const pauses = blocks.length * s.settings.break_minutes;
  const capacity = planningCapacity(s);
  return { study, planned, pauses, capacity, used: study + planned + pauses, free: Math.max(0, capacity - study - planned - pauses) };
}
export function suggestSlot(s: Workspace, t: Task, date: string, exclude = '') {
  const minutes = Math.min(s.settings.focus_minutes, unplanned(s, t, exclude), Math.max(0, dayLoad(s, date, exclude).free - s.settings.break_minutes));
  const now = new Date();
  const configuredStart = clockMinutes(s.settings.study_start);
  const nextFiveMinutes = Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 5) * 5;
  let start = date === day() ? Math.max(configuredStart, nextFiveMinutes) : configuredStart;
  const occupied = upcoming(s, exclude).filter(b => b.date === date).sort((a, b) => a.time.localeCompare(b.time));
  for (const b of occupied) {
    const from = clockMinutes(b.time), to = from + b.minutes + s.settings.break_minutes;
    if (start + minutes + s.settings.break_minutes <= from) break;
    if (start < to) start = to;
  }
  return { minutes, time: clockLabel(Math.min(start, 1439)) };
}
export function scheduleError(s: Workspace, t: Task, b: Pick<Block, 'date' | 'time' | 'minutes'>, exclude = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)) return 'Escolha um dia e horário válidos.';
  if (new Date(`${b.date}T${b.time}:00`).getTime() < Date.now()) return 'Esse horário já passou. Escolha um horário futuro.';
  if (!Number.isInteger(b.minutes) || b.minutes < 1 || b.minutes > 180) return 'Use uma duração entre 1 e 180 minutos.';
  if (b.minutes > unplanned(s, t, exclude)) return `Restam ${unplanned(s, t, exclude)} min sem horário nesta tarefa. Ajuste a duração ou a estimativa da tarefa.`;
  const load = dayLoad(s, b.date, exclude);
  if (b.minutes + s.settings.break_minutes > load.free) return `Neste dia cabem ${Math.max(0, load.free - s.settings.break_minutes)} min de estudo, contando a pausa. Reduza a duração ou escolha outro dia.`;
  const start = clockMinutes(b.time), end = start + b.minutes + s.settings.break_minutes;
  if (end > 1440) return 'O estudo e a pausa precisam terminar antes da meia-noite.';
  if (upcoming(s, exclude).some(x => x.date === b.date && start < clockMinutes(x.time) + x.minutes + s.settings.break_minutes && end > clockMinutes(x.time))) return 'Esse horário se sobrepõe a outro estudo ou à sua pausa.';
  return '';
}
export function fillWeek(s: Workspace, start: string) {
  const next = { ...s, blocks: [...s.blocks] };
  let count = 0;
  for (const t of prioritized(s)) {
    for (let d = 0; d < 7 && unplanned(next, t) > 0; d++) {
      const date = addDays(start, d);
      if (date < day() || (t.due_date && date > (t.due_date < day() ? day() : t.due_date))) continue;
      for (let guard = 0; guard < 144; guard++) {
        const slot = suggestSlot(next, t, date);
        if (!slot.minutes || scheduleError(next, t, { date, ...slot })) break;
        next.blocks.push({ id: id(), task_id: t.id, date, ...slot }); count++;
      }
    }
  }
  return { blocks: next.blocks, count, remaining: prioritized(next).reduce((n, t) => n + unplanned(next, t), 0) };
}
