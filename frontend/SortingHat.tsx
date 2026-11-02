'use client';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, AudioWaveform, Eye, Feather, Hammer, X } from 'lucide-react';
import {
  HAT_LINES,
  HOUSES,
  HOUSE_LIST,
  SORTING_QUESTIONS,
  THINKING_LINES,
  sortHouse,
  type HouseId,
} from './houses';
import { Confetti } from './GameUI';

export const HOUSE_EMBLEMS = { eye: Eye, waves: AudioWaveform, hammer: Hammer, feather: Feather };

export function HouseCrest({ house, size = 120 }: { house: HouseId; size?: number }) {
  const h = HOUSES[house];
  const Icon = HOUSE_EMBLEMS[h.emblem as keyof typeof HOUSE_EMBLEMS];
  return (
    <span
      className="crest"
      style={{ '--hc': h.color, '--hd': h.deep, '--hs': h.soft, '--cs': `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <Icon size={size * 0.38} strokeWidth={1.8} />
      <b>{h.name}</b>
    </span>
  );
}

/** Animated talking hat drawn in SVG; mood drives the CSS animation. */
export function Hat({ mood }: { mood: 'idle' | 'talking' | 'thinking' | 'proud' }) {
  return (
    <svg className={`hat hat-${mood}`} viewBox="0 0 220 200" aria-hidden="true">
      <defs>
        <linearGradient id="hatFelt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6a4a" />
          <stop offset="0.55" stopColor="#5d4430" />
          <stop offset="1" stopColor="#3b2a1d" />
        </linearGradient>
        <linearGradient id="hatBand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c99a3b" />
          <stop offset="1" stopColor="#8a6420" />
        </linearGradient>
      </defs>
      <g className="hat-body">
        <path d="M20 170 C 50 150, 170 150, 200 170 C 185 186, 35 186, 20 170 Z" fill="#3b2a1d" />
        <path
          d="M52 160 C 62 120, 80 90, 92 62 C 100 40, 112 22, 138 10 C 128 26, 126 38, 132 52 C 140 72, 150 110, 168 160 C 130 170, 90 170, 52 160 Z"
          fill="url(#hatFelt)"
        />
        <path d="M138 10 C 150 18, 160 20, 172 16 C 160 30, 146 34, 132 52 C 126 38, 128 26, 138 10 Z" fill="#4a3524" />
        <path d="M58 146 C 92 156, 130 156, 164 146 L 167 158 C 130 168, 92 168, 55 158 Z" fill="url(#hatBand)" />
        <path className="hat-fold" d="M84 112 C 96 104, 108 104, 118 110" stroke="#2a1d13" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path className="hat-fold" d="M124 108 C 132 102, 142 102, 150 108" stroke="#2a1d13" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path className="hat-mouth" d="M92 132 C 108 142, 132 142, 146 130 C 132 136, 108 136, 92 132 Z" fill="#1d130c" />
        <path d="M70 90 C 76 80, 82 74, 88 70" stroke="#a3815e" strokeWidth="3" fill="none" opacity=".5" />
      </g>
    </svg>
  );
}

type Phase = 'intro' | 'quiz' | 'thinking' | 'reveal';

export default function SortingHat({
  name,
  onDone,
  onClose,
  price,
  canShare,
  sharing,
}: {
  name: string;
  onDone: (house: HouseId, scores: Record<HouseId, number>, share: boolean) => void;
  onClose?: () => void;
  price?: number;
  /** Logged-in students can add their points to the House Cup. */
  canShare?: boolean;
  sharing?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<HouseId[]>([]);
  const [line, setLine] = useState(`Olá, ${name.split(' ')[0] || 'estudante'}. Deixe-me olhar dentro da sua cabeça…`);
  const [talk, setTalk] = useState(0);
  const [thinking, setThinking] = useState(0);
  const [burst, setBurst] = useState(0);
  const [share, setShare] = useState(sharing ?? true);
  useEffect(() => {
    if (!onClose || phase === 'reveal') return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose, phase]);
  const result = useMemo(() => sortHouse(answers), [answers]);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // The hat "talks" for a moment after every line change.
  const [talking, setTalking] = useState(true);
  useEffect(() => {
    setTalking(true);
    const t = setTimeout(() => setTalking(false), 1400);
    return () => clearTimeout(t);
  }, [talk, line]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    if (thinking >= THINKING_LINES.length) {
      setPhase('reveal');
      setBurst(n => n + 1);
      setLine(`${HOUSES[result.house].name.toUpperCase()}!`);
      return;
    }
    setLine(THINKING_LINES[thinking]);
    const t = setTimeout(() => setThinking(n => n + 1), reduced ? 300 : 1250);
    return () => clearTimeout(t);
  }, [phase, thinking, reduced, result.house]);

  const answer = (house: HouseId) => {
    const next = [...answers, house];
    setAnswers(next);
    const lines = HAT_LINES[house];
    setLine(lines[(index + next.length) % lines.length]);
    setTalk(n => n + 1);
    if (index + 1 >= SORTING_QUESTIONS.length) {
      setTimeout(() => setPhase('thinking'), reduced ? 0 : 700);
    } else setIndex(index + 1);
  };

  const q = SORTING_QUESTIONS[index];
  const house = HOUSES[result.house];
  const total = Math.max(1, answers.length);
  const mood = phase === 'thinking' ? 'thinking' : phase === 'reveal' ? 'proud' : talking ? 'talking' : 'idle';

  return (
    <div
      className={`sorting phase-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sorting-title"
      style={phase === 'reveal' ? ({ '--hc': house.color, '--hd': house.deep, '--hs': house.soft } as CSSProperties) : undefined}
    >
      <Confetti burst={burst} colors={[house.color, house.soft, '#ffffff', house.deep]} />
      <div className="sorting-stars" aria-hidden="true" />
      {onClose && phase !== 'reveal' && (
        <button className="sorting-close" onClick={onClose} aria-label="Fechar o Chapéu Seletor">
          <X size={20} />
        </button>
      )}
      <div className="sorting-stage">
        <div className="sorting-hat">
          <Hat mood={mood} />
          <p className="sorting-bubble" aria-live="polite" key={line}>
            {line}
          </p>
          {phase === 'thinking' && (
            <div className="sorting-orbit" aria-hidden="true">
              {HOUSE_LIST.map(h => (
                <span key={h.id} style={{ '--hc': h.color } as CSSProperties}>
                  {h.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {phase === 'intro' && (
          <div className="sorting-card">
            <small>A CERIMÔNIA DAS CASAS</small>
            <h1 id="sorting-title">O Chapéu Seletor</h1>
            <p>
              Cada pessoa aprende de um jeito. Responda {SORTING_QUESTIONS.length} perguntas rápidas e o chapéu vai escolher a sua
              casa de ensinamento: o perfil de estudo que mais combina com você.
            </p>
            <div className="sorting-houses">
              {HOUSE_LIST.map(h => (
                <span key={h.id} style={{ '--hc': h.color } as CSSProperties}>
                  <b>{h.name}</b>
                  <small>{h.profile}</small>
                </span>
              ))}
            </div>
            <button className="sorting-cta" onClick={() => { setPhase('quiz'); setLine('Vamos começar. Seja sincero!'); }}>
              Colocar o chapéu <ArrowRight size={18} />
            </button>
            {price ? <p className="sorting-note">Refazer a cerimônia custa {price} moedas, cobradas só se a casa mudar.</p> : null}
          </div>
        )}

        {phase === 'quiz' && (
          <div className="sorting-card" key={index}>
            <div className="sorting-progress" aria-label={`Pergunta ${index + 1} de ${SORTING_QUESTIONS.length}`}>
              {SORTING_QUESTIONS.map((_, i) => (
                <i key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />
              ))}
            </div>
            <small>
              PERGUNTA {index + 1} DE {SORTING_QUESTIONS.length}
            </small>
            <h2 id="sorting-title">{q.prompt}</h2>
            <div className="sorting-options">
              {q.options.map((option, i) => (
                <button key={option.text} onClick={() => answer(option.house)}>
                  <i>{String.fromCharCode(65 + i)}</i>
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'thinking' && (
          <div className="sorting-card thinking">
            <h2 id="sorting-title">O chapéu está decidindo…</h2>
            <div className="sorting-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="sorting-card reveal">
            <HouseCrest house={house.id} size={130} />
            <small>SUA CASA DE ENSINAMENTO</small>
            <h1 id="sorting-title">{house.name}</h1>
            <p className="sorting-motto">“{house.motto}”</p>
            <p>{house.description}</p>
            <div className="sorting-profile">
              {HOUSE_LIST.map(h => (
                <div key={h.id} style={{ '--hc': h.color } as CSSProperties}>
                  <span>{h.name}</span>
                  <em>
                    <i style={{ width: `${(result.scores[h.id] / total) * 100}%` }} />
                  </em>
                  <b>{Math.round((result.scores[h.id] / total) * 100)}%</b>
                </div>
              ))}
            </div>
            <ul className="sorting-tips">
              {house.tips.map(t => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {canShare && (
              <label className="sorting-share">
                <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} />
                <span>
                  <b>Somar meus pontos para {house.name} na Taça das Casas</b>
                  <small>No ranking aparecem só seu nome, nível, sequência e XP. Dá para mudar quando quiser na Jornada.</small>
                </span>
              </label>
            )}
            <button className="sorting-cta" autoFocus onClick={() => onDone(house.id, result.scores, canShare ? share : false)}>
              Entrar na casa {house.name} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
