'use client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCheck,
  Cloud,
  Coins,
  Flame,
  Gamepad2,
  Home,
  Layers,
  LayoutDashboard,
  LogIn,
  Menu,
  Moon,
  Search,
  Settings,
  GraduationCap,
  Sun,
  Timer,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, CountUp, Ring } from './GameUI';
import type { GameSummary } from './game';
import { HOUSES, type HouseId } from './houses';

export type NavItem = { name: string; label: string; icon: LucideIcon; badge?: number; tone?: 'alert' | 'reward' };
export const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Estudar',
    items: [
      { name: 'Meu dia', label: 'Visão geral', icon: LayoutDashboard },
      { name: 'Planejamento', label: 'Planejamento', icon: CalendarDays },
      { name: 'Tarefas', label: 'Tarefas', icon: CheckCheck },
      { name: 'Disciplinas', label: 'Disciplinas', icon: BookOpen },
      { name: 'Modo foco', label: 'Foco', icon: Timer },
      { name: 'Revisões', label: 'Revisões', icon: Layers },
      { name: 'Assistente', label: 'Tutor IA', icon: GraduationCap },
    ],
  },
  {
    title: 'Progresso',
    items: [
      { name: 'Arena', label: 'Arena', icon: Gamepad2 },
      { name: 'Conquistas', label: 'Jornada', icon: Trophy },
      { name: 'Análise', label: 'Análise', icon: ChartNoAxesCombined },
    ],
  },
];
export const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

type Badges = Partial<Record<string, { count: number; tone: 'alert' | 'reward' }>>;

type ShellProps = {
  page: string;
  go: (page: string) => void;
  summary: GameSummary;
  name: string;
  house?: HouseId;
  badges: Badges;
  user: { id: string; email?: string } | null;
  dark: boolean;
  onToggleTheme: () => void;
  onLogin: () => void;
  onSearch: () => void;
  onNotifications: () => void;
  hasAlerts: boolean;
  openJourney: (tab: string) => void;
};

function NavButton({ item, active, badge, onClick }: { item: NavItem; active: boolean; badge?: Badges[string]; onClick: () => void }) {
  return (
    <button
      className={'side-link' + (active ? ' active' : '')}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <item.icon size={18} strokeWidth={active ? 2.2 : 1.9} />
      <span>{item.label}</span>
      {badge && badge.count > 0 && <small className={'side-badge ' + badge.tone}>{badge.count}</small>}
    </button>
  );
}

/** Profile card with level ring, rank, streak and wallet. */
function ProfileCard({ summary, name, house, openJourney }: Pick<ShellProps, 'summary' | 'name' | 'house' | 'openJourney'>) {
  const h = house ? HOUSES[house] : null;
  return (
    <div className="side-profile" style={h ? ({ '--hc': h.color } as CSSProperties) : undefined}>
      <button className="side-profile-main" onClick={() => openJourney('overview')} aria-label={`Seu perfil: nível ${summary.level}, ${summary.rank.name}`}>
        <Ring progress={summary.progress} size={48} stroke={3}>
          <Avatar name={name} frame={summary.frame} size={38} />
        </Ring>
        <span className="side-profile-text">
          <b>{name}</b>
          <small>
            {h ? <i className="side-house">{h.name}</i> : null}
            Nível {summary.level} · {summary.rank.name}
          </small>
        </span>
      </button>
      <div className="side-xp" aria-hidden="true">
        <em>
          <i style={{ width: `${summary.progress}%` }} />
        </em>
        <span>
          {summary.into}/{summary.cost} XP
        </span>
      </div>
      <div className="side-stats">
        <button
          className={'side-stat is-streak' + (summary.streak.current ? ' lit' : '') + (summary.streak.atRisk ? ' risk' : '')}
          onClick={() => openJourney('overview')}
          title={summary.streak.atRisk ? 'Estude hoje para manter a sequência' : 'Dias seguidos estudando'}
          aria-label={`Sequência de ${summary.streak.current} dias`}
        >
          <Flame size={16} />
          <b><CountUp value={summary.streak.current} /></b>
          <small>dias</small>
        </button>
        <button className="side-stat is-coins" onClick={() => openJourney('shop')} aria-label={`${summary.coins} moedas`}>
          <Coins size={16} />
          <b><CountUp value={summary.coins} /></b>
          <small>moedas</small>
        </button>
        <button className="side-stat is-xp" onClick={() => openJourney('overview')} aria-label={`${summary.todayXP} XP hoje`}>
          <Trophy size={16} />
          <b>+<CountUp value={summary.todayXP} /></b>
          <small>XP hoje</small>
        </button>
      </div>
    </div>
  );
}

export function Sidebar(props: ShellProps) {
  const { page, go, badges, user, dark, onToggleTheme, onLogin } = props;
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  // Measure the active link so a single highlight can glide between items.
  useLayoutEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('.side-link.active');
    setPill(active ? { top: active.offsetTop, height: active.offsetHeight } : null);
  }, [page]);
  return (
    <aside className="side" aria-label="Menu do EduTrack">
      <button className="side-brand" onClick={() => go('Meu dia')} aria-label="EduTrack início">
        <span className="track-mark">
          <i />
          <i />
          <i />
        </span>
        edutrack<span className="brand-period">.</span>
      </button>
      <ProfileCard {...props} />
      <nav ref={navRef} className={'side-nav' + (pill ? ' has-pill' : '')} aria-label="Navegação principal">
        {pill && <span className="side-pill" aria-hidden="true" style={{ transform: `translateY(${pill.top}px)`, height: pill.height }} />}
        {NAV_GROUPS.map(group => (
          <div key={group.title} className="side-group">
            <p>{group.title}</p>
            {group.items.map(item => (
              <NavButton key={item.name} item={item} active={page === item.name} badge={badges[item.name]} onClick={() => go(item.name)} />
            ))}
          </div>
        ))}
      </nav>
      <div className="side-footer">
        <button className={'side-link' + (page === 'Integrações' ? ' active' : '')} aria-label="Integrações" onClick={() => go('Integrações')}>
          <Cloud size={18} />
          <span>Classroom e conexões</span>
        </button>
        <button className={'side-link' + (page === 'Configurações' ? ' active' : '')} aria-label="Configurações" onClick={() => go('Configurações')}>
          <Settings size={18} />
          <span>Configurações</span>
        </button>
        <div className="side-footer-row">
          <button className="side-theme" onClick={onToggleTheme} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Tema claro' : 'Tema escuro'}
          </button>
          {!user && (
            <button className="side-login" onClick={onLogin}>
              <LogIn size={15} /> Entrar
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ page, summary, name, onSearch, onNotifications, hasAlerts, user, onLogin, openJourney, go }: ShellProps) {
  const current = ALL_NAV.find(item => item.name === page)?.label ?? page;
  return (
    <header className="topbar">
      <button className="topbar-brand" onClick={() => go('Meu dia')} aria-label="EduTrack início">
        <span className="track-mark">
          <i />
          <i />
          <i />
        </span>
        edutrack<span className="brand-period">.</span>
      </button>
      <span className="topbar-crumb">{current}</span>
      <button className="topbar-search" onClick={onSearch} aria-label="Pesquisar tarefas e disciplinas">
        <Search size={16} />
        <span>Pesquisar tarefas, disciplinas…</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="topbar-actions">
        <button className={'topbar-chip is-streak' + (summary.streak.current ? ' lit' : '')} onClick={() => openJourney('overview')} aria-label={`Sequência de ${summary.streak.current} dias`}>
          <Flame size={16} />
          {summary.streak.current}
        </button>
        <button className="topbar-chip is-coins" onClick={() => openJourney('shop')} aria-label={`${summary.coins} moedas`}>
          <Coins size={16} />
          {summary.coins}
        </button>
        <button className="topbar-icon" onClick={onNotifications} aria-label="Ver próximos prazos">
          <Bell size={18} />
          {hasAlerts && <i className="notification-dot" />}
        </button>
        {!user && (
          <button className="topbar-login" onClick={onLogin}>
            Entrar
          </button>
        )}
        <button className="topbar-avatar" onClick={() => openJourney('overview')} aria-label="Abrir sua jornada">
          <Avatar name={name} frame={summary.frame} size={32} />
        </button>
      </div>
    </header>
  );
}

const TABS: NavItem[] = [
  { name: 'Meu dia', label: 'Início', icon: Home },
  { name: 'Tarefas', label: 'Tarefas', icon: CheckCheck },
  { name: 'Modo foco', label: 'Foco', icon: Timer },
  { name: 'Arena', label: 'Arena', icon: Gamepad2 },
];

/** Mobile navigation: four main tabs plus a sheet with everything else. */
export function BottomTabs({ page, go, badges }: ShellProps) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [page]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);
  const inTabs = TABS.some(t => t.name === page);
  return (
    <>
      <nav className="bottom-tabs" aria-label="Navegação rápida">
        {TABS.map(tab => (
          <button key={tab.name} className={page === tab.name ? 'active' : ''} aria-label={tab.label} aria-current={page === tab.name ? 'page' : undefined} onClick={() => go(tab.name)}>
            <tab.icon size={21} strokeWidth={page === tab.name ? 2.3 : 1.9} />
            <span>{tab.label}</span>
            {badges[tab.name] && badges[tab.name]!.count > 0 && <i className={'tab-dot ' + badges[tab.name]!.tone} />}
          </button>
        ))}
        <button className={!inTabs || open ? 'active' : ''} aria-label="Mais opções" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {open ? <X size={21} /> : <Menu size={21} />}
          <span>Mais</span>
          {Object.entries(badges).some(([k, b]) => b && b.count > 0 && !TABS.some(t => t.name === k)) && <i className="tab-dot reward" />}
        </button>
      </nav>
      {open && (
        <div className="more-sheet" role="dialog" aria-modal="true" aria-label="Todas as páginas" onClick={() => setOpen(false)}>
          <div className="more-sheet-panel" onClick={e => e.stopPropagation()}>
            <span className="more-grip" />
            {NAV_GROUPS.map(group => (
              <div key={group.title} className="more-group">
                <p>{group.title}</p>
                <div>
                  {group.items.map(item => (
                    <button key={item.name} className={page === item.name ? 'active' : ''} aria-label={item.label} onClick={() => go(item.name)}>
                      <item.icon size={20} />
                      <span>{item.label}</span>
                      {badges[item.name] && badges[item.name]!.count > 0 && <small className={'side-badge ' + badges[item.name]!.tone}>{badges[item.name]!.count}</small>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="more-group">
              <p>Conta</p>
              <div>
                <button aria-label="Integrações" onClick={() => go('Integrações')}>
                  <Cloud size={20} />
                  <span>Classroom</span>
                </button>
                <button aria-label="Configurações" onClick={() => go('Configurações')}>
                  <Settings size={20} />
                  <span>Ajustes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
