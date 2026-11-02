'use client';

import { useState } from 'react';
import { ArrowRight, BookOpenCheck, Gamepad2, GraduationCap, ShieldCheck, Trophy } from 'lucide-react';
import { AuthForm } from './AccountPages';

type AuthSuccessMode = 'signup' | 'login' | 'reset' | 'update';

type AuthGateProps = {
  /** Entra no espaço local, sem criar ou acessar uma conta. */
  onDemo: () => void;
  /** Chamado depois que o Supabase conclui uma ação de autenticação. */
  onSuccess?: (mode: AuthSuccessMode) => void;
  /** Reaproveita o sistema de avisos do aplicativo, quando disponível. */
  notify?: (message: string) => void;
};

/**
 * Porta de entrada do aplicativo. O cadastro é a ação inicial; entrar e usar
 * a demonstração permanecem alternativas explícitas, sem competir com ele.
 */
export function AuthGate({ onDemo, onSuccess, notify = () => {} }: AuthGateProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  return (
    <main className="auth-gate" aria-labelledby="auth-gate-title">
      <section className="auth-gate-intro">
        <div className="auth-gate-mark" aria-hidden="true">
          <BookOpenCheck size={28} />
        </div>
        <p className="auth-gate-wordmark">EduTrack AI</p>
        <h1 id="auth-gate-title">
          Organize a semana. Estude com intenção.
        </h1>
        <p className="auth-gate-summary">
          Seu plano, revisões e progresso em um espaço que acompanha o seu ritmo.
        </p>
        <ul className="auth-gate-benefits">
          <li>
            <Trophy size={17} aria-hidden="true" /> Chapéu Seletor, casas, missões e conquistas
          </li>
          <li>
            <Gamepad2 size={17} aria-hidden="true" /> Arena de jogos com o conteúdo das suas disciplinas
          </li>
          <li>
            <GraduationCap size={17} aria-hidden="true" /> Tutor IA que pesquisa na web para criar quizzes e explicações
          </li>
          <li>
            <ShieldCheck size={17} aria-hidden="true" /> Dados privados e sincronizados na sua conta
          </li>
        </ul>
      </section>

      <section className="auth-gate-panel" aria-label="Acesso à sua conta">
        <div className="auth-gate-panel-header">
          <p className="auth-gate-step">{mode === 'signup' ? 'Comece por aqui' : 'Que bom ter você de volta'}</p>
          <h2>{mode === 'signup' ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
          <p>
            {mode === 'signup'
              ? 'Leva menos de um minuto e você já entra direto.'
              : 'Continue de onde você parou.'}
          </p>
        </div>

        <AuthForm
          initialMode={mode}
          close={() => {}}
          notify={notify}
          onModeChange={(nextMode) => {
            if (nextMode === 'signup' || nextMode === 'login') setMode(nextMode);
          }}
          onSuccess={(successMode) => {
            onSuccess?.(successMode);
          }}
        />

        <div className="auth-gate-demo">
          <p>Quer conhecer o aplicativo antes?</p>
          <button type="button" className="btn secondary" onClick={onDemo}>
            Explorar demonstração <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </main>
  );
}
