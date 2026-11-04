import { useState } from 'react';
import { useAppState } from '../context';
import { loginOwner, signInRegularUser } from '../lib/auth';
import { isSaudiMobile, normalizeDigits } from '../lib/phone';
import { findUserByPhone, saveItem } from '../lib/repository';
import InstallPrompt from './InstallPrompt';
import { Button, Field, inputClass } from './ui';

export default function LoginScreen() {
  const { onResult, signIn } = useAppState();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('donor');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ownerMode = phone.length === 10 && !isSaudiMobile(phone);

  function onPhoneChange(value) {
    const digits = normalizeDigits(value);
    setPhone(digits);
    if (!(digits.length === 10 && !isSaudiMobile(digits))) setPassword('');
    setError('');
  }

  async function submitPhone(event) {
    event.preventDefault();
    setError('');
    if (ownerMode) {
      if (!password.trim()) {
        setError('أدخل الرقم السري');
        return;
      }
      setBusy(true);
      try {
        signIn(await loginOwner(phone, password));
      } catch (err) {
        setError(err.message || 'تعذر التحقق');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!isSaudiMobile(phone)) {
      setError('أدخل رقم جوال صحيح');
      return;
    }

    setBusy(true);
    try {
      const existing = await findUserByPhone(phone);
      if (existing) {
        signIn(await signInRegularUser(existing));
        return;
      }
      setStep('profile');
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('اكتب الاسم');
      return;
    }
    const user = {
      id: phone,
      name: name.trim(),
      phone,
      role,
      createdAt: Date.now(),
    };
    setBusy(true);
    try {
      onResult(await saveItem('users', user));
      signIn(await signInRegularUser(user));
    } catch (err) {
      setError(err.message || 'تعذر حفظ البيانات');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-6 pb-8 pt-6 text-center text-white">
        <img src="/logo.jpg" alt="نعمه" className="mx-auto w-full max-w-[280px]" />
        <h1 className="mt-2 text-xl font-bold md:text-2xl">نعمه</h1>
        <p className="mt-2 text-base leading-relaxed text-white/90">
          شارك فائض الطعام والملابس والأثاث مع من يحتاجه.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-t-[1.75rem] bg-brand-soft">
        <div className="px-5 pb-6 pt-6">
          <InstallPrompt />
          {step === 'phone' ? (
            <form className="space-y-4" onSubmit={submitPhone}>
              <Field label="رقم الجوال">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={(event) => onPhoneChange(event.target.value)}
                />
              </Field>

              {ownerMode ? (
                <Field label="الرقم السري">
                  <input
                    className={inputClass}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-brand-deep"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
                  </button>
                </Field>
              ) : null}

              {error ? (
                <p className="text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={busy}>
                {busy ? 'جارٍ التحقق' : 'متابعة'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitProfile}>
              <h2 className="text-xl font-bold text-ink md:text-2xl">أكمل بياناتك</h2>
              <p className="text-base leading-relaxed text-ink/70">
                الاسم يظهر للمتبرعين والمحتاجين داخل الطلبات.
              </p>
              <Field label="الاسم">
                <input
                  className={inputClass}
                  maxLength={40}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <RoleButton active={role === 'donor'} onClick={() => setRole('donor')}>
                  أنا متبرع
                </RoleButton>
                <RoleButton active={role === 'beneficiary'} onClick={() => setRole('beneficiary')}>
                  أنا محتاج
                </RoleButton>
              </div>
              {error ? (
                <p className="text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={busy}>
                {busy ? 'جارٍ الحفظ' : 'ابدأ'}
              </Button>
              <Button variant="ghost" onClick={() => setStep('phone')}>
                رجوع
              </Button>
            </form>
          )}
        </div>
        <div className="pb-safe" />
      </div>
    </div>
  );
}

function RoleButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-3 py-3 text-base font-bold ${
        active ? 'bg-brand text-white' : 'bg-white text-brand-deep ring-1 ring-brand/15'
      }`}
    >
      {children}
    </button>
  );
}
