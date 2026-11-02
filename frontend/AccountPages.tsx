'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  RefreshCw,
  ExternalLink,
  Download,
  LogIn,
  LogOut,
  Link2,
  Check,
  ShieldCheck,
  Mail,
  ArrowRight,
  UserRound,
  Moon,
  Sun,
  Volume2,
  Users,
  Crown,
  ShoppingBag,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Field, Choice } from './ui';
import { gameOf, day, type Workspace } from './model';
import { supabase } from './repository';
import { config } from './config';
import { exportWeeklyReport } from './report';
import {
  connectGoogle,
  disconnectGoogle,
  syncClassroom,
  warmGoogle,
} from './classroom';
type Props = {
  state: Workspace;
  change: (f: (s: Workspace) => Workspace) => boolean;
  notify: (s: string) => void;
};
export function Integrations({ state, change, notify }: Props) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    void warmGoogle().catch(() => {});
    return () => {
      active.current = false;
    };
  }, []);
  const [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [clientId, setClientId] = useState(
      state.settings.google_client_id || config.googleClientId,
    ),
    [error, setError] = useState('');
  const sync = async () => {
    setBusy(true);
    setError('');
    try {
      if (!connected) {
        await connectGoogle(clientId);
        setConnected(true);
      }
      const result = await syncClassroom(state);
      if (!active.current) return;
      change((s) => ({
        ...s,
        subjects: [
          ...s.subjects,
          ...result.subjects.filter(
            (x) =>
              x.google_id &&
              !s.subjects.some((y) => y.google_id === x.google_id),
          ),
        ],
        tasks: [
          ...s.tasks.map((t) => {
            const imported = result.tasks.find(
              (x) => x.google_id && x.google_id === t.google_id,
            );
            return imported
              ? {
                  ...t,
                  title: imported.title,
                  due_date: imported.due_date,
                  google_url: imported.google_url,
                  google_state: imported.google_state,
                }
              : t;
          }),
          ...result.tasks.filter(
            (x) =>
              x.google_id && !s.tasks.some((y) => y.google_id === x.google_id),
          ),
        ],
        settings: {
          ...s.settings,
          google_client_id: clientId,
          last_sync: new Date().toISOString(),
        },
      }));
      notify(
        `${result.courses} turmas sincronizadas · ${result.imported} novas tarefas.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A conexão falhou.');
      setConnected(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="integrations-layout">
      <article className="card integration-main">
        <div className="integration-logo">
          <GraduationIcon />
        </div>
        <div className="flex-between">
          <h2>Google Classroom</h2>
          <span
            className={'connection-badge ' + (connected ? 'connected' : '')}
          >
            {connected ? 'Autorizado nesta sessão' : 'Não conectado'}
          </span>
        </div>
        <p>
          Suas turmas e atividades, juntas com o seu planejamento. As tarefas
          importadas continuam com um atalho para o Classroom.
        </p>
        <div className="integration-features">
          <span>
            <Check size={17} /> Importação de turmas e atividades
          </span>
          <span>
            <Check size={17} /> Prazos e situação das suas entregas
          </span>
          <span>
            <Check size={17} /> Sincronização sem duplicar tarefas
          </span>
        </div>
        <button className="btn primary" onClick={sync} disabled={busy}>
          <RefreshCw className={busy ? 'spin' : ''} size={17} />
          {busy
            ? 'Conectando e sincronizando…'
            : connected
              ? 'Sincronizar agora'
              : 'Conectar Google Classroom'}
        </button>
        {connected && (
          <button
            className="text-button disconnect"
            onClick={async () => {
              await disconnectGoogle();
              setConnected(false);
              notify(
                'Google desconectado. As tarefas importadas foram preservadas.',
              );
            }}
          >
            Desconectar Google
          </button>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <p className="sync-time">
          {state.settings.last_sync
            ? 'Última sincronização: ' +
              new Date(state.settings.last_sync).toLocaleString('pt-BR')
            : 'Você ainda não sincronizou suas turmas.'}
        </p>
        <div className="privacy-note">
          <ShieldCheck size={19} />
          <p>
            Acesso somente para leitura. Concluir uma tarefa no EduTrack não
            envia nem entrega trabalhos no Classroom. Sincronize novamente para
            buscar atualizações.
          </p>
        </div>
      </article>
      <aside className="card">
        <h2 className="small-heading">Configuração da conexão</h2>
        <p className="form-help">
          A integração precisa de um aplicativo OAuth do seu projeto Google
          Cloud.
        </p>
        <Field label="Google OAuth Client ID">
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="…apps.googleusercontent.com"
          />
        </Field>
        <button
          className="btn secondary"
          onClick={() => {
            change((s) => ({
              ...s,
              settings: { ...s.settings, google_client_id: clientId.trim() },
            }));
            notify('Client ID salvo.');
          }}
        >
          Salvar configuração
        </button>
        <ol className="integration-steps">
          <li>Ative a Google Classroom API.</li>
          <li>Crie uma credencial OAuth para aplicativo Web.</li>
          <li>Cadastre a origem atual nas origens JavaScript autorizadas.</li>
          <li>
            Em modo de teste, adicione sua conta à lista de usuários de teste.
          </li>
        </ol>
        <a
          className="text-button"
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noreferrer"
        >
          Abrir Google Cloud <ExternalLink size={14} />
        </a>
        <p className="form-help">
          Contas institucionais podem precisar da autorização do administrador.
        </p>
      </aside>
    </div>
  );
}
function GraduationIcon() {
  return (
    <svg viewBox="0 0 36 36" width="42" height="42" aria-hidden="true">
      <rect x="3" y="5" width="30" height="26" rx="5" fill="#e8eefc" />
      <path d="M7 12h22M7 24h22" stroke="#4869d5" strokeWidth="2" />
      <circle cx="18" cy="17" r="3" fill="#4869d5" />
      <path d="M12 25a6 6 0 0112 0" fill="#4869d5" />
    </svg>
  );
}
export function AuthForm({
  close,
  notify,
  recovery = false,
  initialMode = 'login',
  onSuccess,
  onModeChange,
  onSignupEmail,
}: {
  close: () => void;
  notify: (s: string) => void;
  recovery?: boolean;
  initialMode?: 'signup' | 'login';
  onSuccess?: (mode: 'signup' | 'login' | 'reset' | 'update') => void;
  onModeChange?: (mode: 'signup' | 'login' | 'reset' | 'update') => void;
  onSignupEmail?: (email: string) => void;
}) {
  const [mode, setMode] = useState<'signup' | 'login' | 'reset' | 'update'>(
      recovery ? 'update' : initialMode,
    ),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmPassword, setConfirmPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setMode(recovery ? 'update' : initialMode);
    setError('');
  }, [initialMode, recovery]);
  const isPasswordMode = mode === 'signup' || mode === 'update';
  const switchMode = (next: 'signup' | 'login' | 'reset') => {
    setMode(next);
    onModeChange?.(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };
  return (
    <form
      className="editor-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (mode === 'signup' && name.trim().length < 2) {
          setError('Informe seu nome para criar a conta.');
          return;
        }
        if (isPasswordMode && password.length < 8) {
          setError('Sua senha precisa ter pelo menos 8 caracteres.');
          return;
        }
        if (isPasswordMode && password !== confirmPassword) {
          setError('As senhas não são iguais.');
          return;
        }
        if (!supabase) {
          setError(
            'O novo projeto Supabase ainda precisa ser criado e conectado. A demonstração já pode ser usada.',
          );
          return;
        }
        setBusy(true);
        setError('');
        try {
          const options = {
            redirectTo: window.location.origin + '/?recovery=1',
          };
          if (mode === 'signup') {
            // Accounts are created already confirmed by the `signup` Edge
            // Function, so nobody waits on the rate-limited confirmation e-mail.
            const created = await supabase.functions.invoke('signup', {
              body: { email, password, full_name: name.trim() },
            });
            if (created.error) {
              const context = (created.error as { context?: unknown }).context;
              const body: { message?: unknown } | null =
                context instanceof Response
                  ? ((await context.clone().json().catch(() => null)) as { message?: unknown } | null)
                  : null;
              throw new Error(
                typeof body?.message === 'string' ? body.message : 'Não foi possível criar a conta agora.',
              );
            }
          }
          const result =
            mode === 'signup'
              ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
              : mode === 'reset'
                ? await supabase.auth.resetPasswordForEmail(email, options)
                : mode === 'update'
                  ? await supabase.auth.updateUser({ password })
                  : await supabase.auth.signInWithPassword({ email, password });
          if (result.error) throw result.error;
          notify(
            mode === 'signup'
              ? 'Conta criada! Bem-vindo ao EduTrack.'
              : mode === 'reset'
                ? 'Se o endereço estiver cadastrado, você receberá um link para redefinir a senha.'
                : mode === 'update'
                  ? 'Senha atualizada.'
                  : 'Você entrou no seu espaço de estudos.',
          );
          if (mode === 'update')
            history.replaceState(null, '', window.location.pathname);
          onSuccess?.(mode);
          close();
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : 'Não foi possível acessar sua conta.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-help">
        {mode === 'signup'
          ? 'Crie um espaço privado para seus estudos.'
          : mode === 'reset'
            ? 'Enviaremos um link para redefinir sua senha.'
            : mode === 'update'
              ? 'Escolha sua nova senha.'
              : 'Entre para sincronizar seus estudos entre dispositivos.'}
      </p>
      {mode === 'signup' && (
        <Field label="Como você quer ser chamado?">
          <div className="input-with-icon">
            <UserRound size={17} aria-hidden="true" />
            <input
              type="text"
              autoComplete="name"
              maxLength={60}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
        </Field>
      )}
      {mode !== 'update' && (
        <Field label="E-mail">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      )}
      {mode !== 'reset' && (
        <Field label="Senha">
          <input
            type="password"
            autoComplete={
              mode === 'signup' ? 'new-password' : 'current-password'
            }
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      )}
      {isPasswordMode && (
        <Field label="Confirmar senha">
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      <button className="btn primary" disabled={busy}>
        {busy
          ? 'Aguarde…'
          : mode === 'signup'
            ? 'Criar conta'
            : mode === 'reset'
              ? 'Enviar link'
              : mode === 'update'
                ? 'Salvar nova senha'
                : 'Entrar'}
        <ArrowRight size={16} />
      </button>
      {!recovery && (
        <div className="auth-links">
          {mode === 'reset' ? (
            <button type="button" onClick={() => switchMode('login')}>
              Voltar para entrar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  switchMode(mode === 'signup' ? 'login' : 'signup');
                }}
              >
                {mode === 'signup' ? 'Já tenho conta' : 'Criar uma conta'}
              </button>
              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('reset')}>
                  Esqueci minha senha
                </button>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}
export function downloadFile(
  name: string,
  content: string,
  type = 'application/json',
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SettingsPage({
  state,
  change,
  notify,
  user,
  login,
  resetDemo,
  signOut,
  saving,
  onSort,
  onJourney,
}: {
  signOut: () => Promise<void>;
  saving: boolean;
  user: { email?: string } | null;
  login: () => void;
  resetDemo: () => void;
  onSort?: () => void;
  onJourney?: (tab: string) => void;
} & Props) {
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem('edutrack.sound') !== 'off';
    } catch {
      return true;
    }
  });
  const game = gameOf(state);
  return (
    <div className="settings-layout">
      <section className="card">
        <h2 className="small-heading">Do seu jeito</h2>
        <Field label="Como podemos chamar você?">
          <input
            maxLength={40}
            value={state.settings.name}
            onChange={(e) =>
              change((s) => ({
                ...s,
                settings: { ...s.settings, name: e.target.value },
              }))
            }
          />
        </Field>
        <div className="form-grid">
          <Field label="Sessão de foco (min)">
            <Choice
              label="Duração do foco"
              value={String(state.settings.focus_minutes)}
              onChange={(v) =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, focus_minutes: Number(v) },
                }))
              }
              items={[15, 25, 30, 45, 50, 60].map((v) => ({
                value: String(v),
                label: v + ' minutos',
              }))}
            />
          </Field>
          <Field label="Pausa (min)">
            <Choice
              label="Duração da pausa"
              value={String(state.settings.break_minutes)}
              onChange={(v) =>
                change((s) => ({
                  ...s,
                  settings: { ...s.settings, break_minutes: Number(v) },
                }))
              }
              items={[5, 10, 15, 20].map((v) => ({
                value: String(v),
                label: v + ' minutos',
              }))}
            />
          </Field>
        </div>
        <p className="form-help">
          Novas durações são aplicadas ao iniciar ou reiniciar uma sessão.
        </p>
        <div className="setting-row">
          <span>
            <Moon size={19} /> Tema escuro
          </span>
          <Switch
            aria-label="Tema escuro"
            checked={state.settings.dark}
            onCheckedChange={(v) =>
              change((s) => ({ ...s, settings: { ...s.settings, dark: v } }))
            }
          />
        </div>
        <div className="setting-row">
          <span>
            <Download size={19} /> Backup dos seus dados
          </span>
          <button
            className="btn secondary"
            onClick={() =>
              downloadFile(
                `edutrack-${day()}.json`,
                JSON.stringify(state, null, 2),
              )
            }
          >
            Exportar JSON
          </button>
        </div>
        <div className="setting-row">
          <span>
            <CalendarIcon /> Tarefas no calendário
          </span>
          <button
            className="btn secondary"
            onClick={() => {
              const esc = (v: string) =>
                v
                  .replaceAll('\\', '\\\\')
                  .replaceAll('\n', '\\n')
                  .replaceAll(',', '\\,')
                  .replaceAll(';', '\\;');
              const text = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//EduTrack//Estudos//PT-BR',
                ...state.tasks
                  .filter((t) => t.due_date && t.status !== 'done')
                  .flatMap((t) => [
                    'BEGIN:VEVENT',
                    `UID:${t.id}@edutrack`,
                    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                    `DTSTART;VALUE=DATE:${t.due_date.replaceAll('-', '')}`,
                    `SUMMARY:${esc(t.title)}`,
                    `DESCRIPTION:${esc(t.description)}`,
                    'END:VEVENT',
                  ]),
                'END:VCALENDAR',
              ].join('\r\n');
              downloadFile('edutrack-agenda.ics', text, 'text/calendar');
            }}
          >
            Exportar agenda
          </button>
        </div>
        <div className="setting-row">
          <span>
            <Download size={19} /> Resumo semanal
          </span>
          <button
            className="btn secondary"
            onClick={() => {
              void exportWeeklyReport(state).catch(() =>
                notify('Não foi possível gerar o relatório. Tente novamente.'),
              );
            }}
          >
            Baixar PDF
          </button>
        </div>
        <p className="form-help">As preferências são salvas automaticamente.</p>
      </section>
      <aside className="card">
        <h2 className="small-heading">Sua conta</h2>
        <p className="form-help">
          {user
            ? user.email
            : 'Modo demonstração. Os exemplos e suas alterações ficam neste navegador.'}
        </p>
        <button
          className="btn primary"
          disabled={saving}
          onClick={async () => {
            if (user) {
              try {
                await signOut();
                notify('Você saiu da conta.');
              } catch (e) {
                notify(
                  e instanceof Error ? e.message : 'Não foi possível sair.',
                );
              }
            } else login();
          }}
        >
          {user ? <LogOut size={17} /> : <LogIn size={17} />}{' '}
          {user ? 'Sair da conta' : 'Entrar ou criar conta'}
        </button>
        {!user && (
          <button className="text-button restore-demo" onClick={resetDemo}>
            Restaurar dados de exemplo
          </button>
        )}
        <p className="form-help">
          Seu espaço real começa vazio e fica separado dos dados da
          demonstração.
        </p>
        <h2 className="small-heading settings-game-heading">Jogo</h2>
        <div className="setting-row">
          <span>
            <Volume2 size={19} /> Efeitos sonoros na Arena
          </span>
          <Switch
            aria-label="Efeitos sonoros na Arena"
            checked={sound}
            onCheckedChange={(v) => {
              setSound(v);
              try {
                localStorage.setItem('edutrack.sound', v ? 'on' : 'off');
              } catch {}
            }}
          />
        </div>
        <div className="setting-row">
          <span>
            <Users size={19} /> Aparecer no ranking
          </span>
          <Switch
            aria-label="Aparecer no ranking"
            disabled={!user}
            checked={!!user && game.public}
            onCheckedChange={(v) => {
              if (change((s) => ({ ...s, game: { ...gameOf(s), public: v } })))
                notify(v ? 'Você agora aparece no ranking.' : 'Você saiu do ranking.');
            }}
          />
        </div>
        <div className="settings-game-actions">
          {onSort && (
            <button className="btn secondary" onClick={onSort}>
              <Crown size={16} /> {game.house ? 'Refazer o Chapéu Seletor' : 'Colocar o Chapéu Seletor'}
            </button>
          )}
          {onJourney && (
            <button className="btn secondary" onClick={() => onJourney('shop')}>
              <ShoppingBag size={16} /> Abrir a loja
            </button>
          )}
        </div>
        {!user && <p className="form-help">O ranking fica disponível quando você entra na sua conta.</p>}
      </aside>
    </div>
  );
}
function CalendarIcon() {
  return <Cloud size={19} />;
}
