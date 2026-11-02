'use client';
import { useState } from 'react';
import { Field, Choice } from './ui';
import {
  colors,
  day,
  id,
  type Subject,
  type Task,
  type Flashcard,
  type Workspace,
} from './model';
type Change = (fn: (s: Workspace) => Workspace) => boolean;
export function TaskForm({
  task,
  state,
  change,
  close,
}: {
  task?: Task;
  state: Workspace;
  change: Change;
  close: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? ''),
    [subject, setSubject] = useState(
      task?.subject_id ?? state.subjects.find((s) => !s.archived)?.id ?? '',
    ),
    [description, setDescription] = useState(task?.description ?? ''),
    [due, setDue] = useState(task?.due_date ?? day()),
    [estimate, setEstimate] = useState(task?.estimated_minutes ?? 25),
    [priority, setPriority] = useState(task?.priority ?? 'medium');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !subject) return;
        change((s) => ({
          ...s,
          tasks: task
            ? s.tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      title: title.trim(),
                      subject_id: subject,
                      description,
                      due_date: due,
                      estimated_minutes: estimate,
                      priority,
                    }
                  : t,
              )
            : [
                ...s.tasks,
                {
                  id: id(),
                  title: title.trim(),
                  subject_id: subject,
                  description,
                  due_date: due,
                  estimated_minutes: estimate,
                  priority,
                  status: 'todo',
                  awarded: false,
                  created_at: new Date().toISOString(),
                },
              ],
        }));
        close();
      }}
      className="editor-form"
    >
      <Field label="O que você precisa fazer?">
        <input
          autoFocus
          required
          maxLength={180}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: resolver a lista de exercícios"
        />
      </Field>
      <Field label="Disciplina">
        <Choice
          value={subject}
          onChange={setSubject}
          label="Disciplina da tarefa"
          items={state.subjects
            .filter((s) => !s.archived)
            .map((s) => ({ value: s.id, label: s.name }))}
        />
      </Field>
      {!subject && (
        <p className="form-help">
          Crie uma disciplina antes de adicionar tarefas.
        </p>
      )}
      <div className="form-grid">
        <Field label="Prazo (opcional)">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
        <Field label="Estimativa em minutos">
          <input
            type="number"
            min={5}
            max={10080}
            required
            value={estimate}
            onChange={(e) => setEstimate(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Prioridade">
        <Choice
          label="Prioridade"
          value={priority}
          onChange={(v) => setPriority(v as Task['priority'])}
          items={[
            { value: 'high', label: 'Alta' },
            { value: 'medium', label: 'Média' },
            { value: 'low', label: 'Baixa' },
          ]}
        />
      </Field>
      <Field label="Notas e passos">
        <textarea
          rows={3}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deixe os materiais e os próximos passos aqui."
        />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn secondary" onClick={close}>
          Cancelar
        </button>
        <button className="btn primary" disabled={!subject}>
          {task ? 'Salvar alterações' : 'Criar tarefa'}
        </button>
      </div>
    </form>
  );
}
export function SubjectForm({
  subject,
  change,
  close,
}: {
  subject?: Subject;
  change: Change;
  close: () => void;
}) {
  const [s, setS] = useState<Subject>(
    subject ?? {
      id: id(),
      name: '',
      teacher: '',
      hours: 60,
      description: '',
      color: 'blue',
      start_date: day(),
      end_date: '',
      archived: false,
    },
  );
  const field = (key: keyof Subject, v: unknown) => setS({ ...s, [key]: v });
  return (
    <form
      className="editor-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!s.name.trim() || (s.end_date && s.end_date < s.start_date)) return;
        change((w) => ({
          ...w,
          subjects: subject
            ? w.subjects.map((x) =>
                x.id === s.id ? { ...s, name: s.name.trim() } : x,
              )
            : [...w.subjects, { ...s, name: s.name.trim() }],
        }));
        close();
      }}
    >
      <Field label="Nome da disciplina">
        <input
          required
          autoFocus
          maxLength={100}
          value={s.name}
          onChange={(e) => field('name', e.target.value)}
          placeholder="Ex.: Programação"
        />
      </Field>
      <div className="form-grid">
        <Field label="Professor(a)">
          <input
            maxLength={100}
            value={s.teacher}
            onChange={(e) => field('teacher', e.target.value)}
          />
        </Field>
        <Field label="Carga horária">
          <input
            type="number"
            min={1}
            max={5000}
            value={s.hours}
            onChange={(e) => field('hours', Number(e.target.value))}
          />
        </Field>
        <Field label="Início">
          <input
            type="date"
            value={s.start_date}
            onChange={(e) => field('start_date', e.target.value)}
          />
        </Field>
        <Field label="Fim">
          <input
            type="date"
            min={s.start_date}
            value={s.end_date}
            onChange={(e) => field('end_date', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Cor">
        <Choice
          value={s.color}
          onChange={(v) => field('color', v)}
          label="Cor da disciplina"
          items={colors.map((c, i) => ({
            value: c,
            label: ['Azul', 'Roxo', 'Laranja', 'Rosa', 'Ciano'][i],
          }))}
        />
      </Field>
      <Field label="Descrição">
        <textarea
          maxLength={2000}
          value={s.description}
          onChange={(e) => field('description', e.target.value)}
        />
      </Field>
      <button className="btn primary">
        {subject ? 'Salvar disciplina' : 'Criar disciplina'}
      </button>
    </form>
  );
}
export function CardForm({
  state,
  change,
  close,
}: {
  state: Workspace;
  change: Change;
  close: () => void;
}) {
  const [q, setQ] = useState(''),
    [a, setA] = useState(''),
    [subject, setSubject] = useState(state.subjects[0]?.id ?? '');
  return (
    <form
      className="editor-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim() || !a.trim() || !subject) return;
        const c: Flashcard = {
          id: id(),
          question: q.trim(),
          answer: a.trim(),
          subject_id: subject,
          stage: 0,
          due_date: day(),
          reviews: 0,
        };
        change((s) => ({ ...s, cards: [...s.cards, c] }));
        close();
      }}
    >
      <Field label="Disciplina">
        <Choice
          value={subject}
          onChange={setSubject}
          label="Disciplina do cartão"
          items={state.subjects
            .filter((s) => !s.archived)
            .map((s) => ({ value: s.id, label: s.name }))}
        />
      </Field>
      <Field label="Pergunta">
        <textarea
          autoFocus
          required
          maxLength={1000}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Uma pergunta clara por cartão."
        />
      </Field>
      <Field label="Resposta">
        <textarea
          required
          maxLength={3000}
          rows={4}
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </Field>
      <button className="btn primary" disabled={!subject}>
        Criar cartão
      </button>
    </form>
  );
}
