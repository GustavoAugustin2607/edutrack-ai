'use client';
import { useState } from 'react';
import {
  ArrowRight,
  Plus,
  CalendarDays,
  BookOpen,
  Trash2,
  RotateCcw,
  Check,
  LockKeyhole,
  Trophy,
  Zap,
  Flame,
  Timer,
  Target,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Archive,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Field, Choice, Empty } from './ui';
import {
  addDays,
  buildPlan,
  day,
  metrics,
  minutesLabel,
  prettyDate,
  prioritized,
  reviewCard,
  gameOf,
  taskMinutes,
  type Workspace,
  type Subject,
  type Task,
  type Block,
} from './model';
type Common = {
  state: Workspace;
  change: (f: (s: Workspace) => Workspace) => boolean;
  notify: (s: string) => void;
};
export function Planner({
  state,
  change,
  notify,
  onFocus,
}: { onFocus: (t: Task) => void } & Common) {
  const [offset, setOffset] = useState(0);
  const start = addDays(day(), offset);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [editing, setEditing] = useState<Block | null>(null);
  const [shortfall, setShortfall] = useState(0);
  return (
    <>
      <div className="planner-controls card">
        <div>
          <h2>Uma semana que cabe na sua rotina</h2>
          <p>
            Reserve 20% do tempo para imprevistos. O plano considera prazos e
            prioridades.
          </p>
        </div>
        <div className="planner-inputs">
          <Field label="Minutos disponíveis / dia">
            <input
              type="number"
              min={15}
              max={720}
              value={state.settings.daily_minutes}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    daily_minutes: Math.max(
                      15,
                      Math.min(720, Number(e.target.value)),
                    ),
                  },
                }))
              }
            />
          </Field>
          <Field label="Começar às">
            <input
              type="time"
              value={state.settings.study_start}
              onChange={(e) =>
                change((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    study_start: e.target.value || '14:00',
                  },
                }))
              }
            />
          </Field>
          <button
            className="btn primary"
            onClick={() => {
              const plan = buildPlan(state, start);
              setShortfall(plan.unscheduled);
              change((s) => ({
                ...s,
                blocks: [
                  ...s.blocks.filter((b) => b.date < start || b.date > week[6]),
                  ...plan.blocks,
                ],
              }));
              notify(`${plan.blocks.length} blocos de estudo organizados.`);
            }}
          >
            <Zap size={17} /> Gerar plano
          </button>
        </div>
      </div>
      {shortfall > 0 && (
        <div className="notice">
          Faltam horários para {minutesLabel(shortfall)}. Ajuste a
          disponibilidade ou a estimativa das tarefas.
        </div>
      )}
      <div className="calendar-heading">
        <button
          className="icon-button"
          aria-label="Semana anterior"
          onClick={() => setOffset(offset - 7)}
        >
          <ChevronLeft size={18} />
        </button>
        <h2>
          {prettyDate(start)} — {prettyDate(week[6])}
        </h2>
        <button
          className="icon-button"
          aria-label="Próxima semana"
          onClick={() => setOffset(offset + 7)}
        >
          <ChevronRight size={18} />
        </button>
        <button className="text-button" onClick={() => setOffset(0)}>
          Hoje
        </button>
      </div>
      <div className="calendar-board">
        {week.map((date) => (
          <section
            className={'calendar-day ' + (date === day() ? 'today' : '')}
            key={date}
          >
            <header>
              <span>
                {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'short',
                })}
              </span>
              <b>{new Date(date + 'T12:00:00').getDate()}</b>
              <small>
                {state.blocks
                  .filter((b) => b.date === date)
                  .reduce((a, b) => a + b.minutes, 0)}{' '}
                min
              </small>
            </header>
            <div className="day-blocks">
              {state.blocks
                .filter((b) => b.date === date)
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((b) => {
                  const t = state.tasks.find((t) => t.id === b.task_id);
                  if (!t) return null;
                  const sub = state.subjects.find((s) => s.id === t.subject_id);
                  return (
                    <article
                      className={
                        'calendar-block ' +
                        (sub?.color ?? 'blue') +
                        (t.status === 'done' ? ' completed' : '')
                      }
                      key={b.id}
                    >
                      <span>
                        {b.time} · {b.minutes} min
                      </span>
                      <button onClick={() => onFocus(t)}>{t.title}</button>
                      <small>{sub?.name}</small>
                      <div>
                        <button
                          aria-label={'Reagendar ' + t.title}
                          onClick={() => setEditing(b)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          aria-label={'Remover bloco ' + t.title}
                          onClick={() =>
                            change((s) => ({
                              ...s,
                              blocks: s.blocks.filter((x) => x.id !== b.id),
                            }))
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              {!state.blocks.some((b) => b.date === date) && (
                <p className="day-empty">Livre</p>
              )}
            </div>
          </section>
        ))}
      </div>
      {editing && (
        <form
          className="card inline-editor"
          onSubmit={(e) => {
            e.preventDefault();
            change((s) => ({
              ...s,
              blocks: s.blocks.map((b) => (b.id === editing.id ? editing : b)),
            }));
            setEditing(null);
            notify('Bloco reagendado.');
          }}
        >
          <Field label="Data">
            <input
              type="date"
              required
              value={editing.date}
              onChange={(e) => setEditing({ ...editing, date: e.target.value })}
            />
          </Field>
          <Field label="Horário">
            <input
              type="time"
              required
              value={editing.time}
              onChange={(e) => setEditing({ ...editing, time: e.target.value })}
            />
          </Field>
          <button className="btn primary">Salvar horário</button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setEditing(null)}
          >
            Cancelar
          </button>
        </form>
      )}
      <p className="form-help">
        Gerar novamente substitui os blocos desta semana. Clique em uma tarefa
        para estudar ou no lápis para reagendar.
      </p>
    </>
  );
}
export function Subjects({
  state,
  change,
  notify,
  edit,
  onTasks,
  onDelete,
}: { edit: (s: Subject) => void; onTasks: (id: string) => void; onDelete: (s: Subject) => void } & Common) {
  const [archived, setArchived] = useState(false);
  return (
    <>
      <div className="list-toolbar">
        <p>
          {state.subjects.filter((s) => !s.archived).length} disciplinas ativas
        </p>
        <button className="text-button" onClick={() => setArchived(!archived)}>
          {archived ? 'Mostrar ativas' : 'Ver arquivadas'}
        </button>
      </div>
      <div className="discipline-grid">
        {state.subjects
          .filter((s) => s.archived === archived)
          .map((s) => {
            const tasks = state.tasks.filter((t) => t.subject_id === s.id),
              done = tasks.filter((t) => t.status === 'done').length;
            const min = state.sessions
              .filter((x) => x.subject_id === s.id)
              .reduce((a, x) => a + x.minutes, 0);
            return (
              <article key={s.id} className="card discipline-card">
                <div className="flex-between">
                  <span className={'stat-icon ' + s.color}>
                    <BookOpen />
                  </span>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={'Editar ' + s.name}
                      onClick={() => edit(s)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={
                        (s.archived ? 'Restaurar ' : 'Arquivar ') + s.name
                      }
                      onClick={() => {
                        change((w) => ({
                          ...w,
                          subjects: w.subjects.map((x) =>
                            x.id === s.id ? { ...x, archived: !x.archived } : x,
                          ),
                        }));
                        notify(
                          s.archived
                            ? 'Disciplina restaurada.'
                            : 'Disciplina arquivada. As tarefas foram preservadas.',
                        );
                      }}
                    >
                      {s.archived ? (
                        <RotateCcw size={16} />
                      ) : (
                        <Archive size={16} />
                      )}
                    </button>
                    <button
                      className="icon-button"
                      aria-label={'Excluir disciplina ' + s.name}
                      title={'Excluir disciplina ' + s.name}
                      onClick={() => onDelete(s)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h2>{s.name}</h2>
                <p className="teacher">
                  {s.teacher || 'Professor não informado'} · {s.hours}h
                </p>
                <p className="discipline-description">
                  {s.description ||
                    'Adicione uma descrição para organizar seus conteúdos.'}
                </p>
                <div className="flex-between progress-label">
                  <span>
                    {tasks.length
                      ? `${done} de ${tasks.length} tarefas`
                      : 'Sem tarefas ainda'}
                  </span>
                  <b>
                    {tasks.length ? Math.round((done / tasks.length) * 100) : 0}
                    %
                  </b>
                </div>
                <Progress
                  value={tasks.length ? (done / tasks.length) * 100 : 0}
                  aria-label={'Progresso em ' + s.name}
                />
                <footer>
                  <span>
                    <Timer size={14} /> {minutesLabel(min)} estudados
                  </span>
                  <button className="text-button" onClick={() => onTasks(s.id)}>
                    Abrir tarefas <ArrowRight size={15} />
                  </button>
                </footer>
              </article>
            );
          })}
      </div>
      {!state.subjects.some((s) => s.archived === archived) && (
        <Empty
          text={
            archived
              ? 'Nenhuma disciplina arquivada.'
              : 'Crie sua primeira disciplina para começar.'
          }
        />
      )}
    </>
  );
}
export function Reviews({
  state,
  change,
  notify,
  newCard,
}: { newCard: () => void } & Common) {
  const [revealed, setRevealed] = useState(false),
    [filter, setFilter] = useState('all'),
    [combo, setCombo] = useState(0);
  const due = state.cards.filter(
    (c) => c.due_date <= day() && (filter === 'all' || c.subject_id === filter),
  );
  const card = due[0];
  return (
    <div className="reviews-layout">
      <section>
        <div className="review-toolbar">
          <Choice
            label="Filtrar cartões por disciplina"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setRevealed(false);
            }}
            items={[
              { value: 'all', label: 'Todas as disciplinas' },
              ...state.subjects.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <span>
            {due.length} para revisar
            {combo >= 2 && <b className="g-combo">Combo ×{combo}</b>}
          </span>
        </div>
        {card ? (
          <article
            className={'flashcard ' + (revealed ? 'flipped' : '')}
            key={card.id}
          >
            <span className="flashcard-subject">
              {state.subjects.find((s) => s.id === card.subject_id)?.name}
            </span>
            <small>
              {revealed ? 'RESPOSTA' : 'TENTE LEMBRAR ANTES DE VIRAR'}
            </small>
            <h2>{revealed ? card.answer : card.question}</h2>
            {!revealed ? (
              <button className="btn primary" onClick={() => setRevealed(true)}>
                <RotateCcw size={17} /> Mostrar resposta
              </button>
            ) : (
              <div className="rating-buttons">
                {[
                  { key: 'again', label: 'Não lembrei', days: 1 },
                  {
                    key: 'hard',
                    label: 'Difícil',
                    days: [1, 3, 7, 14, 30][card.stage],
                  },
                  {
                    key: 'good',
                    label: 'Lembrei',
                    days: [1, 3, 7, 14, 30][Math.min(4, card.stage + 1)],
                  },
                  {
                    key: 'easy',
                    label: 'Fácil',
                    days: [1, 3, 7, 14, 30][Math.min(4, card.stage + 2)],
                  },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => {
                      const today = day();
                      change((s) => ({
                        ...s,
                        game: {
                          ...gameOf(s),
                          reviews: {
                            ...gameOf(s).reviews,
                            [today]: (gameOf(s).reviews[today] ?? 0) + 1,
                          },
                        },
                        cards: s.cards.map((c) =>
                          c.id === card.id
                            ? reviewCard(
                                c,
                                r.key as 'again' | 'hard' | 'good' | 'easy',
                              )
                            : c,
                        ),
                      }));
                      setRevealed(false);
                      const nextCombo = r.key === 'again' ? 0 : combo + 1;
                      setCombo(nextCombo);
                      notify(
                        `Revisão salva. Próxima em ${r.days} dia(s). +5 XP${nextCombo >= 3 ? ` · Combo ×${nextCombo}!` : ''}`,
                      );
                    }}
                  >
                    {r.label}
                    <small>{r.days} dia(s)</small>
                  </button>
                ))}
              </div>
            )}
          </article>
        ) : (
          <div className="card review-done">
            <Check size={42} />
            <h2>Revisões em dia.</h2>
            <p>
              Seus cartões voltam na data programada. Você pode adicionar novos
              conteúdos agora.
            </p>
            <button className="btn primary" onClick={newCard}>
              <Plus size={17} /> Criar cartão
            </button>
          </div>
        )}
        <p className="form-help">
          A próxima revisão é ajustada conforme sua resposta: 1, 3, 7, 14 ou 30
          dias.
        </p>
      </section>
      <aside className="card card-library">
        <h2 className="small-heading">
          Seus cartões <span className="count">{state.cards.length}</span>
        </h2>
        {state.cards.map((c) => (
          <div key={c.id}>
            <p>
              {c.question}
              <small>Próxima revisão: {prettyDate(c.due_date)}</small>
            </p>
            <button
              className="icon-button"
              aria-label={'Excluir cartão ' + c.question}
              onClick={() => {
                change((s) => ({
                  ...s,
                  cards: s.cards.filter((x) => x.id !== c.id),
                }));
                notify('Cartão removido.');
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </aside>
    </div>
  );
}
export function Achievements({ state }: Pick<Common, 'state'>) {
  const m = metrics(state);
  const badges = [
    {
      icon: Check,
      title: 'Primeiro passo',
      text: 'Conclua sua primeira tarefa.',
      value: m.done,
      max: 1,
    },
    {
      icon: Target,
      title: 'Missão cumprida',
      text: 'Conclua 10 tarefas.',
      value: m.done,
      max: 10,
    },
    {
      icon: Timer,
      title: 'Mente em foco',
      text: 'Acumule 60 minutos de estudo.',
      value: state.sessions.reduce((a, s) => a + s.minutes, 0),
      max: 60,
    },
    {
      icon: Flame,
      title: 'No seu ritmo',
      text: 'Estude em 3 dias nesta semana.',
      value: m.days,
      max: 3,
    },
    {
      icon: BookOpen,
      title: 'Memória em dia',
      text: 'Revise 10 cartões.',
      value: state.cards.reduce((a, c) => a + c.reviews, 0),
      max: 10,
    },
    {
      icon: Zap,
      title: 'Explorador',
      text: 'Alcance 1.000 XP.',
      value: m.points,
      max: 1000,
    },
  ];
  return (
    <>
      <div className="level-banner">
        <div className="level-emblem">
          <Trophy size={36} />
        </div>
        <div>
          <span>SEU PROGRESSO</span>
          <h2>
            Nível {m.level} ·{' '}
            {m.level < 3
              ? 'Iniciante'
              : m.level < 6
                ? 'Explorador'
                : 'Especialista'}
          </h2>
          <p>{m.points} XP acumulados. Cada sessão conta.</p>
        </div>
        <div className="level-progress">
          <div className="flex-between">
            <span>{m.points % 250} / 250 XP</span>
            <b>Próximo nível</b>
          </div>
          <Progress value={m.levelProgress} />
        </div>
      </div>
      <div className="badges-grid">
        {badges.map((b) => (
          <article
            className={
              'card badge-card ' + (b.value >= b.max ? 'unlocked' : 'locked')
            }
            key={b.title}
          >
            <div className="badge-symbol">
              <b.icon size={32} />
              {b.value < b.max && <LockKeyhole size={13} />}
            </div>
            <h2>{b.title}</h2>
            <p>{b.text}</p>
            <Progress value={Math.min(100, (b.value / b.max) * 100)} />
            <span>
              {b.value >= b.max
                ? 'Conquistado'
                : `${Math.min(b.value, b.max)} de ${b.max}`}
            </span>
          </article>
        ))}
      </div>
      <div className="gamification-note">
        <Zap size={20} />
        <p>
          <b>Pontos por progresso, sem pressão.</b> Você ganha 30 XP por tarefa,
          2 XP por minuto estudado e 5 XP por revisão. Descansar não remove seus
          pontos. Reabrir uma tarefa não gera pontos extras.
        </p>
      </div>
    </>
  );
}
export function Insights({
  state,
  onPlan,
  onFocus,
}: {
  state: Workspace;
  onPlan: () => void;
  onFocus: (t: Task) => void;
}) {
  const tasks = prioritized(state),
    m = metrics(state);
  const completed = state.tasks.filter(
    (t) =>
      t.status === 'done' &&
      taskMinutes(state, t) > 0 &&
      t.estimated_minutes > 0,
  );
  const ratio =
    completed.length >= 3
      ? completed
          .map((t) => taskMinutes(state, t) / t.estimated_minutes)
          .sort((a, b) => a - b)[Math.floor(completed.length / 2)]
      : null;
  return (
    <div className="insights-layout">
      <section className="card assistant-main">
        <span className="assistant-label">
          <Zap size={17} /> ASSISTENTE DE ESTUDOS
        </span>
        <h2>
          Seu plano começa
          <br />
          com a próxima decisão.
        </h2>
        <p>
          Recomendações calculadas com seus prazos, prioridades e tempo de
          estudo.
        </p>
        {tasks[0] ? (
          <div className="recommendation">
            <span>COMECE POR AQUI</span>
            <h3>{tasks[0].title}</h3>
            <p>
              {prettyDate(tasks[0].due_date)} ·{' '}
              {minutesLabel(
                Math.max(
                  0,
                  tasks[0].estimated_minutes - taskMinutes(state, tasks[0]),
                ),
              )}{' '}
              restantes · prioridade{' '}
              {
                { high: 'alta', medium: 'média', low: 'baixa' }[
                  tasks[0].priority
                ]
              }
            </p>
            <button className="btn primary" onClick={() => onFocus(tasks[0])}>
              Estudar agora <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <Empty text="Tudo em dia. Adicione uma tarefa para receber uma sugestão." />
        )}
        <button className="btn secondary" onClick={onPlan}>
          <CalendarDays size={18} /> Organizar a semana
        </button>
      </section>
      <section className="insight-stack">
        <article className="card">
          <Timer className="accent-icon" />
          <h3>Estimativa × realidade</h3>
          <p>
            {ratio
              ? `Em ${completed.length} tarefas com tempo registrado, a mediana do tempo real foi ${Math.round(ratio * 100)}% da estimativa. ${ratio > 1.15 ? 'Considere reservar mais tempo para as próximas tarefas.' : 'Suas estimativas estão próximas do ritmo registrado.'}`
              : 'Conclua pelo menos 3 tarefas com tempo registrado para receber uma sugestão de ajuste nas estimativas.'}
          </p>
        </article>
        <article className="card">
          <Target className="accent-icon" />
          <h3>Espaço para respirar</h3>
          <p>
            Seu plano reserva {Math.round(state.settings.daily_minutes * 0.2)}{' '}
            minutos por dia para imprevistos. Você estudou em {m.days} dos
            últimos 7 dias.
          </p>
        </article>
        <article className="card">
          <BookOpen className="accent-icon" />
          <h3>Revisar também é avançar</h3>
          <p>
            {state.cards.filter((c) => c.due_date <= day()).length} cartões
            estão prontos para revisão. Tente responder antes de virar cada
            cartão.
          </p>
        </article>
      </section>
      <p className="form-help">
        Estas sugestões usam regras transparentes. Um modelo de IA generativa
        ainda não está conectado.
      </p>
    </div>
  );
}
