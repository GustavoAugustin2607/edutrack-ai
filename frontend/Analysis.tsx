'use client';
import { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react';
import {
  day,
  deliveryStatus,
  minutesLabel,
  prettyDate,
  type DeliveryStatus,
  type Task,
  type Workspace,
} from './model';

type CountedStatus = Exclude<DeliveryStatus, 'no_due_date'>;
const groups: { key: CountedStatus; label: string }[] = [
  { key: 'on_time', label: 'Entregues no prazo' },
  { key: 'late', label: 'Entregues após o prazo' },
  { key: 'pending', label: 'Pendentes no prazo' },
  { key: 'overdue', label: 'Pendentes vencidas' },
  { key: 'unknown', label: 'Sem histórico da entrega' },
];

type Props = {
  state: Workspace;
  onTask: (task: Task) => void;
  onPlan: () => void;
};

export default function Analysis({ state, onTask, onPlan }: Props) {
  const [period, setPeriod] = useState<'all' | 'month' | 'semester'>('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<CountedStatus | 'all'>('all');
  const today = day();
  const year = today.slice(0, 4);
  const semesterStart = Number(today.slice(5, 7)) <= 6 ? `${year}-01-01` : `${year}-07-01`;
  const semesterEnd = Number(today.slice(5, 7)) <= 6 ? `${year}-06-30` : `${year}-12-31`;

  const dueTasks = useMemo(
    () => state.tasks.filter(task => task.due_date && (
      period === 'all' ||
      (period === 'month' && task.due_date.startsWith(today.slice(0, 7))) ||
      (period === 'semester' && task.due_date >= semesterStart && task.due_date <= semesterEnd)
    )),
    [state.tasks, period, today, semesterStart, semesterEnd],
  );
  const undated = state.tasks.filter(task => !task.due_date).length;
  const count = (tasks: Task[], key: CountedStatus) =>
    tasks.filter(task => deliveryStatus(task, today) === key).length;
  const rows = state.subjects.map(subject => {
    const tasks = dueTasks.filter(task => task.subject_id === subject.id);
    const done = tasks.filter(task => task.status === 'done').length;
    const minutes = state.sessions.filter(session => {
      if (session.subject_id !== subject.id) return false;
      const sessionDate = day(new Date(session.created_at));
      return period === 'all' ||
        (period === 'month' && sessionDate.startsWith(today.slice(0, 7))) ||
        (period === 'semester' && sessionDate >= semesterStart && sessionDate <= semesterEnd);
    })
      .reduce((sum, session) => sum + session.minutes, 0);
    return { subject, tasks, done, minutes };
  }).filter(row => row.tasks.length > 0);
  const summary = Object.fromEntries(groups.map(group => [group.key, count(dueTasks, group.key)])) as Record<CountedStatus, number>;
  const shownTasks = dueTasks.filter(task =>
    (selectedSubject === 'all' || task.subject_id === selectedSubject) &&
    (selectedStatus === 'all' || deliveryStatus(task, today) === selectedStatus),
  ).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const selectedName = state.subjects.find(subject => subject.id === selectedSubject)?.name;
  const lateSubject = rows.map(row => ({
    name: row.subject.name,
    count: count(row.tasks, 'late'),
  })).sort((a, b) => b.count - a.count)[0];

  return <section className="analysis-page">
    <header className="analysis-heading">
      <div>
        <h1>Análise</h1>
        <p>Entenda o andamento das matérias e escolha o próximo passo.</p>
      </div>
      <label className="analysis-period">
        <span>Período do prazo</span>
        <select aria-label="Período da análise" value={period} onChange={event => {
          setPeriod(event.target.value as typeof period);
          setSelectedSubject('all');
          setSelectedStatus('all');
        }}>
          <option value="all">Todos os prazos</option>
          <option value="month">Este mês</option>
          <option value="semester">Este semestre</option>
        </select>
      </label>
    </header>

    <div className="analysis-summary" aria-label="Resumo das atividades com prazo">
      <div><strong>{dueTasks.length ? Math.round((summary.on_time + summary.late + summary.unknown) / dueTasks.length * 100) : 0}%</strong><span>concluídas no período</span></div>
      <div><strong>{summary.on_time}</strong><span>entregues no prazo</span></div>
      <div><strong>{summary.late}</strong><span>entregues após o prazo</span></div>
      <div><strong>{summary.overdue}</strong><span>pendentes vencidas</span></div>
    </div>

    <section className="analysis-chart-section" aria-labelledby="analysis-chart-title">
      <div className="analysis-section-heading">
        <div><h2 id="analysis-chart-title">Andamento por matéria</h2><p>Cada faixa representa atividades cujo prazo está no período escolhido.</p></div>
        <span>{dueTasks.length} {dueTasks.length === 1 ? 'atividade' : 'atividades'} com prazo</span>
      </div>
      <div className="analysis-legend" aria-label="Legenda do gráfico">
        {groups.map(group => <span key={group.key} className={`analysis-key ${group.key}`}>{group.label}</span>)}
      </div>
      {rows.length ? <div className="analysis-chart-rows">
        {rows.map(({ subject, tasks, done, minutes }) => <div className="analysis-subject-row" key={subject.id}>
          <button className="analysis-subject-name" onClick={() => { setSelectedSubject(subject.id); setSelectedStatus('all'); }}>
            <b>{subject.name}</b>
            <small>{done}/{tasks.length} concluídas · {Math.round(done / tasks.length * 100)}% · {minutesLabel(minutes)} estudados</small>
          </button>
          <div className="analysis-stacked-bar" role="group" aria-label={`Entregas de ${subject.name}`}>
            {groups.map(group => {
              const amount = count(tasks, group.key);
              return amount ? <button
                key={group.key}
                className={`analysis-segment ${group.key}`}
                style={{ width: `${amount / tasks.length * 100}%` }}
                aria-label={`${subject.name}: ${amount} ${group.label.toLowerCase()}`}
                title={`${amount} ${group.label.toLowerCase()}`}
                onClick={() => { setSelectedSubject(subject.id); setSelectedStatus(group.key); }}
              ><span>{amount}</span></button> : null;
            })}
          </div>
        </div>)}
      </div> : <p className="analysis-empty">Nenhuma atividade com prazo neste período. Cadastre uma tarefa ou escolha outro intervalo.</p>}
      {(summary.unknown > 0 || undated > 0) && <p className="analysis-data-note">
        {summary.unknown > 0 && `${summary.unknown} tarefa(s) concluída(s) antes do registro da data de conclusão aparecem como “sem histórico”. `}
        {undated > 0 && `${undated} atividade(s) sem prazo ficam fora do gráfico.`}
      </p>}
    </section>

    <div className="analysis-bottom">
      <section className="analysis-detail" aria-labelledby="analysis-detail-title">
        <div className="analysis-section-heading">
          <div><h2 id="analysis-detail-title">Atividades por trás dos números</h2><p>{selectedName ?? 'Todas as matérias'} · {groups.find(group => group.key === selectedStatus)?.label ?? 'Todos os estados'}</p></div>
          {(selectedSubject !== 'all' || selectedStatus !== 'all') && <button className="analysis-clear" onClick={() => { setSelectedSubject('all'); setSelectedStatus('all'); }}>Limpar filtro</button>}
        </div>
        <div className="analysis-task-list">
          {shownTasks.map(task => <button key={task.id} onClick={() => onTask(task)}>
            <span><b>{task.title}</b><small>{state.subjects.find(subject => subject.id === task.subject_id)?.name ?? 'Sem matéria'} · Prazo {prettyDate(task.due_date)}</small></span>
            <em className={`analysis-state ${deliveryStatus(task, today)}`}>{groups.find(group => group.key === deliveryStatus(task, today))?.label}</em>
            <ArrowUpRight size={16}/>
          </button>)}
          {!shownTasks.length && <p className="analysis-empty">Nenhuma atividade corresponde a esse filtro.</p>}
        </div>
      </section>
      <aside className="analysis-insights" aria-label="Leitura dos resultados">
        <h2>O que os dados sugerem</h2>
        {summary.overdue > 0 ? <p><CalendarDays size={17}/><span><b>{summary.overdue} pendência(s) vencida(s).</b> Reserve um bloco para começar pela matéria mais urgente.</span></p> : <p><CalendarDays size={17}/><span><b>Nenhuma pendência vencida.</b> Continue acompanhando os próximos prazos.</span></p>}
        {lateSubject?.count ? <p><Clock3 size={17}/><span><b>{lateSubject.name}</b> concentrou {lateSubject.count} entrega(s) após o prazo neste período.</span></p> : null}
        {summary.unknown > 0 && <p><Clock3 size={17}/><span>As conclusões antigas sem data não entram na comparação de pontualidade.</span></p>}
        <button onClick={onPlan}>Abrir planejamento <ArrowUpRight size={15}/></button>
      </aside>
    </div>
  </section>;
}
