'use client';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Clock3,
  Flame,
  Layers,
  Play,
  Send,
  Lightbulb,
  Coins,
  Trophy,
  Zap,
} from 'lucide-react';
import { achievementStatus, dailyQuests, RARITY, weeklyQuests, type GameSummary, type Quest } from './game';
import { CountUp, DailyQuests, GameIcon } from './GameUI';
import { addDays, day, minutesLabel, prettyDate, prioritized, taskMinutes, type Task, type Workspace } from './model';
import { upcoming, unplanned } from './scheduling';
import { useDashboardMotion } from './motion';
import type { AIKind } from './ai';

type Props = {
  state: Workspace;
  onFocus: (task: Task) => void;
  onPlan: () => void;
  onTasks: (subjectId?: string) => void;
  onReviews: () => void;
  onAI: (kind: AIKind, prompt?: string, subjectId?: string) => void;
  summary: GameSummary;
  onClaim: (q: Quest) => void;
  onChest: () => void;
  onJourney: (tab: string) => void;
  onGo: (page: string) => void;
};

function monday(date: string) {
  const value = new Date(date + 'T12:00:00');
  const offset = (value.getDay() + 6) % 7;
  return addDays(date, -offset);
}

const shortDate = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');

export default function Dashboard({ state, onFocus, onPlan, onTasks, onReviews, onAI, summary, onClaim, onChest, onJourney, onGo }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const today = day();
  const start = monday(today);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const pending = prioritized(state);
  const deadlines = pending.filter(task => task.due_date).slice(0, 3);
  const futureBlocks = upcoming(state).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const nextBlock = futureBlocks[0];
  const nextTask = nextBlock ? state.tasks.find(task => task.id === nextBlock.task_id) : pending[0];
  const reviewCount = state.cards.filter(card => card.due_date <= today).length;
  const nextBadges = achievementStatus(state).filter(a => !a.reached && !a.unlockedAt && !a.hidden).sort((a, b) => b.value / b.target - a.value / a.target).slice(0, 3);
  const weekly = weeklyQuests(state).find(q => !q.claimed);
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Boa noite' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = state.settings.name.trim().split(/\s+/)[0] || 'estudante';
  const readyQuests = dailyQuests(state).filter(q => q.done && !q.claimed).length;
  const dueToday = pending.filter(task => task.due_date && task.due_date <= today).length;
  // One line that tells the student the most useful thing to do right now.
  const nudge = summary.streak.atRisk
    ? `Sua sequência de ${summary.streak.current} dias está em risco: uma sessão rápida já mantém a chama acesa.`
    : readyQuests
      ? `Você tem ${readyQuests} ${readyQuests === 1 ? 'missão pronta' : 'missões prontas'} para resgatar. Pegue suas recompensas!`
      : dueToday
        ? `${dueToday} ${dueToday === 1 ? 'entrega vence' : 'entregas vencem'} até hoje. Comece pela primeira e ganhe XP extra no prazo.`
        : reviewCount
          ? `${reviewCount} ${reviewCount === 1 ? 'cartão espera' : 'cartões esperam'} revisão. Cinco minutos já fazem diferença.`
          : 'Tudo em dia. Que tal uma partida na Arena para fixar o conteúdo?';
  const planned = state.blocks.filter(block => week.includes(block.date)).reduce((sum, block) => sum + block.minutes, 0);
  const chart = week.map(date => ({
    date,
    studied: state.sessions.filter(session => day(new Date(session.created_at)) === date).reduce((sum, session) => sum + session.minutes, 0),
    planned: state.blocks.filter(block => block.date === date).reduce((sum, block) => sum + block.minutes, 0),
  }));
  // Same calendar week as the heading and the chart, so the numbers agree.
  const weekStudied = chart.reduce((sum, item) => sum + item.studied, 0);
  const maxChart = Math.max(state.settings.daily_minutes, ...chart.map(item => item.studied + item.planned), 1);
  const weekLabel = `${shortDate(start)} — ${shortDate(week[6])}`;
  useDashboardMotion(root, `${state.sessions.length}:${state.blocks.length}:${state.tasks.length}`);

  const subjects = state.subjects.filter(subject => !subject.archived).map(subject => {
    const tasks = state.tasks.filter(task => task.subject_id === subject.id);
    const done = tasks.filter(task => task.status === 'done').length;
    const minutes = state.sessions.filter(session => session.subject_id === subject.id && week.includes(day(new Date(session.created_at)))).reduce((sum, session) => sum + session.minutes, 0);
    return { subject, tasks, done, minutes, progress: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  });

  const openPrompt = (kind: AIKind) => {
    const fallback = kind === 'quiz' ? 'Crie um quiz sobre o conteúdo que preciso revisar.' : kind === 'flashcards' ? 'Transforme meu conteúdo em flashcards objetivos.' : 'Monte um plano para as tarefas pendentes desta semana.';
    onAI(kind, aiPrompt.trim() || fallback);
  };

  return <div className="overview-dashboard" ref={root}>
    <header className="overview-heading" data-dashboard-reveal>
      <div>
        <p className="eyebrow">Visão geral · {weekLabel}</p>
        <h1>{greeting}, {firstName}</h1>
        <p>{nudge}</p>
      </div>
      <button className="overview-period" onClick={onPlan}>Esta semana <ChevronRight size={16}/></button>
      <button className={'g-dash-strip' + (summary.streak.atRisk ? ' at-risk' : '')} onClick={() => onJourney('overview')} aria-label={`Nível ${summary.level}, ${summary.xp} XP, sequência de ${summary.streak.current} dias`}>
        <span className={'g-dash-flame' + (summary.streak.current ? ' lit' : '')}><Flame size={20}/><b>{summary.streak.current}</b></span>
        <span className="g-dash-level"><small>Nível {summary.level} · {summary.rank.name}</small><em><i style={{ width: `${summary.progress}%` }}/></em><small>{summary.toNext} XP para o nível {summary.level + 1}</small></span>
        <span className="g-dash-coins"><Coins size={16}/><b>{summary.coins}</b></span>
      </button>
    </header>

    <section className="overview-metrics" aria-label="Resumo da semana" data-dashboard-reveal>
      <button onClick={() => onGo('Modo foco')} title="Abrir o Modo foco"><Clock3/><p><strong>{minutesLabel(weekStudied)}</strong><span>estudados na semana</span></p><ChevronRight className="metric-go" size={16}/></button>
      <button onClick={onPlan} title="Abrir o Planejamento"><CalendarClock/><p><strong>{minutesLabel(planned)}</strong><span>planejados na semana</span></p><ChevronRight className="metric-go" size={16}/></button>
      <button onClick={() => onTasks()} title="Ver tarefas"><CircleAlert/><p><strong>{deadlines.length}</strong><span>prazos próximos</span></p><ChevronRight className="metric-go" size={16}/></button>
      <button onClick={() => onJourney('overview')} title="Abrir a Jornada"><Zap/><p><strong>+<CountUp value={summary.todayXP} /> XP</strong><span>hoje · {summary.weekXP} XP na semana</span></p><ChevronRight className="metric-go" size={16}/></button>
    </section>

    <div className="overview-game-grid">
      <section className="overview-panel g-dash-quests" data-dashboard-reveal>
        <DailyQuests state={state} onClaim={onClaim} onChest={onChest} compact/>
      </section>
      <section className="overview-panel g-dash-next" data-dashboard-reveal>
        <div className="overview-panel-heading"><div><h2>Quase lá</h2><p>Conquistas e desafios mais próximos</p></div><button onClick={() => onJourney('badges')}>Ver todas <ArrowRight size={14}/></button></div>
        {nextBadges.map(a => <button key={a.id} className={`g-next-badge rarity-${a.rarity}`} onClick={() => onJourney('badges')}>
          <span><GameIcon name={a.icon} size={18}/></span>
          <p><b>{a.title}</b><small>{a.text}</small><em><i style={{ width: `${a.value / a.target * 100}%` }}/></em></p>
          <small><span>{a.value}/{a.target}</span><span className="g-next-coins"><Coins size={11}/> {RARITY[a.rarity].coins}</span></small>
        </button>)}
        {weekly && <button className="g-next-weekly" onClick={() => onJourney('quests')}>
          <Trophy size={17}/><p><b>Desafio da semana</b><small>{weekly.title} · {weekly.value}/{weekly.target}</small></p><em>+{weekly.xp} XP</em>
        </button>}
      </section>
    </div>

    <div className="overview-primary-grid">
      <section className="overview-panel rhythm-panel" data-dashboard-reveal>
        <div className="overview-panel-heading"><div><h2>Ritmo de estudo</h2><p>Planejado e realizado nesta semana</p></div><div className="chart-legend"><span className="studied-key">Estudado</span><span className="planned-key">Planejado</span><span className="goal-key">Meta diária</span></div></div>
        <div className="study-chart" style={{ '--goal': `${100 - Math.min(100, state.settings.daily_minutes / maxChart * 100)}%` } as CSSProperties}>
          <div className="goal-line" aria-hidden="true"><span>{state.settings.daily_minutes} min</span></div>
          <div className="chart-axis" aria-hidden="true"><span>{maxChart}</span><span>{Math.round(maxChart / 2)}</span><span>0</span></div>
          <div className="chart-bars">{chart.map(item => <div className="chart-day" key={item.date} aria-label={`${prettyDate(item.date)}: ${item.studied} minutos estudados e ${item.planned} minutos planejados`}>
            <div className="chart-column"><i className="planned-bar" data-chart-bar style={{ height: `${item.planned / maxChart * 100}%` }}/><i className="studied-bar" data-chart-bar style={{ height: `${item.studied / maxChart * 100}%` }}/></div>
            <b>{new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</b><small>{item.date.slice(-2)}</small>
          </div>)}</div>
        </div>
        <div className="chart-summary"><span><b>{Math.round(weekStudied / Math.max(1, state.settings.daily_minutes * 7) * 100)}%</b> da meta semanal realizada</span><button onClick={onPlan}>Abrir planejamento <ArrowRight size={15}/></button></div>
      </section>

      <section className="overview-panel now-panel" data-dashboard-reveal>
        <div className="overview-panel-heading"><div><h2>Agora</h2><p>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</p></div></div>
        {nextTask ? <div className="next-study">
          <span>{nextBlock ? `${prettyDate(nextBlock.date)} · ${nextBlock.time} — ${nextBlock.minutes} min` : 'Prioridade sem horário'}</span>
          <h3>{nextTask.title}</h3>
          <p>{state.subjects.find(subject => subject.id === nextTask.subject_id)?.name} · {unplanned(state, nextTask)} min ainda necessários</p>
          <button onClick={() => onFocus(nextTask)}><Play size={16} fill="currentColor"/>Iniciar foco</button>
        </div> : <div className="next-study empty"><h3>Nenhuma tarefa pendente</h3><p>Use esse espaço para revisar ou descansar.</p><button onClick={onReviews}><Layers size={16}/>Abrir revisões</button></div>}
        <div className="deadline-heading"><h3>Próximos prazos</h3><button onClick={() => onTasks()}>Ver todos <ArrowRight size={14}/></button></div>
        <div className="deadline-list">{deadlines.map(task => <button key={task.id} onClick={() => onTasks(task.subject_id)}><span className={task.due_date <= today ? 'late' : ''}>{prettyDate(task.due_date)}</span><p><b>{task.title}</b><small>{state.subjects.find(subject => subject.id === task.subject_id)?.name} · {Math.max(0, task.estimated_minutes - taskMinutes(state, task))} min restantes</small></p><ChevronRight size={15}/></button>)}{!deadlines.length && <p className="clean-empty">Nenhum prazo pendente.</p>}</div>
      </section>
    </div>

    <div className="overview-secondary-grid">
      <section className="overview-panel subjects-overview" data-dashboard-reveal>
        <div className="overview-panel-heading"><div><h2>Disciplinas</h2><p>Progresso das tarefas e tempo recente</p></div><button onClick={() => onTasks()}>Ver tarefas <ArrowRight size={14}/></button></div>
        <div className="subject-table" aria-label="Resumo por disciplina">
          <div className="subject-table-head"><span>Disciplina</span><span>Progresso</span><span>Pendências</span><span>Esta semana</span></div>
          {subjects.map(({subject,tasks,done,minutes,progress}) => <button className="subject-table-row" key={subject.id} onClick={() => onTasks(subject.id)}>
            <span><i className={`subject-dot ${subject.color}`}/><b>{subject.name}</b></span><span><i><em style={{width: `${progress}%`}}/></i><b>{progress}%</b></span><span>{tasks.length - done} {tasks.length - done === 1 ? 'tarefa' : 'tarefas'}</span><span>{minutesLabel(minutes)}<ChevronRight size={14}/></span>
          </button>)}
          {!subjects.length && <p className="clean-empty">Crie uma disciplina para acompanhar seu progresso.</p>}
        </div>
      </section>

      <section className="overview-panel ai-overview" data-dashboard-reveal>
        <div className="overview-panel-heading"><div><h2>Tutor IA</h2><p>Crie material a partir do que você está estudando</p></div><BrainCircuit size={21}/></div>
        <label htmlFor="dashboard-ai-prompt">O que você quer praticar?</label>
        <div className="ai-quick-input"><input id="dashboard-ai-prompt" value={aiPrompt} onChange={event => setAiPrompt(event.target.value)} onKeyDown={event => { if(event.key === 'Enter') openPrompt('quiz') }} placeholder="Ex.: quiz sobre vetores ou explique recursão"/><button onClick={() => openPrompt('quiz')} aria-label="Criar com Tutor IA"><Send size={17}/></button></div>
        <div className="ai-quick-actions"><button onClick={() => openPrompt('quiz')}><BookOpen size={17}/>Criar quiz</button><button onClick={() => openPrompt('flashcards')}><Layers size={17}/>Gerar flashcards</button><button onClick={() => openPrompt('plan')}><CalendarClock size={17}/>Montar plano</button></div>
        <button className="ai-suggestion" onClick={() => onAI(reviewCount ? 'flashcards' : 'quiz', reviewCount ? 'Crie flashcards para reforçar meus próximos conteúdos.' : 'Crie um quiz com minhas tarefas prioritárias.')}>
          <Lightbulb size={16}/><span><b>Sugestão para sua rotina</b>{reviewCount ? `${reviewCount} cartões estão prontos para revisar. Gere variações para reforçar o conteúdo.` : `${pending.length} tarefas estão abertas. Crie uma prática rápida para descobrir o que revisar primeiro.`}</span><ArrowRight size={15}/>
        </button>
      </section>
    </div>
  </div>;
}
