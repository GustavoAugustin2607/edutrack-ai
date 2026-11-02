'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Coins,
  Crown,
  Flame,
  Gift,
  LockKeyhole,
  LogIn,
  Medal,
  RefreshCw,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Trophy,
  Users,
  Zap,
  Castle,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { HOUSES, HOUSE_CHANGE_PRICE, HOUSE_LIST } from './houses';
import { HouseCrest } from './SortingHat';
import {
  RANKS,
  RARITY,
  SHOP,
  XP_RULES,
  achievementStatus,
  activityByDay,
  buy,
  freezeCount,
  levelCost,
  ledger,
  mondayOf,
  owned,
  weeklyQuests,
  type GameSummary,
  type Quest,
  type ShopItem,
} from './game';
import { addDays, day, emptyGame, gameOf, prettyDate, type Workspace } from './model';
import { Avatar, CountUp, DailyQuests, GameIcon, QuestRow } from './GameUI';
import { loadHouseCup, loadLeaderboard, removeScore, type LeaderRow } from './repository';

type Props = {
  state: Workspace;
  change: (fn: (s: Workspace) => Workspace) => boolean;
  notify: (s: string) => void;
  summary: GameSummary;
  tab: string;
  setTab: (t: string) => void;
  claimQuest: (q: Quest) => void;
  openChest: () => void;
  user: { id: string } | null;
  login: () => void;
  onSort: () => void;
  go: (page: string) => void;
};

const TABS = [
  { value: 'overview', label: 'Perfil', icon: Sparkles },
  { value: 'house', label: 'Casa', icon: Castle },
  { value: 'quests', label: 'Missões', icon: Gift },
  { value: 'badges', label: 'Conquistas', icon: Medal },
  { value: 'shop', label: 'Loja', icon: ShoppingBag },
  { value: 'ranking', label: 'Ranking', icon: Users },
];

export default function Journey(props: Props) {
  const { summary, state, tab, setTab } = props;
  const status = useMemo(() => achievementStatus(state), [state]);
  const unlocked = status.filter(a => a.unlockedAt || a.reached).length;
  return (
    <div className="journey">
      <section className={`g-hero tier-${summary.rank.tier}`}>
        <div className="g-hero-id">
          <Avatar name={state.settings.name} frame={summary.frame} size={86} level={summary.level} />
          <div>
            <span className="g-rank-chip">
              <Crown size={13} /> {summary.rank.name}
            </span>
            <h1>{state.settings.name}</h1>
            {summary.title && <p className="g-title-chip">“{summary.title}”</p>}
            {gameOf(state).house && (
              <button
                className="g-house-chip"
                style={{ '--hc': HOUSES[gameOf(state).house!.id].color } as CSSProperties}
                onClick={() => setTab('house')}
              >
                Casa {HOUSES[gameOf(state).house!.id].name}
              </button>
            )}
          </div>
        </div>
        <div className="g-hero-level">
          <div className="flex-between">
            <span>
              Nível <b>{summary.level}</b>
            </span>
            <span>
              {summary.into} / {summary.cost} XP
            </span>
          </div>
          <div className="g-bar big">
            <i style={{ width: `${summary.progress}%` }} />
          </div>
          <small>
            Faltam {summary.toNext} XP para o nível {summary.level + 1}
            {summary.nextRank ? ` · ${summary.nextRank.name} no nível ${summary.nextRank.min}` : ''}
          </small>
        </div>
        <div className="g-hero-stats">
          <div>
            <Zap size={17} />
            <b><CountUp value={summary.xp} format={n => n.toLocaleString('pt-BR')} /></b>
            <small>XP total</small>
          </div>
          <div className={summary.streak.current ? 'hot' : ''}>
            <Flame size={17} />
            <b><CountUp value={summary.streak.current} /></b>
            <small>dias seguidos</small>
          </div>
          <div>
            <Coins size={17} />
            <b><CountUp value={summary.coins} /></b>
            <small>moedas</small>
          </div>
          <div>
            <Trophy size={17} />
            <b>
              {unlocked}/{status.length}
            </b>
            <small>conquistas</small>
          </div>
        </div>
      </section>

      <nav className="g-tabs" aria-label="Seções da jornada">
        {TABS.map(t => (
          <button
            key={t.value}
            className={tab === t.value ? 'active' : ''}
            aria-current={tab === t.value ? 'page' : undefined}
            onClick={() => setTab(t.value)}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview {...props} />}
      {tab === 'house' && <HouseTab {...props} />}
      {tab === 'quests' && <Quests {...props} />}
      {tab === 'badges' && <Badges status={status} />}
      {tab === 'shop' && <Shop {...props} />}
      {tab === 'ranking' && <Ranking {...props} />}
    </div>
  );
}

/* ------------------------------------------------------------ Perfil */

function Overview({ state, summary, setTab }: Props) {
  const today = day();
  const activity = activityByDay(state);
  const weeks = 18;
  const start = addDays(mondayOf(today), -(weeks - 1) * 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const level = (v: number) => (v <= 0 ? 0 : v < 20 ? 1 : v < 45 ? 2 : v < 90 ? 3 : 4);
  const activeDays = cells.filter(d => (activity.get(d) ?? 0) > 0 && d <= today).length;
  const entries = ledger(state).slice(0, 10);
  const sourceIcon = { task: 'check', focus: 'timer', review: 'layers', quiz: 'sparkles', quest: 'scroll', achievement: 'trophy', arcade: 'gamepad' };
  return (
    <div className="g-overview">
      <section className="g-panel g-streak-panel">
        <div className={'g-flame' + (summary.streak.current ? ' lit' : '')}>
          <Flame size={42} />
          <b>{summary.streak.current}</b>
        </div>
        <div>
          <h2>
            {summary.streak.current
              ? `${summary.streak.current} ${summary.streak.current === 1 ? 'dia' : 'dias'} em sequência`
              : 'Comece uma sequência hoje'}
          </h2>
          <p>
            {summary.streak.atRisk
              ? 'Sua sequência está em risco: estude qualquer coisa hoje para mantê-la acesa.'
              : summary.streak.doneToday
                ? 'Você já estudou hoje. A chama está garantida até amanhã.'
                : 'Uma sessão de foco, uma tarefa ou uma revisão já acendem a chama.'}
          </p>
          <div className="g-streak-meta">
            <span>
              <Trophy size={14} /> Recorde: {summary.streak.best} dias
            </span>
            <span>
              <Snowflake size={14} /> {summary.streak.freezes} protetor(es)
            </span>
            <button className="text-button" onClick={() => setTab('shop')}>
              Comprar protetor
            </button>
          </div>
        </div>
        <div className="g-week-dots" aria-label="Últimos 7 dias">
          {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map(d => {
            const on = (activity.get(d) ?? 0) > 0;
            const frozen = gameOf(state).frozen.includes(d);
            return (
              <span key={d} className={on ? 'on' : frozen ? 'frozen' : d === today ? 'today' : ''}>
                <i>{on ? <Check size={12} /> : frozen ? <Snowflake size={11} /> : null}</i>
                <small>
                  {new Date(d + 'T12:00:00')
                    .toLocaleDateString('pt-BR', { weekday: 'narrow' })
                    .toUpperCase()}
                </small>
              </span>
            );
          })}
        </div>
      </section>

      <section className="g-panel g-heatmap-panel">
        <div className="g-panel-head">
          <div>
            <h2>Mapa de constância</h2>
            <p>
              {activeDays} dias ativos nas últimas {weeks} semanas
            </p>
          </div>
          <span className="g-legend">
            menos <i className="l0" />
            <i className="l1" />
            <i className="l2" />
            <i className="l3" />
            <i className="l4" /> mais
          </span>
        </div>
        <div className="g-heatmap" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
          {cells.map(d => (
            <i
              key={d}
              className={d > today ? 'future' : `l${level(activity.get(d) ?? 0)}`}
              title={`${prettyDate(d)}: ${activity.get(d) ?? 0} pontos de atividade`}
            />
          ))}
        </div>
      </section>

      <section className="g-panel g-ranks-panel">
        <div className="g-panel-head">
          <div>
            <h2>Patentes</h2>
            <p>Cada nível custa um pouco mais. Patentes mudam a cor do seu perfil.</p>
          </div>
        </div>
        <ol className="g-rank-road">
          {RANKS.map(r => {
            const reached = summary.level >= r.min;
            const current = summary.rank.name === r.name;
            return (
              <li key={r.name} className={`tier-${r.tier}` + (reached ? ' reached' : '') + (current ? ' current' : '')}>
                <span>{reached ? <Crown size={16} /> : <LockKeyhole size={14} />}</span>
                <b>{r.name}</b>
                <small>Nível {r.min}</small>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="g-panel g-history-panel">
        <div className="g-panel-head">
          <div>
            <h2>Últimos ganhos de XP</h2>
            <p>
              Hoje: <b>+{summary.todayXP} XP</b> · Esta semana: <b>+{summary.weekXP} XP</b>
            </p>
          </div>
        </div>
        <ul className="g-history">
          {entries.map((e, i) => (
            <li key={i}>
              <span className={`src-${e.source}`}>
                <GameIcon name={sourceIcon[e.source]} size={15} />
              </span>
              <p>
                <b>{e.label}</b>
                <small>{e.date ? prettyDate(e.date) : 'Histórico anterior'}</small>
              </p>
              <em>+{e.xp}</em>
            </li>
          ))}
          {!entries.length && <li className="g-empty">Seu primeiro XP aparece aqui.</li>}
        </ul>
      </section>

      <section className="g-panel g-rules-panel">
        <div className="g-panel-head">
          <div>
            <h2>Como ganhar XP</h2>
            <p>Pontos por progresso real. Descansar nunca tira pontos.</p>
          </div>
        </div>
        <ul className="g-rules">
          <li>
            <GameIcon name="check" /> Tarefa concluída <b>+{XP_RULES.task}</b>
          </li>
          <li>
            <GameIcon name="mountain" /> Prioridade alta / média <b>+{XP_RULES.taskHigh} / +{XP_RULES.taskMedium}</b>
          </li>
          <li>
            <GameIcon name="clock" /> Entregue no prazo <b>+{XP_RULES.onTime}</b>
          </li>
          <li>
            <GameIcon name="timer" /> Cada minuto de foco <b>+{XP_RULES.perMinute}</b>
          </li>
          <li>
            <GameIcon name="flame" /> Sessão de 25 min ou mais <b>+{XP_RULES.fullSession}</b>
          </li>
          <li>
            <GameIcon name="layers" /> Cada revisão de cartão <b>+{XP_RULES.review}</b>
          </li>
          <li>
            <GameIcon name="sparkles" /> Acerto no quiz / gabarito <b>+{XP_RULES.quizCorrect} / +{XP_RULES.quizPerfect}</b>
          </li>
          <li>
            <GameIcon name="scroll" /> Missões e baú diário <b>+30 a +150</b>
          </li>
        </ul>
        <p className="form-help">
          Subir de nível rende 20 moedas. Conquistas dão de 10 a 100 moedas, conforme a raridade. O nível {summary.level + 1} pede {levelCost(summary.level)} XP.
        </p>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------- Missões */

function Quests({ state, claimQuest, openChest }: Props) {
  const weekly = weeklyQuests(state);
  const end = addDays(mondayOf(day()), 6);
  return (
    <div className="g-quests-layout">
      <section className="g-panel">
        <DailyQuests state={state} onClaim={claimQuest} onChest={openChest} />
      </section>
      <section className="g-panel">
        <div className="g-daily-head">
          <div>
            <h2>Desafios da semana</h2>
            <p>Terminam {end === day() ? 'hoje à meia-noite' : `domingo, ${prettyDate(end)}`}</p>
          </div>
          <span className="g-weekly-badge">
            <Trophy size={14} /> Recompensas maiores
          </span>
        </div>
        {weekly.map(q => (
          <QuestRow key={q.key} quest={q} onClaim={claimQuest} />
        ))}
      </section>
    </div>
  );
}

/* -------------------------------------------------------- Conquistas */

function Badges({ status }: { status: ReturnType<typeof achievementStatus> }) {
  const groups = ['Todas', ...new Set(status.map(a => a.group))];
  const [group, setGroup] = useState('Todas');
  const list = status.filter(a => group === 'Todas' || a.group === group);
  return (
    <>
      <div className="g-chips" role="tablist">
        {groups.map(g => {
          const items = status.filter(a => g === 'Todas' || a.group === g);
          return (
            <button key={g} role="tab" aria-selected={group === g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>
              {g}
              <small>
                {items.filter(a => a.unlockedAt || a.reached).length}/{items.length}
              </small>
            </button>
          );
        })}
      </div>
      <div className="g-badges">
        {list.map(a => {
          const got = !!(a.unlockedAt || a.reached);
          const secret = a.hidden && !got;
          return (
            <article key={a.id} className={`g-badge rarity-${a.rarity}` + (got ? ' got' : ' locked')}>
              <div className="g-badge-medal">
                {secret ? <LockKeyhole size={26} /> : <GameIcon name={a.icon} size={30} />}
              </div>
              <span className="g-rarity">{RARITY[a.rarity].label}</span>
              <h3>{secret ? 'Conquista secreta' : a.title}</h3>
              <p>{secret ? 'Continue estudando para descobrir.' : a.text}</p>
              {got ? (
                <small className="g-got">
                  <Check size={13} /> {a.unlockedAt ? `Desbloqueada ${prettyDate(a.unlockedAt).toLowerCase()}` : 'Desbloqueada'}
                </small>
              ) : (
                <>
                  <div className="g-bar">
                    <i style={{ width: `${secret ? 0 : (a.value / a.target) * 100}%` }} />
                  </div>
                  <small>
                    {secret ? '???' : `${a.value} de ${a.target}`} · +{RARITY[a.rarity].coins} moedas
                  </small>
                </>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- Loja */

function Shop({ state, change, notify, summary }: Props) {
  const g = gameOf(state);
  const sections: Array<{ kind: ShopItem['kind']; title: string; text: string }> = [
    { kind: 'consumable', title: 'Itens', text: 'Ajudam a proteger seu progresso.' },
    { kind: 'theme', title: 'Temas de cor', text: 'Mudam a cor de destaque de todo o EduTrack.' },
    { kind: 'frame', title: 'Molduras de avatar', text: 'Aparecem no topo, no perfil e no ranking.' },
    { kind: 'title', title: 'Títulos', text: 'Uma frase sua no perfil e no ranking.' },
  ];
  const slot = (kind: ShopItem['kind']) => (kind === 'theme' ? 'theme' : kind === 'frame' ? 'frame' : 'title');
  const equip = (kind: ShopItem['kind'], id?: string) =>
    change(s => {
      const game = { ...emptyGame(), ...gameOf(s) };
      return { ...s, game: { ...game, equipped: { ...game.equipped, [slot(kind)]: id } } };
    });
  const purchase = (item: ShopItem) => {
    const result = buy(state, item);
    if (result.error) return notify(result.error);
    if (change(() => result.state))
      notify(
        item.kind === 'consumable'
          ? `${item.name} guardado. Ele é usado automaticamente quando preciso.`
          : `${item.name} comprado e equipado!`,
      );
  };
  return (
    <div className="g-shop">
      <div className="g-wallet">
        <Coins size={26} />
        <div>
          <b>{summary.coins} moedas</b>
          <small>Ganhe moedas com missões, baús, conquistas e subindo de nível.</small>
        </div>
      </div>
      {sections.map(sec => (
        <section key={sec.kind} className="g-shop-section">
          <div className="g-panel-head">
            <div>
              <h2>{sec.title}</h2>
              <p>{sec.text}</p>
            </div>
            {sec.kind !== 'consumable' && (
              <button className="text-button" onClick={() => equip(sec.kind, undefined)}>
                Usar padrão
              </button>
            )}
          </div>
          <div className="g-shop-grid">
            {SHOP.filter(i => i.kind === sec.kind).map(item => {
              const has = item.kind === 'consumable' ? freezeCount(g) > 0 : owned(g, item.id);
              const equipped = g.equipped[slot(item.kind)] === item.id;
              const locked = !!item.level && summary.level < item.level;
              const afford = summary.coins >= item.price;
              return (
                <article key={item.id} className={'g-item' + (equipped ? ' equipped' : '') + (locked ? ' locked' : '')}>
                  <div className={`g-item-preview kind-${item.kind}`}>
                    {item.kind === 'theme' && item.swatch && (
                      <span className="g-swatch" style={{ background: `linear-gradient(135deg, ${item.swatch[0]} 0 50%, ${item.swatch[1]} 50%)` }} />
                    )}
                    {item.kind === 'frame' && <Avatar name={state.settings.name} frame={item.id} size={52} />}
                    {item.kind === 'title' && <span className="g-title-chip">“{item.name}”</span>}
                    {item.kind === 'consumable' && (
                      <span className="g-freeze-icon">
                        <Snowflake size={28} />
                        {freezeCount(g) > 0 && <i>×{freezeCount(g)}</i>}
                      </span>
                    )}
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.text}</p>
                  {locked ? (
                    <button className="g-buy" disabled>
                      <LockKeyhole size={14} /> Nível {item.level}
                    </button>
                  ) : item.kind !== 'consumable' && has ? (
                    <button className={'g-buy ' + (equipped ? 'is-on' : 'ghost')} onClick={() => equip(item.kind, equipped ? undefined : item.id)}>
                      {equipped ? (
                        <>
                          <Check size={14} /> Equipado
                        </>
                      ) : (
                        'Equipar'
                      )}
                    </button>
                  ) : (
                    <button className="g-buy" disabled={!afford} onClick={() => purchase(item)}>
                      <Coins size={14} /> {item.price}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- Ranking */

function Ranking({ state, change, notify, summary, user, login }: Props) {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const isPublic = gameOf(state).public;
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setRows(null);
    setError('');
    // Give the publish effect a moment after opting in.
    const t = setTimeout(() => {
      loadLeaderboard(scope, mondayOf(day()))
        .then(r => alive && setRows(r))
        .catch(() => alive && setError('Não foi possível carregar o ranking agora.'));
    }, 1500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [user, scope, nonce, isPublic]);

  if (!user)
    return (
      <section className="g-panel g-ranking-gate">
        <Users size={36} />
        <h2>Compare seu ritmo com outros estudantes</h2>
        <p>O ranking semanal e geral fica disponível quando você entra na sua conta. A participação é opcional.</p>
        <button className="btn primary" onClick={login}>
          <LogIn size={16} /> Entrar ou criar conta
        </button>
      </section>
    );

  const toggle = () => {
    const next = !isPublic;
    if (!change(s => ({ ...s, game: { ...emptyGame(), ...gameOf(s), public: next } }))) return;
    if (!next) removeScore(user.id).catch(() => {});
    notify(next ? 'Você agora aparece no ranking.' : 'Você saiu do ranking.');
  };
  const medal = (i: number) => (i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '');
  return (
    <div className="g-ranking">
      <section className="g-panel g-optin">
        <div>
          <h2>{isPublic ? 'Você está no ranking' : 'Participe do ranking'}</h2>
          <p>
            Só aparecem seu nome de exibição ({state.settings.name}), título, moldura, nível, sequência e XP. Tarefas e
            conteúdos continuam privados.
          </p>
        </div>
        <button className={'g-switch' + (isPublic ? ' on' : '')} role="switch" aria-checked={isPublic} onClick={toggle}>
          <i />
          <span>{isPublic ? 'Visível' : 'Oculto'}</span>
        </button>
      </section>
      <div className="g-rank-toolbar">
        <div className="g-chips">
          <button className={scope === 'week' ? 'active' : ''} onClick={() => setScope('week')}>
            Esta semana
          </button>
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
            Geral
          </button>
        </div>
        <button className="icon-button" aria-label="Atualizar ranking" onClick={() => setNonce(n => n + 1)}>
          <RefreshCw size={16} />
        </button>
      </div>
      <section className="g-panel g-board">
        {error && <p className="g-empty">{error}</p>}
        {!error && !rows && <p className="g-empty">Carregando ranking…</p>}
        {rows && !rows.length && <p className="g-empty">Ninguém pontuou nesta semana ainda. Seja o primeiro!</p>}
        {rows?.map((r, i) => (
          <div key={r.user_id} className={'g-board-row' + (r.user_id === user.id ? ' me' : '')}>
            <span className={`g-pos ${medal(i)}`}>{i < 3 ? <Medal size={18} /> : i + 1}</span>
            <Avatar name={r.display_name} frame={r.frame ?? undefined} size={36} level={r.level} />
            <p>
              <b>
                {r.display_name}
                {r.user_id === user.id && <em> · você</em>}
              </b>
              <small>
                {r.title ? `“${r.title}” · ` : ''}Nível {r.level} · <Flame size={11} /> {r.streak}
              </small>
            </p>
            <strong>{(scope === 'week' ? r.week_xp : r.xp).toLocaleString('pt-BR')} XP</strong>
          </div>
        ))}
        {rows && isPublic && !rows.some(r => r.user_id === user.id) && (
          <p className="g-empty">Sua pontuação ({scope === 'week' ? summary.weekXP : summary.xp} XP) aparece após a próxima atualização.</p>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------- Casa */

function HouseTab({ state, user, onSort, go, change, notify }: Props) {
  const choice = gameOf(state).house;
  const [cup, setCup] = useState<Record<string, { xp: number; members: number }> | null>(null);
  const [cupError, setCupError] = useState(false);
  useEffect(() => {
    if (!user) return;
    loadHouseCup(mondayOf(day()))
      .then(setCup)
      .catch(() => setCupError(true));
  }, [user]);
  if (!choice)
    return (
      <section className="g-panel g-ranking-gate">
        <Castle size={38} />
        <h2>Você ainda não tem uma casa</h2>
        <p>O Chapéu Seletor faz 8 perguntas sobre como você aprende e escolhe uma das quatro casas de ensinamento.</p>
        <button className="btn primary" onClick={onSort}>
          Colocar o Chapéu Seletor
        </button>
      </section>
    );
  const house = HOUSES[choice.id];
  const total = Math.max(1, Object.values(choice.scores).reduce((a, b) => a + b, 0));
  const standings = HOUSE_LIST.map(h => ({ house: h, ...(cup?.[h.id] ?? { xp: 0, members: 0 }) })).sort((a, b) => b.xp - a.xp);
  const maxCup = Math.max(1, ...standings.map(r => r.xp));
  return (
    <div className="house-tab" style={{ '--hc': house.color, '--hd': house.deep, '--hs': house.soft } as CSSProperties}>
      <section className="g-panel house-card">
        <HouseCrest house={house.id} size={120} />
        <div>
          <small>{house.profile}</small>
          <h2>Casa {house.name}</h2>
          <p className="house-motto">“{house.motto}”</p>
          <p>{house.description}</p>
          <div className="house-tools">
            {house.tools.map(t => (
              <button key={t.label} className="btn secondary" onClick={() => go(t.page)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="g-overview">
        <section className="g-panel">
          <div className="g-panel-head">
            <div>
              <h2>Seu perfil de aprendizagem</h2>
              <p>Como suas respostas se distribuíram entre as casas.</p>
            </div>
          </div>
          <div className="sorting-profile">
            {HOUSE_LIST.map(h => (
              <div key={h.id} style={{ '--hc': h.color } as CSSProperties}>
                <span>{h.name}</span>
                <em>
                  <i style={{ width: `${((choice.scores[h.id] ?? 0) / total) * 100}%` }} />
                </em>
                <b>{Math.round(((choice.scores[h.id] ?? 0) / total) * 100)}%</b>
              </div>
            ))}
          </div>
          <h3 className="house-subhead">Pontos fortes</h3>
          <ul className="house-list">
            {house.strengths.map(t => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h3 className="house-subhead">Como estudar melhor</h3>
          <ul className="house-list">
            {house.tips.map(t => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <button className="text-button" onClick={onSort}>
            Refazer o Chapéu Seletor ({HOUSE_CHANGE_PRICE} moedas se mudar de casa)
          </button>
        </section>
        <section className="g-panel">
          <div className="g-panel-head">
            <div>
              <h2>Taça das Casas</h2>
              <p>XP da semana somado por casa, entre quem participa do ranking.</p>
            </div>
            <Trophy size={22} />
          </div>
          {!user ? (
            <p className="g-empty">Entre na sua conta para ver a disputa entre as casas.</p>
          ) : cupError ? (
            <p className="g-empty">Não foi possível carregar a taça agora.</p>
          ) : !cup ? (
            <p className="g-empty">Carregando…</p>
          ) : (
            <ol className="house-cup">
              {standings.map((row, i) => (
                <li key={row.house.id} className={row.house.id === house.id ? 'mine' : ''} style={{ '--hc': row.house.color } as CSSProperties}>
                  <span className="house-cup-pos">{i + 1}º</span>
                  <b>{row.house.name}</b>
                  <em>
                    <i style={{ width: `${(row.xp / maxCup) * 100}%` }} />
                  </em>
                  <small>
                    {row.xp.toLocaleString('pt-BR')} XP · {row.members} {row.members === 1 ? 'membro' : 'membros'}
                  </small>
                </li>
              ))}
            </ol>
          )}
          {user &&
            (gameOf(state).public ? (
              <p className="house-cup-note on">✓ Seus pontos estão somando para {house.name}.</p>
            ) : (
              <button
                className="btn primary house-cup-join"
                onClick={() => {
                  if (change(s => ({ ...s, game: { ...emptyGame(), ...gameOf(s), public: true } })))
                    notify(`Agora seus pontos somam para ${house.name}!`);
                }}
              >
                Somar meus pontos para {house.name}
              </button>
            ))}
        </section>
      </div>
    </div>
  );
}
