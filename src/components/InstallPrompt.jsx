import { useState } from 'react';
import { useAppState } from '../context';

function isIos() {
  const ua = window.navigator.userAgent || '';
  const classic = /iPad|iPhone|iPod/.test(ua);
  const ipadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return classic || ipadOs;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export default function InstallPrompt() {
  const { installEvent, installed, clearInstallEvent, markInstalled } = useAppState();
  const [error, setError] = useState('');
  const ios = isIos();
  const hidden = installed || isStandalone();

  if (hidden || (!installEvent && !ios)) return null;

  async function install() {
    if (!installEvent) return;
    setError('');
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice?.outcome === 'accepted') markInstalled();
    } catch {
      setError('تعذر إظهار نافذة التثبيت. أعد المحاولة من قائمة المتصفح.');
    } finally {
      clearInstallEvent();
    }
  }

  return (
    <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand/10">
      {installEvent ? (
        <button
          type="button"
          onClick={install}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-base font-bold text-white"
        >
          تثبيت التطبيق على جهازك
        </button>
      ) : null}

      {ios && !installEvent ? (
        <p className="text-sm leading-relaxed text-brand-deep" role="note">
          مشاركة &gt; إضافة إلى الشاشة الرئيسية
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
