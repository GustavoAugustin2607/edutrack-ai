'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  Brain,
  Check,
  Coins,
  Crown,
  Layers,
  RotateCcw,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
  Wand,
  LoaderCircle,
  CopyPlus,
} from 'lucide-react';
import { Choice } from './ui';
import { generateStudyAI, type QuizDraft } from './ai';
import { addDays, id } from './model';
import { day, gameOf, type Workspace } from './model';
import {
  ARCADE_DAILY_CAP,
  ARCADE_NAMES,
  arcadeBest,
  arcadeXP,
  recordArcade,
} from './game';
import { HOUSES } from './houses';
import { HouseCrest } from './SortingHat';
import { Confetti } from './GameUI';

type Card = { q: string; a: string; kind?: string };
type AIQuestion = { q: string; options: string[]; correct: number; explanation: string };
type GameId = keyof typeof ARCADE_NAMES;

// Used only while the student has fewer than 4 flashcards of their own.
const SAMPLE_DECK: Card[] = [
  { q: 'Qual é a capital do Brasil?', a: 'Brasília' },
  { q: 'Quanto é 7 × 8?', a: '56' },
  { q: 'Qual gás as plantas liberam na fotossíntese?', a: 'Oxigênio' },
  { q: 'Quem escreveu "Dom Casmurro"?', a: 'Machado de Assis' },
  { q: 'Qual é o maior planeta do Sistema Solar?', a: 'Júpiter' },
  { q: 'Qual é a fórmula química da água?', a: 'H₂O' },
  { q: 'Em que ano o Brasil declarou a independência?', a: '1822' },
  { q: 'Qual é a unidade de força no SI?', a: 'Newton' },
  { q: 'Como se diz "livro" em inglês?', a: 'Book' },
  { q: 'Quantos lados tem um hexágono?', a: 'Seis' },
  { q: 'Qual organela produz energia na célula?', a: 'Mitocôndria' },
  { q: 'Qual é a raiz quadrada de 144?', a: '12' },
];

const shuffle = <T,>(list: T[]) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/* ------------------------------------------------------------- sound */
function useSound() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem('edutrack.sound') !== 'off';
    } catch {
      return true;
    }
  });
  const ctx = useRef<AudioContext | null>(null);
  const play = useCallback(
    (kind: 'good' | 'bad' | 'win' | 'flip') => {
      if (!on) return;
      try {
        ctx.current ??= new AudioContext();
        const ac = ctx.current;
        const notes = { good: [660, 880], bad: [220, 160], win: [523, 659, 784, 1046], flip: [440] }[kind];
        notes.forEach((freq, i) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = kind === 'bad' ? 'sawtooth' : 'triangle';
          osc.frequency.value = freq;
          const start = ac.currentTime + i * 0.09;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
          osc.connect(gain).connect(ac.destination);
          osc.start(start);
          osc.stop(start + 0.18);
        });
      } catch {}
    },
    [on],
  );
  const toggle = () =>
    setOn(v => {
      try {
        localStorage.setItem('edutrack.sound', v ? 'off' : 'on');
      } catch {}
      return !v;
    });
  return { on, toggle, play };
}

/* ------------------------------------------------------------- arena */
export default function Arcade({
  state,
  change,
  notify,
  onSort,
  onCreateCards,
  onAI,
  user,
  login,
}: {
  state: Workspace;
  change: (fn: (s: Workspace) => Workspace) => boolean;
  notify: (s: string) => void;
  onSort: () => void;
  onCreateCards: () => void;
  onAI: () => void;
  user: { id: string } | null;
  login: () => void;
}) {
  const [subject, setSubject] = useState('all');
  const [playing, setPlaying] = useState<GameId | 'ai' | null>(null);
  const [result, setResult] = useState<{ game: GameId; score: number; xp: number; best: number; ai?: boolean } | null>(null);
  const [topic, setTopic] = useState('');
  const [ai, setAi] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; title?: string; questions?: AIQuestion[]; error?: string; saved?: boolean }>({ status: 'idle' });
  const [aiStep, setAiStep] = useState(0);
  const aiAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (ai.status !== 'loading') return;
    const t = setInterval(() => setAiStep(n => n + 1), 2200);
    return () => clearInterval(t);
  }, [ai.status]);
  useEffect(() => () => aiAbort.current?.abort(), []);
  const subjectName = state.subjects.find(s => s.id === subject)?.name;
  const generateMatch = async () => {
    const theme = topic.trim() || subjectName || '';
    if (theme.length < 3) return notify('Digite um tema para a IA montar a partida.');
    aiAbort.current?.abort();
    const controller = new AbortController();
    aiAbort.current = controller;
    setAi({ status: 'loading' });
    setAiStep(0);
    try {
      const response = await generateStudyAI(
        {
          kind: 'quiz',
          subject_id: subject === 'all' ? null : subject,
          task_ids: [],
          source_text: `${theme}. Perguntas rápidas para um jogo: enunciado curto, alternativas curtas (até 6 palavras) e explicação de uma frase.`,
          options: { count: 8, difficulty: 'intermediate', days: 1, start_date: day(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo' },
        },
        controller.signal,
      );
      const quiz = response.data as QuizDraft;
      setAi({
        status: 'ready',
        title: quiz.title,
        questions: quiz.questions.map(q => ({ q: q.prompt, options: q.options, correct: q.correct_index, explanation: q.explanation })),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setAi({ status: 'error', error: error instanceof Error ? error.message : 'A IA não conseguiu montar a partida.' });
    }
  };
  const saveAICards = () => {
    if (!ai.questions || ai.saved) return;
    const target = subject !== 'all' ? subject : state.subjects.find(s => !s.archived)?.id;
    if (!target) return notify('Crie uma disciplina para guardar os cartões.');
    const questions = ai.questions;
    const today = day();
    const accepted = change(s => ({
      ...s,
      cards: [
        ...s.cards,
        ...questions.map(q => ({ id: id(), subject_id: target, question: q.q.slice(0, 1000), answer: q.options[q.correct].slice(0, 3000), stage: 0, due_date: addDays(today, 1), reviews: 0 })),
      ],
    }));
    if (accepted) {
      setAi(a => ({ ...a, saved: true }));
      notify(`${questions.length} perguntas da IA viraram flashcards.`);
    }
  };
  const sound = useSound();
  const g = gameOf(state);
  const house = g.house ? HOUSES[g.house.id] : null;
  const own = state.cards
    .filter(c => subject === 'all' || c.subject_id === subject)
    .map(c => ({ q: c.question, a: c.answer }));
  // Logged-in students only play with content about their own subjects; the
  // generic sample deck is just for the offline demo.
  const deckSource: 'own' | 'sample' | 'none' = own.length >= 4 ? 'own' : user ? 'none' : 'sample';
  const usingSample = deckSource !== 'own';
  const deck = deckSource === 'own' ? own : deckSource === 'sample' ? SAMPLE_DECK : [];
  const activeSubjects = state.subjects.filter(sub => !sub.archived);
  const cardCount = (subjectId: string) => state.cards.filter(c => c.subject_id === subjectId).length;
  const [deckGen, setDeckGen] = useState<{ subjectId: string; error?: string } | null>(null);
  const generateDeck = async (subjectId: string) => {
    const sub = state.subjects.find(x => x.id === subjectId);
    if (!sub || (deckGen && !deckGen.error)) return;
    setDeckGen({ subjectId });
    const topics = state.tasks.filter(t => t.subject_id === subjectId).slice(0, 12).map(t => t.title);
    try {
      // The subject name comes first so the server's web search finds the
      // actual topic. Tasks are only listed as topics, never as the subject of
      // the questions.
      const response = await generateStudyAI({
        kind: 'flashcards',
        subject_id: subjectId,
        task_ids: [],
        source_text: [
          `${sub.name}.`,
          sub.description,
          topics.length ? `Tópicos estudados: ${topics.join('; ')}.` : '',
          `Crie flashcards sobre o CONTEÚDO de ${sub.name} (conceitos, definições, comandos, fórmulas, fatos e exemplos), com pergunta direta e resposta curta de até 8 palavras, todas diferentes. Não pergunte sobre tarefas, prazos ou professores.`,
        ].filter(Boolean).join(' '),
        options: { count: 10, difficulty: 'intermediate', days: 1, start_date: day(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo' },
      });
      const drafts = (response.data as { cards: Array<{ question: string; answer: string }> }).cards;
      const today = day();
      const accepted = change(st => ({
        ...st,
        cards: [
          ...st.cards,
          ...drafts.map(c => ({ id: id(), subject_id: subjectId, question: c.question.slice(0, 1000), answer: c.answer.slice(0, 3000), stage: 0, due_date: today, reviews: 0 })),
        ],
      }));
      setDeckGen(null);
      if (accepted) {
        notify(`Baralho de ${sub.name} pronto: ${drafts.length} cartões criados pela IA.`);
      }
    } catch (error) {
      setDeckGen({ subjectId, error: error instanceof Error ? error.message : 'A IA não conseguiu montar o baralho.' });
    }
  };
  const attempted = useRef(new Set<string>());
  const needDeck = activeSubjects.filter(sub => cardCount(sub.id) < 4);
  useEffect(() => {
    if (!user || deckGen || playing) return;
    const next = needDeck.find(sub => !attempted.current.has(sub.id) && (subject === 'all' || sub.id === subject));
    if (!next) return;
    attempted.current.add(next.id);
    void generateDeck(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, deckGen, playing, subject, needDeck.map(sub => sub.id).join()]);
  const today = day();
  const todayXP = g.arcade.filter(r => r.date === today).reduce((a, r) => a + r.xp, 0);

  const finish = (game: GameId, score: number, fromAI = false) => {
    const best = arcadeBest(state, game);
    const xp = arcadeXP(state, game, score);
    if (!change(s => recordArcade(s, game, score).state)) return;
    setResult({ game, score, xp, best, ai: fromAI });
    setPlaying(null);
    if (score > best) sound.play('win');
    notify(`${ARCADE_NAMES[game]}: ${score} pontos · +${xp} XP`);
  };

  if (playing)
    return (
      <div className="arena-play">
        <div className="arena-play-top">
          <button className="text-button" onClick={() => setPlaying(null)}>
            <ArrowLeft size={16} /> Sair do jogo
          </button>
          <b>{playing === 'ai' ? `Desafio da IA · ${ai.title ?? ''}` : ARCADE_NAMES[playing]}</b>
          <button className="icon-button" onClick={sound.toggle} aria-label={sound.on ? 'Desligar som' : 'Ligar som'}>
            {sound.on ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
        {playing === 'blitz' && <Blitz deck={deck} play={sound.play} onEnd={s => finish('blitz', s)} />}
        {playing === 'ai' && ai.questions && <Blitz deck={deck} questions={ai.questions} play={sound.play} onEnd={s => finish('blitz', s, true)} />}
        {playing === 'memory' && <Memory deck={deck} play={sound.play} onEnd={s => finish('memory', s)} />}
        {playing === 'truefalse' && <TrueFalse deck={deck} play={sound.play} onEnd={s => finish('truefalse', s)} />}
      </div>
    );

  const games: Array<{ id: GameId; icon: typeof Zap; text: string; detail: string; color: string }> = [
    { id: 'blitz', icon: Zap, text: '60 segundos. Escolha a resposta certa entre quatro. Acertos seguidos multiplicam seus pontos.', detail: 'Combo até ×5 · erro custa 3 s', color: '#f2a541' },
    { id: 'memory', icon: Brain, text: 'Encontre os pares de pergunta e resposta. Menos jogadas, mais pontos.', detail: 'Até 6 pares · 100 pontos no perfeito', color: '#8b5cf6' },
    { id: 'truefalse', icon: Check, text: 'A resposta mostrada está certa? Decida rápido: respostas em menos de 3 s valem bônus.', detail: '12 rodadas · teclas ← e →', color: '#2a9d6f' },
  ];

  return (
    <div className="arena">
      <Confetti burst={result && result.score > result.best ? result.score : 0} />
      <section className="arena-hero" style={house ? ({ '--hc': house.color, '--hd': house.deep } as CSSProperties) : undefined}>
        <div>
          <h1>Arena</h1>
          <p>
            Três jogos rápidos com os cartões das suas disciplinas. Cada partida vale XP, conta para as missões e soma
            pontos para a sua casa.
          </p>
          <div className="arena-cap">
            <span>
              XP da Arena hoje: <b>{todayXP}</b> / {ARCADE_DAILY_CAP}
            </span>
            <em>
              <i style={{ width: `${Math.min(100, (todayXP / ARCADE_DAILY_CAP) * 100)}%` }} />
            </em>
          </div>
        </div>
        {house ? (
          <button className="arena-house" onClick={onSort} title="Ver ou refazer o Chapéu Seletor">
            <HouseCrest house={house.id} size={92} />
            <small>Você joga por</small>
            <b>{house.name}</b>
          </button>
        ) : (
          <button className="arena-house empty" onClick={onSort}>
            <Crown size={40} />
            <b>Descubra sua casa</b>
            <small>Coloque o Chapéu Seletor</small>
          </button>
        )}
      </section>

      {result && (
        <section className={'arena-result' + (result.score > result.best ? ' record' : '')}>
          <Trophy size={30} />
          <div>
            <small>{ARCADE_NAMES[result.game]}</small>
            <h2>
              {result.score} pontos{result.score > result.best ? ' · Novo recorde!' : ''}
            </h2>
            <p>
              +{result.xp} XP{result.xp === 0 ? ' (limite diário da Arena atingido)' : ''} · recorde anterior: {result.best}
            </p>
          </div>
          <div className="arena-result-actions">
            {result.ai && ai.questions && (
              <button className="btn secondary" disabled={ai.saved} onClick={saveAICards}>
                <CopyPlus size={16} /> {ai.saved ? 'Salvos como cartões' : 'Salvar como flashcards'}
              </button>
            )}
            <button className="btn primary" onClick={() => { setResult(null); setPlaying(result.ai ? 'ai' : result.game); }}>
              <RotateCcw size={16} /> Jogar de novo
            </button>
          </div>
        </section>
      )}

      <section className="arena-ai">
        <span className="arena-ai-icon">
          <Wand size={26} />
        </span>
        <div className="arena-ai-body">
          <h2>Desafio da IA</h2>
          <p>Diga um tema: a IA pesquisa na web e monta uma partida de Quiz Relâmpago só sua, na hora.</p>
          {!user ? (
            <button className="btn secondary" onClick={login}>Entrar para jogar com a IA</button>
          ) : (
            <form
              className="arena-ai-form"
              onSubmit={e => {
                e.preventDefault();
                if (ai.status !== 'loading') void generateMatch();
              }}
            >
              <input
                aria-label="Tema do desafio"
                placeholder={subjectName ? `Ex.: ${subjectName}` : 'Ex.: revolução francesa, frações, verb to be'}
                value={topic}
                maxLength={120}
                onChange={e => setTopic(e.target.value)}
                disabled={ai.status === 'loading'}
              />
              <button className="btn primary" disabled={ai.status === 'loading'}>
                {ai.status === 'loading' ? <LoaderCircle size={16} className="spin" /> : <Wand size={16} />}
                {ai.status === 'loading' ? 'Gerando…' : 'Gerar partida'}
              </button>
            </form>
          )}
          {ai.status === 'loading' && (
            <p className="arena-ai-status" aria-live="polite">
              {['Pesquisando o tema na web…', 'Escrevendo as perguntas…', 'Conferindo as respostas…', 'Quase pronto…'][Math.min(3, aiStep)]}
            </p>
          )}
          {ai.status === 'error' && <p className="arena-ai-error" role="alert">{ai.error}</p>}
          {ai.status === 'ready' && ai.questions && (
            <div className="arena-ai-ready">
              <span>
                <Check size={15} /> <b>{ai.title}</b> · {ai.questions.length} perguntas prontas
              </span>
              <button className="btn primary" onClick={() => { setResult(null); setPlaying('ai'); }}>
                Jogar agora
              </button>
            </div>
          )}
        </div>
      </section>

      {activeSubjects.length > 0 && (user ? needDeck.length > 0 || !!deckGen : usingSample) && (
        <section className="arena-decks">
          <div className="arena-decks-head">
            <Layers size={20} />
            <div>
              <h2>{user ? 'A IA está montando seus baralhos' : 'Baralhos das suas disciplinas'}</h2>
              <p>
                {user
                  ? 'Para cada disciplina, a IA pesquisa o conteúdo na web e cria 10 cartões (conceitos, definições, fatos). Eles ficam salvos em Revisões e alimentam os 3 jogos.'
                  : 'Entre na sua conta para a IA pesquisar o conteúdo das suas disciplinas na web e criar os cartões. Enquanto isso, os jogos usam um baralho de exemplo.'}
              </p>
            </div>
          </div>
          <div className="arena-decks-list">
            {activeSubjects.map(sub => {
              const busy = deckGen?.subjectId === sub.id && !deckGen.error;
              return (
                <div key={sub.id} className={'arena-deck-chip ' + sub.color}>
                  <span className={'subject-dot ' + sub.color} />
                  <b>{sub.name}</b>
                  <small>{cardCount(sub.id)} {cardCount(sub.id) === 1 ? 'cartão' : 'cartões'}</small>
                  {user ? (
                    busy ? (
                      <span className="arena-deck-status">
                        <LoaderCircle size={14} className="spin" /> Pesquisando e criando…
                      </span>
                    ) : cardCount(sub.id) >= 4 ? (
                      <span className="arena-deck-status ok">✓ Pronto para jogar</span>
                    ) : (
                      <button className="btn secondary" disabled={!!deckGen && !deckGen.error} onClick={() => void generateDeck(sub.id)}>
                        <Wand size={14} /> {attempted.current.has(sub.id) ? 'Tentar de novo' : 'Na fila · gerar agora'}
                      </button>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
          {deckGen?.error && <p className="arena-ai-error" role="alert">{deckGen.error}</p>}
          {!user && (
            <button className="btn secondary" onClick={login}>
              Entrar para gerar baralhos com IA
            </button>
          )}
        </section>
      )}

      <div className="arena-deck">
        <div>
          <Layers size={18} />
          <span>
            {deckSource === 'own' ? (
              <>
                Jogando com <b>{own.length} cartões</b> {subject === 'all' ? 'das suas disciplinas' : `de ${subjectName}`}.
              </>
            ) : deckSource === 'none' ? (
              <>
                {activeSubjects.length
                  ? 'Os jogos liberam assim que a IA terminar o primeiro baralho (cerca de 1 minuto por disciplina).'
                  : 'Cadastre suas disciplinas para a IA montar os baralhos de conteúdo.'}
              </>
            ) : (
              <>Jogando com o <b>baralho de exemplo</b>. Entre na sua conta para jogar com o conteúdo das suas disciplinas.</>
            )}
          </span>
        </div>
        <div className="arena-deck-actions">
          <Choice
            label="Disciplina do baralho"
            value={subject}
            onChange={setSubject}
            items={[{ value: 'all', label: 'Todas as disciplinas' }, ...state.subjects.map(s => ({ value: s.id, label: s.name }))]}
          />
          <button className="text-button" onClick={onCreateCards}>
            Criar cartão
          </button>
          <button className="text-button" onClick={onAI}>
            Gerar com IA
          </button>
        </div>
      </div>

      <div className="arena-games">
        {games.map(game => (
          <article key={game.id} className="arena-game" style={{ '--gc': game.color } as CSSProperties}>
            <span className="arena-game-icon">
              <game.icon size={28} />
            </span>
            <h2>{ARCADE_NAMES[game.id]}</h2>
            <p>{game.text}</p>
            <small>{game.detail}</small>
            <div className="arena-game-foot">
              <span>
                <Trophy size={14} /> Recorde: <b>{arcadeBest(state, game.id)}</b>
              </span>
              <button className="btn primary" disabled={deck.length < 4} onClick={() => { setResult(null); setPlaying(game.id); }}>
                Jogar
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="form-help">
        <Coins size={13} /> Pontos da Arena viram XP com limite de {ARCADE_DAILY_CAP} XP por dia, para o jogo complementar o
        estudo, e não substituí-lo.
      </p>
    </div>
  );
}

/* -------------------------------------------------------- Quiz Relâmpago */
function Blitz({ deck, questions, play, onEnd }: { deck: Card[]; questions?: AIQuestion[]; play: (k: 'good' | 'bad' | 'win' | 'flip') => void; onEnd: (score: number) => void }) {
  const DURATION = 60_000;
  const [end, setEnd] = useState(() => Date.now() + DURATION);
  const [now, setNow] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const order = useRef(shuffle(deck));
  const [turn, setTurn] = useState(0);
  const finished = useRef(false);
  const fixed = questions?.[turn];
  const card = fixed ? { q: fixed.q, a: fixed.options[fixed.correct] } : order.current[turn % order.current.length];
  const options = useMemo(() => {
    if (fixed) return fixed.options;
    const wrong = shuffle(deck.filter(c => c.a !== card.a && (!(card as Card).kind || c.kind === (card as Card).kind)).map(c => c.a)).filter((a, i, all) => all.indexOf(a) === i).slice(0, 3);
    return shuffle([card.a, ...wrong]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, deck, fixed]);
  const [hint, setHint] = useState('');
  const multiplier = Math.min(5, 1 + Math.floor(combo / 3));
  const left = Math.max(0, end - now);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const outOfQuestions = !!questions && turn >= questions.length;
  useEffect(() => {
    if ((left <= 0 || outOfQuestions) && !finished.current) {
      finished.current = true;
      onEnd(score);
    }
  }, [left, outOfQuestions, score, onEnd]);

  const pick = (answer: string) => {
    if (left <= 0 || outOfQuestions) return;
    setHint(fixed && answer !== card.a ? `${card.a}. ${fixed.explanation}` : '');
    if (answer === card.a) {
      setScore(s => s + multiplier);
      setCombo(c => c + 1);
      setFlash('good');
      play('good');
    } else {
      setCombo(0);
      setEnd(e => e - 3000);
      setFlash('bad');
      play('bad');
    }
    setTimeout(() => setFlash(null), 250);
    if (!questions && turn + 1 >= order.current.length) order.current = shuffle(deck);
    setTurn(t => t + 1);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) pick(options[n - 1]);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  return (
    <div className={'blitz' + (flash ? ` flash-${flash}` : '')}>
      <div className="blitz-hud">
        <span className={'blitz-time' + (left < 10_000 ? ' low' : '')}>
          <Timer size={18} /> {Math.ceil(left / 1000)}s
        </span>
        <em className="blitz-bar">
          <i style={{ width: `${(left / DURATION) * 100}%` }} />
        </em>
        <span className="blitz-score">{score} pts</span>
        <span className={'blitz-combo' + (multiplier > 1 ? ' hot' : '')}>×{multiplier}</span>
      </div>
      <div className="blitz-card" key={turn}>
        <small>PERGUNTA {turn + 1}{questions ? ` DE ${questions.length}` : ''}</small>
        <h2>{outOfQuestions ? 'Fim das perguntas!' : card.q}</h2>
      </div>
      {hint && <p className="blitz-hint">Resposta certa: {hint}</p>}
      <div className="blitz-options">
        {options.map((option, i) => (
          <button key={option + i} onClick={() => pick(option)}>
            <i>{i + 1}</i>
            {option}
          </button>
        ))}
      </div>
      <p className="form-help">Atalho: teclas 1 a 4. Combo: {combo} acertos seguidos.</p>
    </div>
  );
}

/* -------------------------------------------------------- Jogo da Memória */
type Tile = { id: string; pair: number; kind: 'q' | 'a'; text: string };
function Memory({ deck, play, onEnd }: { deck: Card[]; play: (k: 'good' | 'bad' | 'win' | 'flip') => void; onEnd: (score: number) => void }) {
  const tiles = useMemo<Tile[]>(() => {
    const cards = shuffle(deck).slice(0, 6);
    return shuffle(
      cards.flatMap((c, pair) => [
        { id: `q${pair}`, pair, kind: 'q' as const, text: c.q },
        { id: `a${pair}`, pair, kind: 'a' as const, text: c.a },
      ]),
    );
  }, [deck]);
  const pairs = tiles.length / 2;
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [start] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const done = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (matched.length === pairs && !done.current) {
      done.current = true;
      const seconds = (Date.now() - start) / 1000;
      const score = Math.max(10, Math.round(100 - (moves - pairs) * 6 - Math.max(0, seconds - pairs * 6) / 3));
      setTimeout(() => onEnd(score), 600);
    }
  }, [matched, pairs, moves, start, onEnd]);

  const flip = (tile: Tile) => {
    if (open.length === 2 || open.includes(tile.id) || matched.includes(tile.pair)) return;
    play('flip');
    const next = [...open, tile.id];
    setOpen(next);
    if (next.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = next.map(id => tiles.find(t => t.id === id)!);
      if (a.pair === b.pair) {
        setTimeout(() => {
          setMatched(m => [...m, a.pair]);
          setOpen([]);
          play('good');
        }, 350);
      } else
        setTimeout(() => {
          setOpen([]);
          play('bad');
        }, 950);
    }
  };
  return (
    <div className="memory">
      <div className="blitz-hud">
        <span>
          <Brain size={18} /> {matched.length}/{pairs} pares
        </span>
        <span>{moves} jogadas</span>
        <span>
          <Timer size={16} /> {Math.round((now - start) / 1000)}s
        </span>
      </div>
      <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${tiles.length > 8 ? 4 : 3}, minmax(0, 1fr))` }}>
        {tiles.map(tile => {
          const shown = open.includes(tile.id) || matched.includes(tile.pair);
          return (
            <button
              key={tile.id}
              className={'memory-tile' + (shown ? ' shown' : '') + (matched.includes(tile.pair) ? ' matched' : '')}
              onClick={() => flip(tile)}
              aria-label={shown ? tile.text : 'Carta virada'}
            >
              <span className="memory-inner">
                <span className="memory-back">
                  <span className="track-mark" aria-hidden="true"><i /><i /><i /></span>
                </span>
                <span className={`memory-front kind-${tile.kind}`}>
                  <small>{tile.kind === 'q' ? 'PERGUNTA' : 'RESPOSTA'}</small>
                  {tile.text}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- Verdadeiro ou Falso */
function TrueFalse({ deck, play, onEnd }: { deck: Card[]; play: (k: 'good' | 'bad' | 'win' | 'flip') => void; onEnd: (score: number) => void }) {
  const ROUNDS = 12;
  const rounds = useMemo(
    () =>
      Array.from({ length: ROUNDS }, (_, i) => {
        const card = deck[i % deck.length];
        const truth = Math.random() < 0.5;
        const others = deck.filter(c => c.a !== card.a && (!card.kind || c.kind === card.kind));
        const shown = truth || !others.length ? card.a : others[Math.floor(Math.random() * others.length)].a;
        return { q: card.q, shown, truth: shown === card.a };
      }).sort(() => Math.random() - 0.5),
    [deck],
  );
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(Date.now());
  const [feedback, setFeedback] = useState<{ ok: boolean; truth: boolean } | null>(null);
  const done = useRef(false);
  const round = rounds[i];

  const answer = (value: boolean) => {
    if (feedback || done.current) return;
    const ok = value === round.truth;
    const fast = Date.now() - asked < 3000;
    const gained = ok ? (fast ? 2 : 1) : 0;
    setScore(s => s + gained);
    setFeedback({ ok, truth: round.truth });
    play(ok ? 'good' : 'bad');
    setTimeout(() => {
      setFeedback(null);
      if (i + 1 >= ROUNDS) {
        done.current = true;
        onEnd(score + gained);
      } else {
        setI(i + 1);
        setAsked(Date.now());
      }
    }, 900);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'v') answer(true);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'f') answer(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <div className={'truefalse' + (feedback ? (feedback.ok ? ' flash-good' : ' flash-bad') : '')}>
      <div className="blitz-hud">
        <span>
          Rodada {i + 1}/{ROUNDS}
        </span>
        <em className="blitz-bar">
          <i style={{ width: `${(i / ROUNDS) * 100}%` }} />
        </em>
        <span className="blitz-score">{score} pts</span>
      </div>
      <div className="blitz-card" key={i}>
        <small>PERGUNTA</small>
        <h2>{round.q}</h2>
        <div className="tf-answer">
          <small>RESPOSTA PROPOSTA</small>
          <b>{round.shown}</b>
        </div>
        {feedback && (
          <p className={'tf-feedback ' + (feedback.ok ? 'ok' : 'no')}>
            {feedback.ok ? 'Isso!' : 'Ops!'} A resposta {feedback.truth ? 'estava certa' : 'estava errada'}.
          </p>
        )}
      </div>
      <div className="tf-buttons">
        <button className="tf-true" onClick={() => answer(true)}>
          <Check size={22} /> Verdadeiro <small>←</small>
        </button>
        <button className="tf-false" onClick={() => answer(false)}>
          <X size={22} /> Falso <small>→</small>
        </button>
      </div>
    </div>
  );
}
