'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarPlus,
  Check,
  CheckCircle2,
  CircleAlert,
  CopyPlus,
  LoaderCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  WandSparkles,
  X,
} from 'lucide-react';
import { Choice } from './ui';
import {
  addDays,
  day,
  gameOf,
  id,
  prioritized,
  type Flashcard,
  type Task,
  type Workspace,
} from './model';
import {
  generateStudyAI,
  type AIDifficulty,
  type AIKind,
  type ExplainDraft,
  type FlashcardDraft,
  type PlanDraft,
  type QuizDraft,
  type StudyAIResult,
} from './ai';
import { scheduleError, suggestSlot, unplanned } from './scheduling';
import { quizXP } from './game';

type Seed = {
  kind: AIKind;
  prompt?: string;
  subjectId?: string;
  nonce: number;
};

type Props = {
  state: Workspace;
  change: (fn: (state: Workspace) => Workspace) => boolean;
  notify: (message: string) => void;
  user: { id: string; email?: string } | null;
  login: () => void;
  initial?: Seed;
  onPlan: () => void;
  onFocus: (task: Task) => void;
};

const modes: Array<{
  value: AIKind;
  label: string;
  detail: string;
}> = [
  { value: 'quiz', label: 'Quiz', detail: 'Pratique com alternativas e explicações' },
  { value: 'flashcards', label: 'Flashcards', detail: 'Revise ideias essenciais em cartões' },
  { value: 'explain', label: 'Explicar', detail: 'Destrave um conceito passo a passo' },
  { value: 'plan', label: 'Plano', detail: 'Distribua o trabalho sem sobrecarregar a semana' },
];

const statusSteps = [
  'Enviando seu pedido…',
  'Aguardando o Tutor IA…',
  'Gerando seu material…',
  'A geração continua em andamento…',
];

export default function AIStudio({
  state,
  change,
  notify,
  user,
  login,
  initial,
  onPlan,
  onFocus,
}: Props) {
  const [kind, setKind] = useState<AIKind>(initial?.kind ?? 'quiz');
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? 'all');
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [source, setSource] = useState('');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('intermediate');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<StudyAIResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [cardDrafts, setCardDrafts] = useState<
    Array<{ question: string; answer: string; selected: boolean }>
  >([]);
  const controller = useRef<AbortController | null>(null);

  const activeSubjects = state.subjects.filter(subject => !subject.archived);
  const relevantTasks = useMemo(
    () =>
      prioritized(state).filter(
        task => subjectId === 'all' || task.subject_id === subjectId,
      ),
    [state, subjectId],
  );

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(
      () => setStatusIndex(index => Math.min(index + 1, statusSteps.length - 1)),
      1100,
    );
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => () => controller.current?.abort(), []);

  const switchKind = (next: AIKind) => {
    controller.current?.abort();
    setKind(next);
    setBusy(false);
    setResult(null);
    setError('');
    setAnswers({});
  };

  const generate = async () => {
    if (!user) {
      notify('Entre para usar o Tutor IA com seus dados de estudo protegidos.');
      login();
      return;
    }
    if (kind !== 'plan' && `${prompt}\n${source}`.trim().length < 10) {
      setError('Escreva pelo menos 10 caracteres sobre o que você quer estudar.');
      return;
    }
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setBusy(true);
    setStatusIndex(0);
    setError('');
    setResult(null);
    setAnswers({});
    try {
      const response = await generateStudyAI(
        {
          kind,
          subject_id: subjectId === 'all' ? null : subjectId,
          task_ids: relevantTasks.slice(0, 20).map(task => task.id),
          source_text: [prompt.trim(), source.trim()].filter(Boolean).join('\n\n'),
          options: {
            count,
            difficulty,
            days: 7,
            start_date: day(),
            timezone:
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              'America/Sao_Paulo',
          },
        },
        nextController.signal,
      );
      setResult(response);
      if (response.kind === 'flashcards') {
        setCardDrafts(
          (response.data as FlashcardDraft).cards.map(card => ({
            ...card,
            selected: true,
          })),
        );
      }
    } catch (reason) {
      if (!nextController.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Não foi possível gerar este material.',
        );
    } finally {
      if (!nextController.signal.aborted) setBusy(false);
    }
  };

  const saveCards = () => {
    if (subjectId === 'all') {
      setError('Escolha uma disciplina antes de salvar os flashcards.');
      return;
    }
    const cards: Flashcard[] = cardDrafts
      .filter(card => card.selected && card.question.trim() && card.answer.trim())
      .map(card => ({
        id: id(),
        subject_id: subjectId,
        question: card.question.trim(),
        answer: card.answer.trim(),
        stage: 0,
        due_date: day(),
        reviews: 0,
      }));
    if (!cards.length) {
      setError('Selecione pelo menos um cartão completo para salvar.');
      return;
    }
    if (change(current => ({ ...current, cards: [...current.cards, ...cards] })))
      notify(
        `${cards.length} ${cards.length === 1 ? 'flashcard salvo' : 'flashcards salvos'} para revisão.`,
      );
  };

  const applyPlan = () => {
    if (!result || result.kind !== 'plan') return;
    const recommendations = (result.data as PlanDraft).recommendations;
    let added = 0;
    const accepted = change(current => {
      const next: Workspace = { ...current, blocks: [...current.blocks] };
      for (const recommendation of recommendations) {
        const task = next.tasks.find(
          item =>
            item.id === recommendation.task_id && item.status !== 'done',
        );
        if (!task) continue;
        let remaining = Math.min(
          recommendation.suggested_minutes,
          unplanned(next, task),
        );
        for (let offset = 0; offset < 7 && remaining > 0; offset++) {
          const date = addDays(day(), offset);
          if (task.due_date && date > (task.due_date < day() ? day() : task.due_date))
            continue;
          for (let guard = 0; guard < 16 && remaining > 0; guard++) {
            const suggested = suggestSlot(next, task, date);
            const minutes = Math.min(suggested.minutes, remaining);
            if (!minutes) break;
            const block = {
              id: id(),
              task_id: task.id,
              date,
              time: suggested.time,
              minutes,
            };
            if (scheduleError(next, task, block)) break;
            next.blocks.push(block);
            remaining -= minutes;
            added++;
          }
        }
      }
      return next;
    });
    if (!accepted) return;
    if (!added) {
      setError('A agenda já está cheia ou essas tarefas já foram distribuídas.');
      return;
    }
    notify(`${added} blocos do plano foram adicionados à agenda.`);
    onPlan();
  };

  const contentLabel = modes.find(mode => mode.value === kind)?.detail;
  const quiz = result?.kind === 'quiz' ? (result.data as QuizDraft) : null;
  const quizCorrect = quiz ? quiz.questions.filter((q, i) => answers[i] === q.correct_index).length : 0;
  const quizFinished = !!quiz && quiz.questions.length > 0 && Object.keys(answers).length >= quiz.questions.length;
  const recordedQuiz = useRef<StudyAIResult | null>(null);
  useEffect(() => {
    if (!quiz || !result || !quizFinished || recordedQuiz.current === result) return;
    recordedQuiz.current = result;
    const total = Math.min(50, quiz.questions.length);
    const correct = Math.min(total, quizCorrect);
    const accepted = change(current => {
      const game = gameOf(current);
      return {
        ...current,
        game: {
          ...game,
          quizzes: [
            ...game.quizzes,
            { id: id(), date: day(), correct, total, title: quiz.title.slice(0, 300) },
          ].slice(-2000),
        },
      };
    });
    if (accepted) notify(`Quiz concluído: ${correct}/${total} acertos · +${quizXP(correct, total)} XP`);
  }, [quiz, result, quizFinished, quizCorrect, change, notify]);
  const explanation =
    result?.kind === 'explain' ? (result.data as ExplainDraft) : null;
  const plan = result?.kind === 'plan' ? (result.data as PlanDraft) : null;

  return (
    <div className="ai-studio">
      <section className="ai-studio-intro">
        <div>
          <h2>Tutor IA</h2>
          <p>
            Tire uma dúvida, cole um trecho da aula ou escolha uma tarefa. O tutor
            pesquisa o tema, monta o material e você revisa antes de salvar.
          </p>
        </div>
        <div className="ai-privacy-note">
          <ShieldCheck size={16} />
          <span><b>Nada muda sem você.</b> Agenda e cartões só mudam quando você confirma.</span>
        </div>
      </section>

      <div className="ai-mode-rail" role="tablist" aria-label="Tipo de material">
        {modes.map(mode => (
          <button
            key={mode.value}
            role="tab"
            aria-selected={kind === mode.value}
            className={kind === mode.value ? 'active' : ''}
            onClick={() => switchKind(mode.value)}
          >
            <span>{mode.label}</span><small>{mode.detail}</small>
          </button>
        ))}
      </div>

      <div className="ai-studio-layout">
        <section className="ai-composer" aria-label="Configurar geração">
          <div className="ai-composer-heading">
            <span>01</span><div><h3>Prepare o pedido</h3><p>{contentLabel}</p></div>
          </div>
          <label className="ai-field">
            <span>{kind === 'plan' ? 'Qual é o seu objetivo?' : 'O que você quer praticar?'}</span>
            <textarea
              value={prompt}
              maxLength={1600}
              onChange={event => setPrompt(event.target.value)}
              placeholder={
                kind === 'quiz'
                  ? 'Ex.: crie perguntas sobre funções injetoras, com foco nos erros mais comuns.'
                  : kind === 'flashcards'
                    ? 'Ex.: transforme os conceitos abaixo em cartões curtos e objetivos.'
                    : kind === 'explain'
                      ? 'Ex.: explique recursão com uma analogia e um exemplo em Python.'
                      : 'Ex.: organize as tarefas urgentes em blocos curtos até sexta-feira.'
              }
            />
          </label>
          {kind !== 'plan' && (
            <label className="ai-field">
              <span>Conteúdo de origem <small>opcional, mas melhora o resultado</small></span>
              <textarea
                className="source-text"
                value={source}
                maxLength={10000}
                onChange={event => setSource(event.target.value)}
                placeholder="Cole aqui um trecho das suas anotações, resumo ou material da aula."
              />
              <small>{source.length.toLocaleString('pt-BR')} / 10.000 caracteres</small>
            </label>
          )}
          <div className="ai-options">
            <div className="ai-option"><span>Disciplina</span><Choice label="Disciplina para o Tutor IA" value={subjectId} onChange={setSubjectId} items={[{ value: 'all', label: 'Contexto geral' }, ...activeSubjects.map(subject => ({ value: subject.id, label: subject.name }))]} /></div>
            {kind !== 'plan' && <div className="ai-option"><span>Dificuldade</span><Choice label="Dificuldade" value={difficulty} onChange={value => setDifficulty(value as AIDifficulty)} items={[{ value: 'basic', label: 'Fundamentos' }, { value: 'intermediate', label: 'Intermediária' }, { value: 'advanced', label: 'Desafiadora' }]} /></div>}
            {(kind === 'quiz' || kind === 'flashcards') && <label className="ai-option" htmlFor="ai-count"><span>Quantidade</span><input id="ai-count" type="number" min={2} max={10} value={count} onChange={event => setCount(Math.max(2, Math.min(10, Number(event.target.value) || 2)))} /></label>}
          </div>
          <button className="ai-generate" onClick={generate} disabled={busy}>
            {busy ? <LoaderCircle className="spinning" size={18} /> : <WandSparkles size={18} />}
            {busy ? statusSteps[statusIndex] : user ? 'Gerar com IA' : 'Entrar para gerar'}
            {!busy && <ArrowRight size={17} />}
          </button>
          {error && <div className="ai-error" role="alert"><CircleAlert size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Fechar aviso"><X size={15} /></button></div>}
        </section>

        <section className="ai-result" aria-label="Resultado do Tutor IA" aria-busy={busy}>
          <div className="ai-result-heading">
            <span>02</span><div><h3>Revise o material</h3><p>Nada é salvo automaticamente</p></div>
            {result && <button onClick={generate} disabled={busy}><RefreshCw size={15} /> Gerar outra versão</button>}
          </div>

          {!busy && !result && <div className="ai-result-empty"><span><BrainCircuit size={28} /></span><h3>O seu material aparece aqui.</h3><p>Defina o pedido ao lado. A IA pesquisa o tema na web, usa o texto e o contexto selecionados, e você decide o que aproveitar.</p><ol><li><b>1</b> Contexto</li><li><b>2</b> Geração</li><li><b>3</b> Sua revisão</li></ol></div>}
          {busy && <output className="ai-thinking" aria-live="polite"><div className="thinking-lines"><i /><i /><i /><i /></div><h3>{statusSteps[statusIndex]}</h3><p>O tempo depende do tamanho do pedido e da fila. Mantenha esta página aberta.</p></output>}

          {quiz && <div className="quiz-preview"><div className="result-title"><BookOpenCheck size={19} /><div><h3>{quiz.title}</h3><p>{quiz.questions.length} perguntas geradas</p></div></div>{quiz.questions.map((question, questionIndex) => <article key={`${question.prompt}-${questionIndex}`} className="quiz-question"><span>PERGUNTA {String(questionIndex + 1).padStart(2, '0')}</span><h4>{question.prompt}</h4><div>{question.options.map((option, optionIndex) => { const answered = answers[questionIndex] !== undefined; const selected = answers[questionIndex] === optionIndex; const correct = question.correct_index === optionIndex; return <button key={option} className={answered ? correct ? 'correct' : selected ? 'wrong' : '' : ''} disabled={answered} onClick={() => setAnswers(current => ({ ...current, [questionIndex]: optionIndex }))}><i>{String.fromCharCode(65 + optionIndex)}</i><span>{option}</span>{answered && correct && <CheckCircle2 size={17} />}</button>})}</div>{answers[questionIndex] !== undefined && <p className="quiz-explanation"><b>{answers[questionIndex] === question.correct_index ? 'Acertou.' : 'Vale revisar.'}</b> {question.explanation}</p>}</article>)}{quizFinished && <div className={'g-quiz-score' + (quizCorrect === quiz.questions.length ? ' perfect' : '')}><b>{quizCorrect}/{quiz.questions.length}</b><p><strong>{quizCorrect === quiz.questions.length ? 'Gabaritou!' : quizCorrect / quiz.questions.length >= 0.6 ? 'Mandou bem!' : 'Bom treino — revise os erros.'}</strong><span>+{quizXP(quizCorrect, quiz.questions.length)} XP registrados na sua jornada</span></p></div>}</div>}

          {result?.kind === 'flashcards' && <div className="flashcard-preview"><div className="result-title"><CopyPlus size={19} /><div><h3>Flashcards para revisar</h3><p>Edite e escolha o que entra na sua rotina</p></div></div>{cardDrafts.map((card, index) => <article key={index} className={card.selected ? 'selected' : ''}><button className="card-select" onClick={() => setCardDrafts(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: !item.selected } : item))} aria-label={`${card.selected ? 'Remover' : 'Selecionar'} cartão ${index + 1}`} aria-pressed={card.selected}>{card.selected ? <Check size={15} /> : null}</button><label><span>PERGUNTA {String(index + 1).padStart(2, '0')}</span><textarea value={card.question} onChange={event => setCardDrafts(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item))} /></label><label><span>RESPOSTA</span><textarea value={card.answer} onChange={event => setCardDrafts(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item))} /></label></article>)}<div className="result-actions"><span>{cardDrafts.filter(card => card.selected).length} selecionados</span><button onClick={saveCards}><CopyPlus size={16} /> Salvar para revisão</button></div></div>}

          {explanation && <div className="explain-preview"><div className="result-title"><BrainCircuit size={19} /><div><h3>{explanation.title}</h3><p>Explicação do tutor</p></div></div><div className="explain-copy">{explanation.answer.split('\n').map((paragraph, index) => paragraph.trim() && <p key={index}>{paragraph}</p>)}</div><h4>Confira se ficou claro</h4><ul>{explanation.checkpoints.map(checkpoint => <li key={checkpoint}><Check size={15} />{checkpoint}</li>)}</ul></div>}

          {plan && <div className="plan-preview"><div className="result-title"><CalendarPlus size={19} /><div><h3>Plano sugerido</h3><p>{plan.summary}</p></div></div><div className="plan-lines">{plan.recommendations.map((recommendation, index) => { const task = state.tasks.find(item => item.id === recommendation.task_id); if (!task) return null; const subject = state.subjects.find(item => item.id === task.subject_id); return <article key={`${recommendation.task_id}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{task.title}</h4><p>{subject?.name} · {recommendation.suggested_minutes} min sugeridos</p><small>{recommendation.rationale}</small></div><button onClick={() => onFocus(task)} aria-label={`Estudar ${task.title}`}><Play size={15} /></button></article>})}</div><div className="result-actions"><span>Você poderá ajustar cada bloco no planejamento.</span><button onClick={applyPlan}><CalendarPlus size={16} /> Aplicar à agenda</button></div></div>}

          {result?.sources?.length ? <div className="ai-sources"><span>Fontes consultadas na web</span>{result.sources.filter(source => /^https:\/\/[a-z]{2}\.wikipedia\.org\//.test(source.url)).map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}<small>Confira sempre o conteúdo gerado com seu material de aula.</small></div> : null}
          {result?.warnings?.length ? <div className="ai-warnings">{result.warnings.map(warning => <p key={warning}><CircleAlert size={14} />{warning}</p>)}</div> : null}
        </section>
      </div>
    </div>
  );
}
