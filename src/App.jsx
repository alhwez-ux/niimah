import { useCallback, useEffect, useState } from 'react';
import { AppContext } from './context';
import { installStore } from './installStore';
import { loadSession, logout, saveSession, watchAuthUser } from './lib/auth';
import { hydrate } from './lib/repository';
import AdminPanel from './components/AdminPanel';
import LoginScreen from './components/LoginScreen';
import UserApp from './components/UserApp';
import { OfflineBar } from './components/ui';

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [data, setData] = useState({ users: [], requests: [], ads: [] });
  const [warning, setWarning] = useState('');
  const [installEvent, setInstallEvent] = useState(installStore.event);
  const [installed, setInstalled] = useState(installStore.installed);

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
        try {
          const user = await watchAuthUser();
          if (!user?.email?.endsWith('@niimah.app')) stored = null;
        } catch {
          stored = null;
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
    if (result?.data) setData(result.data);
    if (result?.users) setData((current) => ({ ...current, users: result.users }));
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

  if (!ready) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-brand text-white">
        <div className="text-center">
          <img src="/logo.jpg" alt="نعمه" className="mx-auto w-56" />
          <h1 className="text-xl font-bold md:text-2xl">نعمه</h1>
        </div>
      </div>
    );
  }

  const value = {
    data,
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
    </AppContext.Provider>
  );
}
