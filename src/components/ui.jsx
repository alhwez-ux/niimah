import { useEffect, useState } from 'react';

export const inputClass =
  'w-full max-w-full rounded-2xl border border-brand/15 bg-white px-4 py-3 text-base text-ink outline-none placeholder:text-ink/40 focus:border-brand focus:ring-2 focus:ring-brand/30';

export function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-brand-deep">{label}</span>
      {children}
    </label>
  );
}

export function Button({
  children,
  variant = 'primary',
  full = true,
  className = '',
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'bg-brand text-white',
    dark: 'bg-brand-deep text-white',
    ghost: 'bg-white text-brand-deep ring-1 ring-brand/15',
    danger: 'bg-red-50 text-red-800',
  };

  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-base font-bold transition active:scale-[0.99] disabled:opacity-60 ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Warning({ text }) {
  if (!text) return null;
  return (
    <p className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950" role="status">
      {text}
    </p>
  );
}

export function OfflineBar() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online) return null;

  return (
    <p className="bg-amber-50 px-4 py-2 text-center text-sm leading-relaxed text-amber-950">
      الاتصال ضعيف أو متوقف. الصفحات الأساسية تعمل من النسخة المحفوظة.
    </p>
  );
}
