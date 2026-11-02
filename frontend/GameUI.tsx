'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Award,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Clock,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  Layers,
  Library,
  ListChecks,
  Medal,
  Moon,
  Mountain,
  PartyPopper,
  Repeat,
  Rocket,
  ScrollText,
  Shield,
  Snowflake,
  Sofa,
  Sparkles,
  Star,
  Sunrise,
  Target,
  Timer,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  CHEST,
  RARITY,
  SHOP,
  autoFreeze,
  chestKey,
  claim,
  dailyQuests,
  gameSummary,
  mondayOf,
  newAchievements,
  streakInfo,
  type AchievementDef,
  type GameSummary,
  type Quest,
} from './game';
import { day, emptyGame, gameOf, type Workspace } from './model';
import { publishScore } from './repository';

export const ICONS: Record<string, LucideIcon> = {
  timer: Timer,
  flame: Flame,
  repeat: Repeat,
  check: Check,
  list: ListChecks,
  mountain: Mountain,
  layers: Layers,
  sunrise: Sunrise,
  calendar: CalendarDays,
  clock: Clock,
  target: Target,
  medal: Medal,
  crown: Crown,
  brain: Brain,
  rocket: Rocket,
  gem: Gem,
  zap: Zap,
  library: Library,
  star: Star,
  sparkles: Sparkles,
  trophy: Trophy,
  book: BookOpen,
  scroll: ScrollText,
  shield: Shield,
  moon: Moon,
  sofa: Sofa,
  gift: Gift,
  award: Award,
  gamepad: Gamepad2,
};
export const GameIcon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const Icon = ICONS[name] ?? Star;
  return <Icon size={size} />;
};

/* ------------------------------------------------------------ Avatar */

export function Avatar({
  name,
  frame,
  size = 34,
  level,
}: {
  name: string;
  frame?: string;
  size?: number;
  level?: number;
}) {
  return (
    <span
      className={`g-avatar ${frame ?? 'frame-none'}`}
      style={{ '--s': `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <b>{name.trim().slice(0, 1).toUpperCase() || 'E'}</b>
      {level !== undefined && <i>{level}</i>}
    </span>
  );
}

export function Ring({
  progress,
  size = 44,
  stroke = 3,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="g-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="value"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress / 100)}
        />
      </svg>
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- HUD */

export function GameHUD({
  summary,
  name,
  open,
}: {
  summary: GameSummary;
  name: string;
  open: (tab: string) => void;
}) {
  const { streak } = summary;
  return (
    <div className="g-hud">
      <button
        className={'g-hud-streak' + (streak.current ? ' lit' : '') + (streak.atRisk ? ' at-risk' : '')}
        onClick={() => open('overview')}
        aria-label={`Sequência de ${streak.current} dias${streak.atRisk ? ', estude hoje para manter' : ''}`}
        title={streak.atRisk ? 'Estude hoje para manter sua sequência!' : `Sequência de ${streak.current} dias`}
      >
        <Flame size={17} />
        <b>{streak.current}</b>
        {streak.freezes > 0 && (
          <span className="g-hud-freeze" title={`${streak.freezes} protetor(es)`}>
            <Snowflake size={10} />
            {streak.freezes}
          </span>
        )}
      </button>
      <button className="g-hud-coins" onClick={() => open('shop')} aria-label={`${summary.coins} moedas. Abrir loja`}>
        <Coins size={16} />
        <b>{summary.coins}</b>
      </button>
      <button
        className="g-hud-level"
        onClick={() => open('overview')}
        aria-label={`Nível ${summary.level}, ${summary.xp} XP. Abrir jornada`}
      >
        <Ring progress={summary.progress} size={38} stroke={3}>
          <Avatar name={name} frame={summary.frame} size={28} />
        </Ring>
        <span>
          <small>
            Nível {summary.level} · {summary.rank.name}
          </small>
          <em>
            <i style={{ width: `${summary.progress}%` }} />
          </em>
          <small className="g-hud-xp">
            {summary.into}/{summary.cost} XP
          </small>
        </span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ Quests */

export function QuestRow({ quest, onClaim }: { quest: Quest; onClaim: (q: Quest) => void }) {
  const pct = Math.round((quest.value / quest.target) * 100);
  return (
    <div
      className={'g-quest' + (quest.done ? ' done' : '') + (quest.claimed ? ' claimed' : '')}
    >
      <span className="g-quest-icon">
        {quest.claimed ? <Check size={18} /> : <GameIcon name={quest.icon} />}
      </span>
      <div className="g-quest-body">
        <b>{quest.title}</b>
        <small>{quest.detail}</small>
        <div className="g-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={quest.title}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="g-quest-reward">
        {quest.claimed ? (
          <span className="g-claimed">Resgatada</span>
        ) : quest.done ? (
          <button className="g-claim" onClick={() => onClaim(quest)}>
            Resgatar
          </button>
        ) : (
          <span className="g-count">
            {quest.value}/{quest.target}
          </span>
        )}
        <small>
          +{quest.xp} XP · <Coins size={11} /> {quest.coins}
        </small>
      </div>
    </div>
  );
}

function untilMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export function DailyQuests({
  state,
  onClaim,
  onChest,
  compact,
}: {
  state: Workspace;
  onClaim: (q: Quest) => void;
  onChest: () => void;
  compact?: boolean;
}) {
  const quests = dailyQuests(state);
  const claimedAll = quests.every(q => q.claimed);
  const chestOpen = gameOf(state).claims.some(c => c.key === chestKey());
  const doneCount = quests.filter(q => q.claimed).length;
  return (
    <div className={'g-daily' + (compact ? ' compact' : '')}>
      <div className="g-daily-head">
        <div>
          <h2>Missões de hoje</h2>
          <p>Renovam em {untilMidnight()}</p>
        </div>
        <span className="g-pips" aria-label={`${doneCount} de 3 resgatadas`}>
          {quests.map(q => (
            <i key={q.key} className={q.claimed ? 'on' : q.done ? 'ready' : ''} />
          ))}
        </span>
      </div>
      {quests.map(q => (
        <QuestRow key={q.key} quest={q} onClaim={onClaim} />
      ))}
      <button
        className={'g-chest' + (claimedAll && !chestOpen ? ' ready' : '') + (chestOpen ? ' opened' : '')}
        disabled={!claimedAll || chestOpen}
        onClick={onChest}
      >
        <Gift size={20} />
        <span>
          <b>{chestOpen ? 'Baú aberto hoje' : 'Baú diário'}</b>
          <small>
            {chestOpen
              ? 'Volte amanhã para novas missões.'
              : claimedAll
                ? 'Pronto para abrir!'
                : 'Resgate as 3 missões para abrir.'}
          </small>
        </span>
        <em>
          +{CHEST.xp} XP · <Coins size={12} /> {CHEST.coins}
        </em>
      </button>
    </div>
  );
}

/* ---------------------------------------------------------- Confetti */

export function Confetti({ burst, small, colors: palette }: { burst: number; small?: boolean; colors?: string[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = innerWidth * dpr;
    el.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = palette ?? ['#354fd5', '#f2a541', '#e85d75', '#2bb38a', '#8b5cf6', '#ffd23f'];
    const count = small ? 70 : 180;
    const parts = Array.from({ length: count }, () => ({
      x: small ? innerWidth - 180 : innerWidth / 2,
      y: small ? 90 : innerHeight / 3,
      vx: (Math.random() - 0.5) * (small ? 9 : 16),
      vy: -Math.random() * (small ? 8 : 14) - 3,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? 0 : 1,
    }));
    let frame = 0,
      raf = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - frame / 160);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (frame < 160) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst, small]);
  return <canvas ref={canvas} className="g-confetti" aria-hidden="true" />;
}

/* ------------------------------------------------- Engine side effects */

type Float = { id: number; xp: number };

export function useGame({
  state,
  ready,
  account,
  change,
  notify,
  user,
}: {
  state: Workspace;
  ready: boolean;
  account: string;
  change: (fn: (s: Workspace) => Workspace) => boolean;
  notify: (s: string) => void;
  user: { id: string } | null;
}) {
  const summary = useMemo(() => gameSummary(state), [state]);
  const prev = useRef<{ account: string; xp: number; level: number } | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [unlocks, setUnlocks] = useState<Pick<AchievementDef, 'id' | 'title' | 'text' | 'icon' | 'rarity'>[]>([]);
  const [burst, setBurst] = useState(0);
  const [smallBurst, setSmallBurst] = useState(0);
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // Record achievements, spend streak protectors and keep the best streak.
  useEffect(() => {
    if (!ready) return;
    const fresh = newAchievements(state);
    const freeze = autoFreeze(state);
    const best = streakInfo(state).best;
    const g = gameOf(state);
    const silent = !state.game;
    if (!fresh.length && !freeze && best <= g.best_streak && state.game) return;
    const today = day();
    const accepted = change(s => {
      const base = freeze ?? gameOf(s);
      const achievements = { ...base.achievements };
      for (const a of fresh) achievements[a.id] ??= today;
      return {
        ...s,
        game: { ...emptyGame(), ...base, achievements, best_streak: Math.max(base.best_streak, best) },
      };
    });
    if (!accepted) return;
    if (freeze) notifyRef.current('Um protetor de sequência cobriu ontem. Sua sequência continua!');
    if (!silent && fresh.length) {
      setUnlocks(q => [...q, ...fresh]);
      setSmallBurst(n => n + 1);
    }
  }, [state, ready, change]);

  // XP gains and level ups.
  useEffect(() => {
    if (!ready) return;
    const p = prev.current;
    prev.current = { account, xp: summary.xp, level: summary.level };
    if (!p || p.account !== account) return;
    if (summary.xp > p.xp) {
      const f = { id: Date.now() + Math.random(), xp: summary.xp - p.xp };
      setFloats(list => [...list, f]);
      setTimeout(() => setFloats(list => list.filter(x => x.id !== f.id)), 1800);
    }
    if (summary.level > p.level) {
      setLevelUp(summary.level);
      setBurst(n => n + 1);
    }
  }, [summary.xp, summary.level, account, ready]);

  // Achievement toasts leave on their own.
  useEffect(() => {
    if (!unlocks.length) return;
    const t = setTimeout(() => setUnlocks(q => q.slice(1)), 4800);
    return () => clearTimeout(t);
  }, [unlocks]);

  // Publish to the opt-in leaderboard.
  const game = gameOf(state);
  const publicName = state.settings.name;
  useEffect(() => {
    if (!user || !game.public || !ready) return;
    const t = setTimeout(() => {
      publishScore({
        user_id: user.id,
        display_name: publicName.trim().slice(0, 40) || 'Estudante',
        title: summary.title ?? null,
        frame: summary.frame ?? null,
        xp: summary.xp,
        level: summary.level,
        streak: summary.streak.current,
        week_start: mondayOf(day()),
        week_xp: summary.weekXP,
        house: game.house?.id ?? null,
      }).catch(error => console.warn('Ranking não atualizado:', error));
    }, 1200);
    return () => clearTimeout(t);
  }, [user, game.public, ready, publicName, summary.xp, summary.level, summary.streak.current, summary.weekXP, summary.title, summary.frame, game.house?.id]);

  const claimQuest = (q: Quest) => {
    if (change(s => claim(s, q.key, q.xp, q.coins)))
      notify(`Missão resgatada · +${q.xp} XP e ${q.coins} moedas`);
  };
  const openChest = () => {
    if (change(s => claim(s, chestKey(), CHEST.xp, CHEST.coins))) {
      setSmallBurst(n => n + 1);
      notify(`Baú aberto · +${CHEST.xp} XP e ${CHEST.coins} moedas`);
    }
  };

  const unlockedNow = levelUp
    ? SHOP.filter(i => i.level && i.level <= levelUp && i.level > levelUp - 1)
    : [];

  const overlay = (
    <>
      <Confetti burst={burst} />
      <Confetti burst={smallBurst} small />
      <div className="g-floats" aria-live="polite">
        {floats.map(f => (
          <span key={f.id} className="g-float">
            +{f.xp} XP
          </span>
        ))}
      </div>
      {unlocks[0] && (
        <div className={`g-unlock rarity-${unlocks[0].rarity}`} role="status">
          <span className="g-unlock-icon">
            <GameIcon name={unlocks[0].icon} size={24} />
          </span>
          <div>
            <small>Conquista desbloqueada · {RARITY[unlocks[0].rarity].label}</small>
            <b>{unlocks[0].title}</b>
            <p>
              {unlocks[0].text} <em>+{RARITY[unlocks[0].rarity].coins} moedas</em>
            </p>
          </div>
          <button aria-label="Fechar" onClick={() => setUnlocks(q => q.slice(1))}>
            <X size={15} />
          </button>
        </div>
      )}
      {levelUp && (
        <div className="g-levelup" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
          <div className="g-levelup-card">
            <PartyPopper className="g-levelup-pop" size={30} />
            <small>SUBIU DE NÍVEL</small>
            <div className={`g-levelup-badge tier-${summary.rank.tier}`}>
              <span>{levelUp}</span>
            </div>
            <h2 id="levelup-title">Nível {levelUp}!</h2>
            <p>
              Você agora é <b>{summary.rank.name}</b>. Ganhou <b>20 moedas</b> de recompensa.
            </p>
            {unlockedNow.length > 0 && (
              <div className="g-levelup-unlocks">
                <span>Novo na loja</span>
                {unlockedNow.map(i => (
                  <em key={i.id}>{i.name}</em>
                ))}
              </div>
            )}
            <button className="btn primary" autoFocus onClick={() => setLevelUp(null)}>
              Continuar estudando
            </button>
          </div>
        </div>
      )}
    </>
  );

  return { summary, overlay, claimQuest, openChest };
}

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;

/** Number that eases toward its value (from 0 on first render). */
export function CountUp({ value, format = (n: number) => String(n) }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || start === value) {
      setShown(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const began = performance.now();
    const duration = Math.min(1100, 450 + Math.abs(value - start) * 4);
    const tick = (now: number) => {
      const p = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return <>{format(shown)}</>;
}
