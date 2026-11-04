import { useCallback, useEffect, useState } from 'react';
import { AppContext } from './context';
import { installStore } from './installStore';
import { loadSession, logout, saveSession, watchAuthUser } from './lib/auth';
import { isStaffPhone, isSuperAdmin } from './lib/access';
import { hydrate } from './lib/repository';
import AdminPanel from './components/AdminPanel';
import LoginScreen from './components/LoginScreen';
import SplashScreen from './components/SplashScreen';
import UserApp from './components/UserApp';
import { OfflineBar } from './components/ui';

const SPLASH_MS = 2000;
const SPLASH_FADE_MS = 500;

export default function App() {
  const [ready, setReady] = useState(false);
  const [splashOn, setSplashOn] = useState(true);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [splashSkip, setSplashSkip] = useState(false);
  const [session, setSession] = useState(null);
  const [data, setData] = useState({ users: [], requests: [], ads: [], threads: [] });
  const [warning, setWarning] = useState('');
  const [installEvent, setInstallEvent] = useState(installStore.event);
  const [installed, setInstalled] = useState(installStore.installed);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashSkip(true), SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !splashSkip || !splashOn) return undefined;
    setSplashLeaving(true);
    const timer = window.setTimeout(() => setSplashOn(false), SPLASH_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [ready, splashSkip, splashOn]);

  useEffect(() => {
    const sync = () => {
      setInstallEvent(installStore.event);
      setInstalled(installStore.installed);
    };
    window.addEventListener('niimah-install', sync);
    sync();
    return () => window.removeEventListener('niimah-install', sync);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await hydrate();
      if (!active) return;
      setData(next);
      let stored = loadSession();
      if (stored?.kind === 'owner') {
        if (stored.phone) {
          if (!(await isStaffPhone(stored.phone))) stored = null;
          else stored = { ...stored, role: isSuperAdmin(stored.phone) ? 'super' : 'supervisor' };
        } else {
          try {
            const user = await watchAuthUser();
            if (!user?.email?.endsWith('@niimah.app')) stored = null;
            else stored = { ...stored, role: 'super' };
          } catch {
            stored = null;
          }
        }
      }
      if (stored?.kind === 'user' && !stored.user?.phone) stored = null;
      saveSession(stored);
      if (!active) return;
      setSession(stored);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const onResult = useCallback((result) => {
    if (result?.data || result?.users || result?.threads) {
      setData((current) => {
        const next = result.data ? { ...current, ...result.data } : { ...current };
        if (result.users) next.users = result.users;
        if (result.threads) next.threads = result.threads;
        if (!Array.isArray(next.threads)) next.threads = [];
        return next;
      });
    }
    if (result && Object.prototype.hasOwnProperty.call(result, 'warning')) {
      setWarning(result.warning || '');
    }
  }, []);

  function signIn(next) {
    setSession(next);
    setWarning('');
  }

  function updateSession(next) {
    saveSession(next);
    setSession(next);
  }

  async function signOut() {
    await logout();
    setSession(null);
    setWarning('');
  }

  function clearInstallEvent() {
    installStore.event = null;
    setInstallEvent(null);
  }

  function markInstalled() {
    installStore.installed = true;
    installStore.event = null;
    setInstalled(true);
    setInstallEvent(null);
  }

  const value = {
    data,
    session,
    warning,
    onResult,
    signIn,
    signOut,
    updateSession,
    installEvent,
    installed,
    clearInstallEvent,
    markInstalled,
  };

  return (
    <AppContext.Provider value={value}>
      {ready ? (
        <div className="min-h-screen w-full bg-brand-deep">
          <div className="mx-auto flex h-dvh min-h-screen w-full max-w-md flex-col overflow-hidden bg-brand pl-safe pr-safe pt-safe shadow-2xl">
            <OfflineBar />
            {session?.kind === 'owner' ? (
              <AdminPanel />
            ) : session?.kind === 'user' ? (
              <UserApp session={session} />
            ) : (
              <LoginScreen />
            )}
          </div>
        </div>
      ) : (
        <div className="h-dvh min-h-screen w-full bg-brand" />
      )}
      {splashOn ? (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-500 ease-out ${
            splashLeaving ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <SplashScreen onContinue={() => setSplashSkip(true)} />
        </div>
      ) : null}
    </AppContext.Provider>
  );
}
