'use client';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  CalendarDays,
  BookOpen,
  CheckCheck,
  Timer,
  Layers,
  Trophy,
  Sparkles,
  ArrowUpRight,
  Plus,
  Play,
  Search,
  Bell,
  ChevronRight,
  Cloud,
  Check,
  ExternalLink,
  Trash2,
  X,
  Gamepad2,
} from 'lucide-react';
import Arcade from './Arcade';
import { ALL_NAV, BottomTabs, NAV_GROUPS, Sidebar, Topbar } from './Shell';
import { dailyQuests, weeklyQuests, chestKey } from './game';
import SortingHat from './SortingHat';
import { HOUSES, HOUSE_CHANGE_PRICE } from './houses';
import { gameOf } from './model';
import { coinBalance } from './game';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { useWorkspace } from './useWorkspace';
import {
  day,
  addDays,
  minutesLabel,
  prettyDate,
  prioritized,
  priorityScore,
  withoutSubject,
  type Task,
  type Subject,
} from './model';
import { Modal, TabBar, Choice, Empty } from './ui';
import { TaskForm, SubjectForm, CardForm } from './Forms';
import { Subjects, Reviews } from './StudyPages';
import Journey from './Journey';
import { GameHUD, useGame } from './GameUI';
import { taskXP } from './game';
import {
  Integrations,
  AuthForm,
  SettingsPage,
  downloadFile,
} from './AccountPages';
import { safeGoogleUrl } from './classroom';
import Focus from './Focus';
import StudyDesk from './StudyDesk';
import Dashboard from './Dashboard';
import Analysis from './Analysis';
import AIStudio from './AIStudio';
import { AuthGate } from './AuthGate';
import type { AIKind } from './ai';
import { useEntrance } from './motion';
const nav = ALL_NAV;
const subtitles: Record<string, string> = {
  Planejamento: 'Prazos à vista. Tempo bem distribuído.',
  Tarefas: 'Tire da cabeça. Coloque em movimento.',
  Disciplinas: 'Conteúdos, tarefas e tempo de estudo em um só lugar.',
  'Modo foco': 'Uma tarefa. Um intervalo. Sua atenção aqui.',
  Revisões: 'Lembrar hoje para não reaprender amanhã.',
  Conquistas: 'Missões, conquistas, loja e ranking.',
  Assistente: 'Crie práticas, explicações e planos a partir do que você estuda.',
  Integrações: 'Conecte suas ferramentas de estudo.',
  Configurações: 'Ajuste seu espaço e suas preferências.',
};
export default function EduTrack() {
  const { state, ready, user, saving, error, change, signOut, resetDemo } =
    useWorkspace();
  const [page, setPage] = useState('Meu dia'),
    [modal, setModal] = useState(''),
    [editTask, setEditTask] = useState<Task | undefined>(),
    [editSubject, setEditSubject] = useState<Subject | undefined>(),
    [selectedTask, setSelectedTask] = useState(''),
    [toast, setToast] = useState(''),
    [filter, setFilter] = useState('today'),
    [subjectFilter, setSubjectFilter] = useState('all'),
    [query, setQuery] = useState(''),
    [recovery, setRecovery] = useState(false),
    [deleteTask, setDeleteTask] = useState<Task | null>(null),
    [deleteSubject, setDeleteSubject] = useState<Subject | null>(null),
    [entry, setEntry] = useState<'gate' | 'demo' | 'account'>('gate'),
    [journeyTab, setJourneyTab] = useState('overview'),
    [hatOpen, setHatOpen] = useState(false),
    [aiSeed, setAiSeed] = useState<{
      kind: AIKind;
      prompt?: string;
      subjectId?: string;
      nonce: number;
    }>({ kind: 'quiz', nonce: 0 });
  const surface = useRef<HTMLDivElement>(null),
    navigation = useRef<HTMLElement>(null),
    hadAccount = useRef(false),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    snapshot = useRef(state);
  snapshot.current = state;
  useEntrance(surface, page);
  const notify = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5500);
  };
  const go = (name: string) => {
    if (name === 'Meu dia') {
      setFilter('today');
      setSubjectFilter('all');
      setQuery('');
    }
    setPage(name);
    location.hash = encodeURIComponent(name);
  };
  const game = useGame({
    state,
    ready,
    account: user?.id ?? 'demo',
    change,
    notify,
    user,
  });
  useEffect(() => {
    if (!ready || !user || gameOf(state).house) return;
    try {
      if (sessionStorage.getItem('edutrack.hat.later') === user.id) return;
    } catch {}
    setHatOpen(true);
  }, [ready, user, state]);
  const finishSorting = (house: keyof typeof HOUSES, scores: Record<string, number>, share: boolean) => {
    const current = gameOf(state).house;
    const changed = !!current && current.id !== house;
    if (changed && coinBalance(state).balance < HOUSE_CHANGE_PRICE) {
      notify(`Mudar de casa custa ${HOUSE_CHANGE_PRICE} moedas. Você continua em ${HOUSES[current.id].name}.`);
      setHatOpen(false);
      return;
    }
    const today = day();
    const accepted = change(s => {
      const g = gameOf(s);
      return {
        ...s,
        game: {
          ...g,
          house: { id: house, date: today, scores },
          public: user ? share : g.public,
          purchases: changed ? [...g.purchases, { item: 'house-change', date: today, price: HOUSE_CHANGE_PRICE }] : g.purchases,
        },
      };
    });
    setHatOpen(false);
    if (accepted) {
      notify(current && !changed ? `O chapéu confirmou: você é de ${HOUSES[house].name}!` : `Bem-vindo à casa ${HOUSES[house].name}!`);
      setJourneyTab('house');
    }
  };
  const openJourney = (tab: string) => {
    setJourneyTab(tab);
    go('Conquistas');
  };
  const openAI = (kind: AIKind, prompt?: string, subjectId?: string) => {
    setAiSeed(current => ({
      kind,
      prompt,
      subjectId,
      nonce: current.nonce + 1,
    }));
    go('Assistente');
  };
  const openTasks = (subjectId?: string) => {
    setFilter('all');
    setSubjectFilter(subjectId ?? 'all');
    setQuery('');
    go('Tarefas');
  };
  const newTask = () => {
    if (!state.subjects.some((s) => !s.archived)) {
      setEditSubject(undefined);
      setModal('subject');
      notify('Crie uma disciplina para organizar sua primeira tarefa.');
      return;
    }
    setEditTask(undefined);
    setModal('task');
  };
  const focus = (t?: Task) => {
    if (t) {
      setSelectedTask(t.id);
      if (t.status === 'todo')
        change((s) => ({
          ...s,
          tasks: s.tasks.map((x) =>
            x.id === t.id ? { ...x, status: 'doing' } : x,
          ),
        }));
    }
    go('Modo foco');
  };
  const toggle = (t: Task) => {
    const done = t.status !== 'done';
    change((s) => ({
      ...s,
      tasks: s.tasks.map((x) =>
        x.id === t.id
          ? {
              ...x,
              status: done ? 'done' : 'todo',
              awarded: x.awarded || done,
              completed_at: done ? new Date().toISOString() : undefined,
            }
          : x,
      ),
    }));
    notify(
      done
        ? t.awarded
          ? 'Tarefa concluída.'
          : `Tarefa concluída · +${taskXP({ ...t, completed_at: new Date().toISOString() })} XP`
        : 'Tarefa reaberta.',
    );
  };
  useEffect(() => {
    const onHash = () => {
      const name = decodeURIComponent(location.hash.slice(1));
      if (
        [...nav.map((n) => n.name), 'Integrações', 'Configurações'].includes(
          name,
        )
      )
        setPage(name);
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setModal('search');
      }
    };
    window.addEventListener('keydown', onKey);
    if (new URLSearchParams(location.search).get('recovery') === '1') {
      setRecovery(true);
      setModal('auth');
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    const rail = navigation.current;
    const active = rail?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollTo({
      left: Math.max(
        0,
        active.offsetLeft - rail.clientWidth / 2 + active.offsetWidth / 2,
      ),
      behavior: 'auto',
    });
  }, [page]);
  useEffect(() => {
    if (user) {
      hadAccount.current = true;
      setEntry('account');
      return;
    }
    if (ready && hadAccount.current) {
      hadAccount.current = false;
      setEntry('gate');
    }
  }, [ready, user]);
  useEffect(() => {
    if (!ready) return;
    const doc = document as Document & {
      modelContext?: {
        registerTool: (
          tool: unknown,
          options: { signal: AbortSignal },
        ) => unknown;
      };
    };
    if (!doc.modelContext?.registerTool) return;
    const life = new AbortController();
    const tools = [
      {
        name: 'edutrack_list_tasks',
        title: 'Listar tarefas de estudo',
        description: 'Lista as tarefas e disciplinas do espaço atual.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({
          tasks: snapshot.current.tasks,
          subjects: snapshot.current.subjects,
        }),
      },
      {
        name: 'edutrack_start_task_creation',
        title: 'Preparar nova tarefa',
        description:
          'Abre o formulário de nova tarefa para o estudante revisar e salvar.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input: unknown) => {
          if (!input || typeof input !== 'object' || Object.keys(input).length)
            throw new Error('Use um objeto vazio.');
          setEditTask(undefined);
          setModal('task');
          return { status: 'form_opened' };
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(
          doc.modelContext.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => life.abort();
  }, [ready]);
  const today = day(),
    pending = prioritized(state),
    todayTasks = pending.filter((t) => t.due_date && t.due_date <= today),
    reviewCount = state.cards.filter((c) => c.due_date <= today).length;
  const filtered = state.tasks
    .filter(
      (t) =>
        (subjectFilter === 'all' || t.subject_id === subjectFilter) &&
        t.title
          .toLocaleLowerCase('pt-BR')
          .includes(query.toLocaleLowerCase('pt-BR')) &&
        (filter === 'done'
          ? t.status === 'done'
          : filter === 'today'
            ? t.status !== 'done' && !!t.due_date && t.due_date <= today
            : filter === 'week'
              ? t.status !== 'done' &&
                !!t.due_date &&
                t.due_date <= addDays(today, 6)
              : filter === 'doing'
                ? t.status === 'doing'
                : filter === 'todo'
                  ? t.status === 'todo'
                  : true),
    )
    .sort((a, b) => priorityScore(b) - priorityScore(a));
  const common = { state, change, notify };
  const taskRow = (t: Task) => {
    const sub = state.subjects.find((s) => s.id === t.subject_id);
    return (
      <div
        className={'task-row ' + (t.status === 'done' ? 'is-done' : '')}
        key={t.id}
      >
        <Checkbox
          checked={t.status === 'done'}
          onCheckedChange={() => toggle(t)}
          aria-label={
            (t.status === 'done' ? 'Reabrir ' : 'Concluir ') + t.title
          }
          className="task-check"
        />
        <div className="task-info">
          <button
            onClick={() => {
              setEditTask(t);
              setModal('task');
            }}
          >
            <h3>{t.title}</h3>
          </button>
          <p>
            <span className={'subject-dot ' + (sub?.color ?? 'blue')} />
            {sub?.name ?? 'Sem disciplina'}
            <span>·</span>
            <Timer size={13} />
            {minutesLabel(t.estimated_minutes)}
            {t.google_id && <span className="source-label">Classroom</span>}
          </p>
        </div>
        {t.status !== 'done' && !t.awarded && (
          <span className="task-xp" title="XP ao concluir (com bônus de prioridade e prazo)">
            +{taskXP({ ...t, completed_at: new Date().toISOString() })} XP
          </span>
        )}
        <span
          className={
            'task-tag ' +
            (t.due_date && t.due_date <= today && t.status !== 'done'
              ? 'urgent'
              : '')
          }
        >
          {t.due_date && t.due_date < today && t.status !== 'done'
            ? 'Atrasada · '
            : ''}
          {prettyDate(t.due_date)}
        </span>
        {page === 'Tarefas' && (
          <div className="row-actions">
            <button
              className="icon-button"
              aria-label={'Excluir ' + t.title}
              onClick={() => setDeleteTask(t)}
            >
              <Trash2 size={15} />
            </button>
            {safeGoogleUrl(t.google_url) && (
              <a
                className="icon-button"
                href={safeGoogleUrl(t.google_url)}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir no Classroom"
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        )}
        {t.status !== 'done' && (
          <button
            className="play-task"
            onClick={() => focus(t)}
            aria-label={'Estudar ' + t.title}
          >
            <Play size={15} />
          </button>
        )}
      </div>
    );
  };
  if (!ready) {
    return (
      <main className="access-loading" aria-live="polite">
        <span className="track-mark" aria-hidden="true"><i/><i/><i/></span>
        <p>Preparando seu espaço de estudos…</p>
      </main>
    );
  }
  if (!user && entry === 'gate') {
    return (
      <AuthGate
        notify={notify}
        onDemo={() => {
          window.scrollTo({ top: 0, behavior: 'auto' });
          setEntry('demo');
        }}
        onSuccess={() => {}}
      />
    );
  }
  const claimable =
    [...dailyQuests(state), ...weeklyQuests(state)].filter(q => q.done && !q.claimed).length +
    (dailyQuests(state).every(q => q.claimed) && !gameOf(state).claims.some(c => c.key === chestKey()) ? 1 : 0);
  const shell = {
    page,
    go,
    summary: game.summary,
    name: state.settings.name,
    house: gameOf(state).house?.id,
    badges: {
      Tarefas: { count: todayTasks.length, tone: 'alert' as const },
      Revisões: { count: reviewCount, tone: 'alert' as const },
      Conquistas: { count: claimable, tone: 'reward' as const },
    },
    user,
    dark: state.settings.dark,
    onToggleTheme: () => change(s => ({ ...s, settings: { ...s.settings, dark: !s.settings.dark } })),
    onLogin: () => setModal('auth'),
    onSearch: () => setModal('search'),
    onNotifications: () => setModal('notifications'),
    hasAlerts: todayTasks.length > 0,
    openJourney,
  };
  return (
    <div className="desk-app app-v2" data-theme={game.summary.theme}>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <Sidebar {...shell} />
      <div className="app-shell">
        <Topbar {...shell} />
        <main className="workspace" id="conteudo">
          <span className="sr-only" aria-live="polite">Página atual: {nav.find(item => item.name === page)?.label ?? page}</span>
          {!['Meu dia','Análise','Planejamento','Assistente','Conquistas','Arena'].includes(page)&&<div className="greeting"><div><h1>{nav.find(item => item.name === page)?.label ?? page}</h1><p>{subtitles[page]}</p></div>{['Tarefas','Disciplinas','Revisões'].includes(page)&&<button className="btn primary" onClick={()=>{if(page==='Disciplinas'){setEditSubject(undefined);setModal('subject')}else if(page==='Revisões')setModal('card');else newTask()}}><Plus size={18}/>{page==='Disciplinas'?'Nova disciplina':page==='Revisões'?'Novo cartão':'Nova tarefa'}</button>}</div>}
          {error && (
            <div className="inline-error" role="alert">
              {error}{' '}
              <button
                onClick={() =>
                  downloadFile(
                    'edutrack-recuperacao.json',
                    JSON.stringify(state, null, 2),
                  )
                }
              >
                Exportar cópia
              </button>{' '}
              <button onClick={() => location.reload()}>Recarregar</button>
            </div>
          )}
          {!ready ? (
            <div className="card loading-state">
              Carregando seu espaço de estudos…
            </div>
          ) : (
            <div ref={surface}>
              {page === 'Meu dia' && <Dashboard state={state} summary={game.summary} onClaim={game.claimQuest} onChest={game.openChest} onJourney={openJourney} onGo={go} onFocus={focus} onPlan={() => go('Planejamento')} onTasks={openTasks} onReviews={() => go('Revisões')} onAI={openAI} />}
              {page === 'Análise' && <Analysis state={state} onTask={task => { setEditTask(task); setModal('task'); }} onPlan={() => go('Planejamento')} />}
              <div hidden={page !== 'Planejamento'}><StudyDesk {...common} onFocus={focus} onEdit={t=>{setEditTask(t);setModal('task')}} onToggle={toggle} newTask={newTask} onSettings={()=>go('Configurações')} onReviews={()=>go('Revisões')}/></div>
              {page === 'Tarefas' && (
                <section className="card task-list-card">
                  <div className="task-filters">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        aria-label="Buscar tarefa"
                        placeholder="Buscar uma tarefa…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <Choice
                      label="Filtrar disciplina"
                      value={subjectFilter}
                      onChange={setSubjectFilter}
                      items={[
                        { value: 'all', label: 'Todas as disciplinas' },
                        ...state.subjects.map((s) => ({
                          value: s.id,
                          label: s.name,
                        })),
                      ]}
                    />
                  </div>
                  <TabBar
                    value={filter}
                    onChange={setFilter}
                    items={[
                      { value: 'all', label: 'Todas' },
                      { value: 'todo', label: 'A fazer' },
                      { value: 'doing', label: 'Em andamento' },
                      { value: 'today', label: 'Para hoje' },
                      { value: 'done', label: 'Concluídas' },
                    ]}
                  />
                  {filtered.map(taskRow)}
                  {!filtered.length && (
                    <Empty text="Nenhuma tarefa encontrada com esses filtros." />
                  )}
                </section>
              )}
              {page === 'Disciplinas' && (
                <Subjects
                  {...common}
                  edit={(s) => {
                    setEditSubject(s);
                    setModal('subject');
                  }}
                  onTasks={(s) => {
                    setSubjectFilter(s);
                    setFilter('all');
                    go('Tarefas');
                  }}
                  onDelete={setDeleteSubject}
                />
              )}
              <div hidden={page !== 'Modo foco'}>
                <Focus
                  key={user?.id ?? 'demo'}
                  {...common}
                  selectedTask={selectedTask}
                  account={user?.id ?? 'demo'}
                />
              </div>
              {page === 'Revisões' && (
                <Reviews {...common} newCard={() => setModal('card')} />
              )}
              {page === 'Conquistas' && (
                <Journey
                  {...common}
                  summary={game.summary}
                  tab={journeyTab}
                  setTab={setJourneyTab}
                  claimQuest={game.claimQuest}
                  openChest={game.openChest}
                  user={user}
                  login={() => setModal('auth')}
                  onSort={() => setHatOpen(true)}
                  go={go}
                />
              )}
              {page === 'Arena' && (
                <Arcade
                  {...common}
                  onSort={() => setHatOpen(true)}
                  onCreateCards={() => setModal('card')}
                  onAI={() => openAI('flashcards', 'Crie flashcards objetivos sobre o conteúdo que estou estudando.')}
                  user={user}
                  login={() => setModal('auth')}
                />
              )}
              {page === 'Assistente' && (
                <AIStudio
                  key={aiSeed.nonce}
                  {...common}
                  user={user}
                  login={() => setModal('auth')}
                  initial={aiSeed}
                  onPlan={() => go('Planejamento')}
                  onFocus={focus}
                />
              )}
              {page === 'Integrações' && (
                <Integrations key={user?.id ?? 'demo'} {...common} />
              )}
              {page === 'Configurações' && (
                <SettingsPage
                  {...common}
                  signOut={signOut}
                  saving={saving}
                  user={user}
                  login={() => setModal('auth')}
                  resetDemo={() => setModal('reset')}
                  onSort={() => setHatOpen(true)}
                  onJourney={openJourney}
                />
              )}
            </div>
          )}
          <footer className="page-footer">
            <span>EduTrack · Seu semestre, organizado.</span>
            <span>
              <span className="status-dot" />
              {saving
                ? 'Salvando…'
                : user
                  ? 'Sincronizado com sua conta'
                  : 'Demonstração · dados salvos neste navegador'}
            </span>
          </footer>
        </main>
      </div>
      <BottomTabs {...shell} />
      <Modal
        open={modal === 'task'}
        onClose={() => setModal('')}
        title={editTask ? 'Editar tarefa' : 'Nova tarefa'}
        description="Transforme o próximo conteúdo em uma ação concreta."
      >
        <TaskForm
          key={editTask?.id ?? 'new'}
          task={editTask}
          state={state}
          change={change}
          close={() => {
            setModal('');
            notify(editTask ? 'Tarefa atualizada.' : 'Tarefa criada.');
          }}
        />
        {editTask?.google_id && (
          <p className="form-help">
            Classroom:{' '}
            {{
              NEW: 'Não aberta',
              CREATED: 'Em preparação',
              TURNED_IN: 'Entregue',
              RETURNED: 'Devolvida pelo professor',
              RECLAIMED_BY_STUDENT: 'Entrega cancelada',
            }[editTask.google_state ?? 'NEW'] ?? 'Situação desconhecida'}
            . A conclusão no EduTrack é independente.
          </p>
        )}
      </Modal>
      <Modal
        open={modal === 'subject'}
        onClose={() => setModal('')}
        title={editSubject ? 'Editar disciplina' : 'Nova disciplina'}
      >
        <SubjectForm
          key={editSubject?.id ?? 'new'}
          subject={editSubject}
          change={change}
          close={() => {
            setModal('');
            notify('Disciplina salva.');
          }}
        />
      </Modal>
      <Modal
        open={modal === 'card'}
        onClose={() => setModal('')}
        title="Novo cartão de revisão"
      >
        <CardForm
          state={state}
          change={change}
          close={() => {
            setModal('');
            notify('Cartão criado e pronto para revisar.');
          }}
        />
      </Modal>
      <Modal
        open={modal === 'auth'}
        onClose={() => setModal('')}
        title={recovery ? 'Redefinir senha' : 'Seu espaço, em qualquer lugar'}
      >
        <AuthForm
          recovery={recovery}
          close={() => {
            setModal('');
            setRecovery(false);
          }}
          notify={notify}
        />
      </Modal>
      <Modal
        open={modal === 'notifications'}
        onClose={() => setModal('')}
        title="Prazos próximos"
        description="As tarefas vencidas ou previstas para os próximos três dias."
      >
        {pending
          .filter((t) => t.due_date && t.due_date <= addDays(today, 2))
          .map((t) => (
            <button
              className="notification-item"
              key={t.id}
              onClick={() => {
                setEditTask(t);
                setModal('task');
              }}
            >
              <CalendarDays size={19} />
              <span>
                {t.title}
                <small>{prettyDate(t.due_date)}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        {!pending.some(
          (t) => t.due_date && t.due_date <= addDays(today, 2),
        ) && (
          <Empty text="Nenhum prazo próximo. Seu planejamento está tranquilo." />
        )}
      </Modal>
      <Modal
        open={modal === 'search'}
        onClose={() => setModal('')}
        title="Pesquisar no seu espaço"
      >
        <Command>
          <CommandInput placeholder="Tarefas, disciplinas ou páginas…" />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            <CommandGroup heading="Navegar">
              {nav.map((n) => (
                <CommandItem
                  key={n.name}
                  value={`${n.label} ${n.name}`}
                  onSelect={() => {
                    go(n.name);
                    setModal('');
                  }}
                >
                  <n.icon size={17} />
                  {n.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Tarefas">
              {state.tasks.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.title}
                  onSelect={() => {
                    setEditTask(t);
                    setModal('task');
                  }}
                >
                  <CheckCheck size={17} />
                  {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Disciplinas">
              {state.subjects.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    setSubjectFilter(s.id);
                    setFilter('all');
                    go('Tarefas');
                    setModal('');
                  }}
                >
                  <BookOpen size={17} />
                  {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </Modal>
      <Modal
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        title="Excluir esta tarefa?"
        description={deleteTask?.title}
      >
        <p className="form-help">
          A tarefa e seus blocos planejados serão removidos. O tempo já estudado
          continua no seu histórico.
        </p>
        <div className="form-actions">
          <button className="btn secondary" onClick={() => setDeleteTask(null)}>
            Cancelar
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (deleteTask)
                change((s) => ({
                  ...s,
                  tasks: s.tasks.filter((t) => t.id !== deleteTask.id),
                  blocks: s.blocks.filter((b) => b.task_id !== deleteTask.id),
                }));
              setDeleteTask(null);
              notify('Tarefa excluída.');
            }}
          >
            Excluir tarefa
          </button>
        </div>
      </Modal>
      <Modal
        open={!!deleteSubject}
        onClose={() => setDeleteSubject(null)}
        title="Excluir esta disciplina?"
        description={deleteSubject?.name}
      >
        <p className="form-help">
          Esta ação remove permanentemente a disciplina, suas tarefas, sessões
          de estudo, revisões e blocos planejados. Você pode arquivar a
          disciplina para preservar esse histórico.
          {deleteSubject?.google_id &&
            ' Se ela veio do Classroom, uma nova sincronização poderá importá-la novamente.'}
        </p>
        <div className="form-actions">
          <button className="btn secondary" onClick={() => setDeleteSubject(null)}>
            Cancelar
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (!deleteSubject) return;
              const removedId = deleteSubject.id;
              if (change(state => withoutSubject(state, removedId))) {
                if (subjectFilter === removedId) setSubjectFilter('all');
                notify('Disciplina e dados vinculados excluídos.');
              }
              setDeleteSubject(null);
            }}
          >
            Excluir disciplina
          </button>
        </div>
      </Modal>
      <Modal
        open={modal === 'reset'}
        onClose={() => setModal('')}
        title="Restaurar a demonstração?"
        description="Suas alterações nos exemplos deste navegador serão substituídas."
      >
        <div className="form-actions">
          <button className="btn secondary" onClick={() => setModal('')}>
            Cancelar
          </button>
          <button
            className="btn primary"
            onClick={() => {
              resetDemo();
              localStorage.removeItem('edutrack.timer.demo');
              setModal('');
              notify('Demonstração restaurada.');
            }}
          >
            Restaurar exemplos
          </button>
        </div>
      </Modal>
      {game.overlay}
      {hatOpen && (
        <SortingHat
          name={state.settings.name}
          price={gameOf(state).house ? HOUSE_CHANGE_PRICE : undefined}
          onDone={finishSorting}
          canShare={!!user}
          sharing={gameOf(state).house ? gameOf(state).public : true}
          onClose={() => {
            setHatOpen(false);
            try {
              if (user) sessionStorage.setItem('edutrack.hat.later', user.id);
            } catch {}
            if (!gameOf(state).house) notify('Tudo bem! Você pode colocar o chapéu depois, pela Arena ou pela Jornada.');
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-mark">
            <Check size={16} />
          </span>
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
