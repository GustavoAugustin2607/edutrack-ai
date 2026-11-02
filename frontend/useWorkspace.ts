'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  demoWorkspace,
  emptyWorkspace,
  validateWorkspace,
  type Workspace,
} from './model';
import { clearGoogleToken } from './classroom';
import { supabase, loadCloud, saveCloud } from './repository';
const KEY = 'edutrack.demo.v1';
type Account = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: unknown };
};
export function useWorkspace() {
  const [state, setState] = useState<Workspace>(emptyWorkspace()),
    [ready, setReady] = useState(false),
    [user, setUser] = useState<Account | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const current = useRef(state),
    rev = useRef(0),
    account = useRef<string | null>(null),
    locked = useRef(false),
    chain = useRef(Promise.resolve()),
    pending = useRef(0),
    generation = useRef(0);
  useEffect(() => {
    let alive = true;
    const demo = () => {
      let s;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (validateWorkspace(parsed)) s = parsed;
        }
      } catch {}
      return s ?? demoWorkspace();
    };
    const load = async (u: Account | null) => {
      const g = ++generation.current;
      clearGoogleToken();
      setReady(false);
      locked.current = true;
      await chain.current;
      try {
        const data = u ? await loadCloud(u.id) : { state: demo(), revision: 0 };
        if (!alive || g !== generation.current) return;
        const fullName =
          typeof u?.user_metadata?.full_name === 'string'
            ? u.user_metadata.full_name.trim().slice(0, 40)
            : '';
        if (
          u &&
          data.revision === 0 &&
          data.state.settings.name === 'Estudante' &&
          fullName
        )
          data.state = {
            ...data.state,
            settings: { ...data.state.settings, name: fullName },
          };
        account.current = u?.id ?? null;
        current.current = data.state;
        rev.current = data.revision;
        setState(data.state);
        if (!u) {
          try {
            localStorage.setItem(KEY, JSON.stringify(data.state));
          } catch {}
        }
        setUser(u);
        setError('');
        locked.current = false;
        setReady(true);
      } catch (e) {
        if (!alive || g !== generation.current) return;
        const nextAccount = u?.id ?? null;
        // Never leave another account's study data visible if its cloud load fails.
        if (account.current !== nextAccount) {
          const fallback = nextAccount ? emptyWorkspace() : demo();
          account.current = nextAccount;
          current.current = fallback;
          rev.current = 0;
          setState(fallback);
        }
        setUser(u);
        locked.current = false;
        setError(
          e instanceof Error
            ? e.message
            : 'Não foi possível carregar seus estudos. Recarregue a página para tentar de novo.',
        );
        setReady(true);
      }
    };
    if (supabase) {
      void supabase.auth
        .getSession()
        .then(({ data }) => load(data.session?.user ?? null));
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          if ((session?.user.id ?? null) !== account.current)
            void load(session?.user ?? null);
        }
      });
      return () => {
        alive = false;
        data.subscription.unsubscribe();
      };
    }
    void load(null);
    return () => {
      alive = false;
    };
  }, []);
  const change = useCallback((fn: (s: Workspace) => Workspace) => {
    if (locked.current) return false;
    const next = fn(current.current);
    current.current = next;
    setState(next);
    if (!account.current) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        setError(
          'O navegador não conseguiu salvar. Exporte seus dados antes de sair.',
        );
      }
      return true;
    }
    pending.current++;
    setSaving(true);
    const g = generation.current;
    chain.current = chain.current
      .then(async () => {
        if (locked.current || g !== generation.current) return;
        try {
          rev.current = await saveCloud(next, rev.current);
          setError('');
        } catch (e) {
          locked.current = true;
          setError(
            e instanceof Error
              ? e.message
              : 'Falha ao salvar. Exporte seus dados e recarregue para tentar novamente.',
          );
        }
      })
      .finally(() => {
        pending.current--;
        if (!pending.current) setSaving(false);
      });
    return true;
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.settings.dark);
  }, [state.settings.dark]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current || (locked.current && error)) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [error]);
  const signOut = async () => {
    await chain.current;
    if (error) throw new Error('Exporte os dados pendentes antes de sair.');
    await supabase?.auth.signOut();
  };
  return {
    state,
    ready,
    user,
    saving,
    error,
    change,
    signOut,
    resetDemo: () => change(() => demoWorkspace()),
  };
}
