'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUpRight, CalendarPlus, Check, ChevronLeft, ChevronRight, Grip, Plus, Play, Undo2, WandSparkles, X, Settings2, Clock3 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal, Field, Choice } from './ui';
import { addDays, day, id, minutesLabel, prettyDate, prioritized, type Workspace, type Task, type Block } from './model';
import { dayLoad, fillWeek, planningCapacity, scheduleError, suggestSlot, unplanned } from './scheduling';

type Props = { state: Workspace; change: (f: (s: Workspace) => Workspace) => boolean; notify: (s: string) => void; onFocus: (t: Task) => void; onEdit: (t: Task) => void; onToggle: (t: Task) => void; newTask: () => void; onSettings: () => void; onReviews: () => void };
export default function StudyDesk({state, change, notify, onFocus, onEdit, onToggle, newTask, onSettings, onReviews}: Props) {
  const [offset, setOffset] = useState(0), [selected, setSelected] = useState(day()), [drag, setDrag] = useState(''), [over, setOver] = useState(''), [subject, setSubject] = useState('all');
  const [draft, setDraft] = useState<{task: Task; block: Block} | null>(null), [error, setError] = useState(''), [undo, setUndo] = useState<{added: string[]; before: Block[]} | null>(null);
  const start = addDays(day(), offset), week = Array.from({length: 7}, (_, i) => addDays(start, i));
  const tasks = prioritized(state), tray = tasks.filter(t => subject === 'all' || t.subject_id === subject);
  const remaining = tasks.reduce((n, t) => n + unplanned(state, t), 0), load = dayLoad(state, selected);
  const blocks = state.blocks.filter(b => b.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const reviews = state.cards.filter(c => c.due_date <= day()).length;
  function open(t: Task, date = selected, block?: Block) {
    setError(''); setDraft({task: t, block: block ?? {id: id(), task_id: t.id, date, ...suggestSlot(state, t, date)}});
  }
  function save(t: Task, block: Block, explicit = false) {
    const existing = state.blocks.find(b => b.id === block.id);
    const problem = scheduleError(state, t, block, existing?.id);
    if (problem || (!explicit && t.due_date && block.date > t.due_date)) {
      open(t, block.date, block); setError(problem); return;
    }
    const accepted = change(s => ({...s, blocks: [...s.blocks.filter(b => b.id !== block.id), block]}));
    if (!accepted) return;
    setUndo({added: [block.id], before: existing ? [existing] : []}); setSelected(block.date); setDraft(null); setError('');
    notify(`${t.title} · ${prettyDate(block.date)}, ${block.time} · ${block.minutes} min + pausa.`);
  }
  function changeWeek(n: number) { const next = Math.max(0, offset + n); setOffset(next); setSelected(addDays(day(), next)); }
  function revert() {
    if (!undo) return;
    const next = {...state, blocks: state.blocks.filter(b => !undo.added.includes(b.id))};
    for (const b of undo.before) {
      const t = next.tasks.find(t => t.id === b.task_id && t.status !== 'done');
      if (!t || scheduleError(next, t, b)) {
        setUndo(null); notify('A tarefa ou sua disponibilidade mudou. Agende novamente para escolher um horário válido.'); return;
      }
      next.blocks.push(b);
    }
    if (change(() => next)) { setUndo(null); notify('Última alteração na agenda desfeita.'); }
  }
  return <div className="study-desk">
    <div className="desk-title-row">
      <div><h1>Planejamento</h1><p className="desk-sub">Dê um horário para cada tarefa. Depois, uma coisa por vez.</p></div>
      <div className="desk-intention"><span className="hand-arrow">↙</span><p>O que precisa da sua atenção?<br/><strong>Dê um horário. Depois, uma coisa por vez.</strong></p></div>
    </div>
    <div className="week-toolbar"><div className="week-pager"><button aria-label="Semana anterior" disabled={!offset} onClick={() => changeWeek(-7)}><ChevronLeft size={18}/></button><span>{new Date(start+'T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span><button aria-label="Próxima semana" onClick={() => changeWeek(7)}><ChevronRight size={18}/></button>{offset>0 && <button className="text-button" onClick={() => {setOffset(0);setSelected(day())}}>Hoje</button>}</div><div className="week-tools"><button onClick={onSettings} title="A agenda reserva 20% do seu tempo diário para imprevistos"><Settings2 size={15}/><span>{minutesLabel(planningCapacity(state))} planejáveis / dia</span></button><button className="auto-plan" onClick={() => {const result=fillWeek(state,start);const added=result.blocks.filter(b=>!state.blocks.some(x=>x.id===b.id)).map(b=>b.id);if(change(s=>({...s,blocks:result.blocks}))) {setUndo({added,before:[]});notify(`${result.count} blocos adicionados. ${result.remaining ? minutesLabel(result.remaining)+' ainda sem horário; confira prazos e disponibilidade.' : 'Todas as estimativas têm espaço na agenda.'}`)}}}><WandSparkles size={16}/> Organizar por prazo</button></div></div>
    <section className={'week-paper '+(drag?'is-dragging':'')} aria-label="Agenda da semana">
      <div className="week-days">{week.map(date=> {const l=dayLoad(state,date), draggingTask=state.tasks.find(t=>t.id===drag), slot=draggingTask?suggestSlot(state,draggingTask,date):null;return <button key={date} className={'desk-day '+(date===selected?'selected ':'')+(over===date?'drag-over':'')} aria-label={'Selecionar dia '+date} aria-pressed={date===selected} onClick={()=>setSelected(date)} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';setOver(date)}} onDragLeave={()=>setOver('')} onDrop={e=>{e.preventDefault();const task=state.tasks.find(t=>t.id===e.dataTransfer.getData('text/edutrack-task'));setDrag('');setOver('');if(task)save(task,{id:id(),task_id:task.id,date,...suggestSlot(state,task,date)})}}>
        <span className="day-name">{new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}{date===day()&&<i>HOJE</i>}</span><b>{date.slice(-2)}</b><div className="capacity-line"><span style={{width:Math.min(100,l.used/l.capacity*100)+'%'}}/></div><small>{slot? `${slot.minutes} min às ${slot.time}` : l.free===0?'Dia preenchido':minutesLabel(l.free)+' livres'}</small><span className="drop-caption">{drag?'Solte para agendar':l.planned?minutesLabel(l.planned)+' planejados':'Espaço para estudar'}</span>
      </button>})}</div>
      <div className="day-agenda"><div className="agenda-label"><span className="desk-kicker">{selected===day()?'NA MESA HOJE':prettyDate(selected).toUpperCase()}</span><h2>{blocks.length ? `${blocks.length} ${blocks.length===1?'encontro':'encontros'} com o estudo`:'O dia está em branco.'}</h2><p>{load.planned?`${minutesLabel(load.planned)} de estudo · ${load.pauses} min de pausas`:'Arraste uma tarefa para o dia acima.'}</p>{load.study>0&&<small><Check size={13}/>{minutesLabel(load.study)} já estudados</small>}</div>
        <div className="agenda-strip">{blocks.length?blocks.map(b=>{const t=state.tasks.find(t=>t.id===b.task_id);if(!t)return null;const sub=state.subjects.find(x=>x.id===t.subject_id);return <article key={b.id} className={'desk-block '+(sub?.color??'blue')+(t.status==='done'?' is-complete':'')}><div className="block-time"><span>{b.time} <small>/{b.minutes} MIN</small></span><button aria-label={'Remover bloco '+t.title} onClick={()=>{if(change(s=>({...s,blocks:s.blocks.filter(x=>x.id!==b.id)})))setUndo({added:[],before:[b]})}}><X size={13}/></button></div><h3>{t.title}</h3><div className="block-actions"><button onClick={()=>open(t,selected,b)} aria-label={'Reagendar '+t.title}>Ajustar horário</button><button onClick={()=>onFocus(t)} aria-label={'Estudar bloco '+t.title}><Play size={13}/> Focar</button></div></article>}) : <button className="blank-agenda" onClick={()=>{const t=tasks.find(t=>unplanned(state,t)>0);if(t)open(t);else newTask()}}><Plus size={23}/><span>Seu próximo passo começa aqui.<small>Escolha uma tarefa e reserve um tempo.</small></span><ArrowUpRight size={19}/></button>}</div>
      </div>
    </section>
    <div className="desk-tray-heading"><div><p className="desk-kicker">DA CABEÇA PARA A AGENDA <ArrowDown size={13}/></p><h2>Tarefas na mesa <span>{tasks.length}</span></h2></div><div className="tray-controls"><span>{minutesLabel(remaining)} sem horário</span><Choice label="Disciplina na mesa" value={subject} onChange={setSubject} items={[{value:'all',label:'Todas as disciplinas'},...state.subjects.filter(s=>!s.archived).map(s=>({value:s.id,label:s.name}))]}/><button className="btn primary" onClick={newTask}><Plus size={16}/>Nova tarefa</button></div></div>
    <div className="task-tray">{tray.map(t=>{const sub=state.subjects.find(s=>s.id===t.subject_id),left=unplanned(state,t);return <article key={t.id} data-task-id={t.id} draggable={left>0} onDragStart={e=>{e.dataTransfer.setData('text/edutrack-task',t.id);e.dataTransfer.effectAllowed='copy';setDrag(t.id)}} onDragEnd={()=>{setDrag('');setOver('')}} className={'task-slip '+(sub?.color??'blue')+(drag===t.id?' dragging':'')}><div className="slip-top"><span><i className={'subject-dot '+(sub?.color??'blue')}/>{sub?.name}</span><Grip size={16} aria-label="Arraste para um dia"/></div><div className="slip-title"><Checkbox checked={false} onCheckedChange={()=>onToggle(t)} aria-label={'Concluir '+t.title}/><button onClick={()=>onEdit(t)}><h3>{t.title}</h3></button></div><div className="slip-detail"><span className={t.due_date&&t.due_date<=day()?'deadline-soon':''}>{t.due_date&&t.due_date<day()?'Atrasada · ':''}{prettyDate(t.due_date)}</span><span>{left?`${left} min sem horário`:'Estimativa distribuída'}{t.google_id?' · Classroom':''}</span></div><div className="slip-actions"><button onClick={()=>open(t)} disabled={!left} aria-label={'Agendar '+t.title}><CalendarPlus size={14}/>{left?'Agendar':'Planejada'}</button><button onClick={()=>onFocus(t)} aria-label={'Estudar '+t.title}><Play size={13}/>Estudar</button></div></article>})}{!tray.length&&<div className="desk-empty"><Check size={28}/><h3>Mesa livre.</h3><p>Crie uma tarefa ou aproveite para revisar.</p><button className="btn secondary" onClick={newTask}>Adicionar tarefa</button></div>}</div>
    <div className="desk-bottom"><span><Grip size={14}/> Arraste as tarefas para um dia · no celular, toque em Agendar.</span><button onClick={onReviews}>{reviews} cartões para revisar <ArrowUpRight size={15}/></button></div>
    {undo&&<div className="desk-undo" role="status"><Check size={15}/>Agenda atualizada<button onClick={revert}><Undo2 size={14}/>Desfazer</button><button aria-label="Fechar desfazer" onClick={()=>setUndo(null)}><X size={14}/></button></div>}
    <Modal open={!!draft} onClose={()=>{setDraft(null);setError('')}} title={draft&&state.blocks.some(b=>b.id===draft.block.id)?'Ajustar sessão':'Dar um horário à tarefa'} description={draft?.task.title}>
      {draft&&<form className="edu-form" onSubmit={e=>{e.preventDefault();save(draft.task,draft.block,true)}}><div className="form-row"><Field label="Dia do estudo"><input type="date" required min={day()} value={draft.block.date} onChange={e=>{const date=e.target.value;setDraft({...draft,block:{...draft.block,date,...suggestSlot(state,draft.task,date,draft.block.id)}});setError('')}}/></Field><Field label="Horário"><input type="time" required value={draft.block.time} onChange={e=>setDraft({...draft,block:{...draft.block,time:e.target.value}})}/></Field></div><Field label="Minutos de estudo"><input type="number" required min={1} max={180} value={draft.block.minutes} onChange={e=>setDraft({...draft,block:{...draft.block,minutes:Number(e.target.value)}})}/></Field><p className="schedule-preview"><Clock3 size={17}/>{minutesLabel(dayLoad(state,draft.block.date,draft.block.id).free)} disponíveis neste dia. A sessão inclui {state.settings.break_minutes} min de pausa.</p>{draft.task.due_date&&draft.block.date>draft.task.due_date&&<p className="notice">Este dia fica depois do prazo ({prettyDate(draft.task.due_date)}). Salvar confirma esse agendamento.</p>}{error&&<p className="inline-error" role="alert">{error}</p>}<button className="btn primary full" type="submit">Salvar horário</button></form>}
    </Modal>
  </div>;
}
