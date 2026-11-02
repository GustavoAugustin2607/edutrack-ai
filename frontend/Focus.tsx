'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Headphones,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Choice, TabBar } from './ui';
import { id, day, minutesLabel, type Workspace, type Task } from './model';
import { sessionXP } from './game';
type TimerState = {
  id: string;
  task: string;
  mode: string;
  total: number;
  remaining: number;
  end: number | null;
};
export default function Focus({
  state,
  change,
  selectedTask,
  notify,
  account,
}: {
  state: Workspace;
  change: (f: (s: Workspace) => Workspace) => boolean;
  selectedTask: string;
  notify: (s: string) => void;
  account: string;
}) {
  const make = (mode = 'focus'): TimerState => ({
    id: id(),
    task:
      selectedTask || state.tasks.find((t) => t.status !== 'done')?.id || '',
    mode,
    total:
      (mode === 'focus'
        ? state.settings.focus_minutes
        : state.settings.break_minutes) * 60,
    remaining:
      (mode === 'focus'
        ? state.settings.focus_minutes
        : state.settings.break_minutes) * 60,
    end: null,
  });
  const [timer, setTimer] = useState<TimerState>(make),
    [loaded, setLoaded] = useState(false),
    [remaining, setRemaining] = useState(timer.remaining),
    [sound, setSound] = useState(false);
  const latest = useRef(timer),
    finished = useRef(''),
    audio = useRef<AudioContext | null>(null);
  const key = `edutrack.timer.${account}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const x = JSON.parse(raw);
        if (
          Number.isFinite(x.remaining) &&
          x.remaining >= 0 &&
          Number.isFinite(x.total) &&
          x.total > 0 &&
          x.total <= 10800 &&
          typeof x.id === 'string' &&
          (x.end === null || Number.isFinite(x.end))
        ) {
          if (selectedTask && !x.end) x.task = selectedTask;
          setTimer(x);
        }
      }
    } catch {}
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    latest.current = timer;
    if (loaded) {
      try {
        localStorage.setItem(key, JSON.stringify(timer));
      } catch {}
    }
  }, [timer, loaded, key]);
  const complete = (automatic = false) => {
    const t = latest.current;
    const left = t.end
      ? Math.max(0, Math.ceil((t.end - Date.now()) / 1000))
      : t.remaining;
    const minutes = automatic
      ? t.total / 60
      : Math.floor((t.total - left) / 60);
    if (!automatic && minutes < 1) {
      notify('Estude ao menos 1 minuto para registrar a sessão.');
      return;
    }
    if (finished.current === t.id) return;
    if (t.mode === 'focus') {
      const task = state.tasks.find((x) => x.id === t.task);
      const accepted = change((s) => ({
        ...s,
        sessions: s.sessions.some((x) => x.id === t.id)
          ? s.sessions
          : [
              ...s.sessions,
              {
                id: t.id,
                task_id: t.task,
                subject_id: task?.subject_id ?? '',
                minutes,
                created_at: new Date().toISOString(),
              },
            ],
      }));
      if (!accepted) {
        notify(
          'A sessão ainda não foi salva. Exporte seus dados e recarregue para recuperar a conexão.',
        );
        return;
      }
      finished.current = t.id;
      notify(`Sessão registrada: ${minutes} min de foco · +${sessionXP(minutes)} XP`);
    } else notify('Pausa concluída. Pronto para mais uma sessão?');
    const next = make(t.mode === 'focus' ? 'break' : 'focus');
    next.task = t.task;
    setTimer(next);
    setRemaining(next.remaining);
  };
  const completeRef = useRef(complete);
  completeRef.current = complete;
  useEffect(() => {
    if (!loaded || !selectedTask) return;
    const t = latest.current;
    if (t.task === selectedTask) return;
    if (t.end) {
      notify(
        'Você já tem uma sessão em andamento. Pause e registre antes de trocar de tarefa.',
      );
      return;
    }
    setTimer({ ...t, task: selectedTask });
  }, [selectedTask, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const tick = () => {
      const t = latest.current;
      const left = t.end
        ? Math.max(0, Math.ceil((t.end - Date.now()) / 1000))
        : t.remaining;
      setRemaining(left);
      if (t.end && left === 0) completeRef.current(true);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [loaded]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  async function toggleSound() {
    if (sound) {
      await audio.current?.suspend();
      setSound(false);
      return;
    }
    try {
      if (!audio.current) {
        const ctx = new AudioContext();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          last = (last + Math.random() * 0.02 - 0.01) * 0.99;
          data[i] = last * 3;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0.18;
        source.connect(gain).connect(ctx.destination);
        source.start();
        audio.current = ctx;
      }
      await audio.current.resume();
      setSound(true);
    } catch {
      notify('O navegador não permitiu reproduzir o som.');
    }
  }
  const running = !!timer.end;
  const setMode = (mode: string) => {
    if (running) return;
    const t = make(mode);
    t.task = timer.task;
    setTimer(t);
    setRemaining(t.remaining);
  };
  return (
    <div className="focus-layout">
      <section className="focus-stage">
        <div className="focus-stage-top">
          <span>
            <Headphones size={17} /> ESTÚDIO DE FOCO
          </span>
          <button
            className={'sound-toggle ' + (sound ? 'on' : '')}
            onClick={toggleSound}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />} Som ambiente
          </button>
        </div>
        <TabBar
          value={timer.mode}
          onChange={setMode}
          items={[
            { value: 'focus', label: 'Foco' },
            { value: 'break', label: 'Pausa' },
          ]}
        />
        <div className={'focus-orbit ' + (running ? 'running' : '')}>
          <svg viewBox="0 0 320 320">
            <circle cx="160" cy="160" r="145" className="orbit-track" />
            <circle
              cx="160"
              cy="160"
              r="145"
              className="orbit-value"
              strokeDasharray={911}
              strokeDashoffset={911 * (1 - remaining / timer.total)}
            />
          </svg>
          <div>
            <p>
              {timer.mode === 'focus'
                ? 'SESSÃO DE ESTUDO'
                : 'TEMPO DE DESCANSO'}
            </p>
            <output>
              {String(Math.floor(remaining / 60)).padStart(2, '0')}
              <span>:</span>
              {String(remaining % 60).padStart(2, '0')}
            </output>
            <small>
              {running
                ? 'Em andamento'
                : remaining < timer.total
                  ? 'Pausado'
                  : 'Pronto quando você estiver'}
            </small>
          </div>
        </div>
        <div className="timer-controls">
          <button
            className="icon-button"
            aria-label="Reiniciar cronômetro"
            onClick={() => {
              const t = make(timer.mode);
              t.task = timer.task;
              setTimer(t);
              setRemaining(t.remaining);
            }}
          >
            <RotateCcw size={20} />
          </button>
          <button
            className="btn focus-start"
            onClick={() =>
              setTimer((t) => {
                const left = t.end ? Math.max(0, Math.ceil((t.end - Date.now()) / 1000)) : t.remaining;
                setRemaining(left);
                return { ...t, remaining: left, end: t.end ? null : Date.now() + left * 1000 };
              })
            }
          >
            {running ? (
              <Pause size={20} />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
            {running ? 'Pausar' : 'Começar foco'}
          </button>
          <button
            className="icon-button"
            aria-label="Registrar sessão"
            onClick={() => complete()}
          >
            <Check size={21} />
          </button>
        </div>
        <p className="focus-advice">
          {timer.mode === 'focus' ? (
            <>
              Completa, esta sessão vale{' '}
              <b className="g-xp-pill">+{sessionXP(Math.round(timer.total / 60))} XP</b>
              {timer.total / 60 >= 25 && ' (inclui bônus de sessão completa)'}
            </>
          ) : (
            'Pausa também é parte do estudo. Respire, beba água, alongue.'
          )}
        </p>
        <div className="focus-task">
          <label>Estou estudando</label>
          <Choice
            label="Tarefa da sessão"
            value={timer.task}
            onChange={(v) => !running && setTimer((t) => ({ ...t, task: v }))}
            items={[
              { value: '', label: 'Sessão livre' },
              ...state.tasks
                .filter((t) => t.status !== 'done')
                .map((t) => ({ value: t.id, label: t.title })),
            ]}
          />
        </div>
      </section>
      <aside>
        <section className="card">
          <h2 className="small-heading">Antes de começar</h2>
          <ol className="focus-checklist">
            <li>
              <span>01</span>Escolha uma tarefa pequena e concreta.
            </li>
            <li>
              <span>02</span>Deixe só o material necessário por perto.
            </li>
            <li>
              <span>03</span>Guarde as distrações para a pausa.
            </li>
          </ol>
        </section>
        <section className="card session-history">
          <h2 className="small-heading">Sessões de hoje</h2>
          {state.sessions
            .filter((s) => day(new Date(s.created_at)) === day())
            .slice()
            .reverse()
            .map((s) => (
              <div key={s.id}>
                <span className="session-mark">
                  <Check size={15} />
                </span>
                <span>
                  {state.tasks.find((t) => t.id === s.task_id)?.title ??
                    'Sessão livre'}
                  <small>
                    {new Date(s.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </span>
                <b>{minutesLabel(s.minutes)}</b>
              </div>
            ))}
          {!state.sessions.some(
            (s) => day(new Date(s.created_at)) === day(),
          ) && (
            <p className="form-help">
              Sua primeira sessão de hoje aparecerá aqui.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
