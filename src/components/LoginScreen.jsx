import { useState } from 'react';
import { useAppState } from '../context';
import { loginOwner, signInRegularUser, signInStaff } from '../lib/auth';
import { isStaffPhone } from '../lib/access';
import { initialLocation, readLocation } from '../lib/asir';
import { isSaudiMobile, normalizeDigits } from '../lib/phone';
import { findUserByPhone, saveItem } from '../lib/repository';
import InstallPrompt from './InstallPrompt';
import LocationFields from './LocationFields';
import { Button, Field, inputClass } from './ui';

export default function LoginScreen() {
  const { onResult, signIn } = useAppState();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('donor');
  const [location, setLocation] = useState(() => initialLocation({}));
  const [accepted, setAccepted] = useState(false);
  const [staffRole, setStaffRole] = useState(null);
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
    setBusy(true);
    try {
      if (ownerMode) {
        if (!password.trim()) {
          setError('أدخل الرقم السري');
          return;
        }
        signIn(await loginOwner(phone, password));
        return;
      }

      if (!isSaudiMobile(phone)) {
        setError('أدخل رقم جوال صحيح');
        return;
      }

      const access = await isStaffPhone(phone);
      const existing = await findUserByPhone(phone);
      if (access) {
        if (!existing) {
          setStaffRole(access);
          setStep('profile');
          return;
        }
        signIn(await signInStaff(await ensureActive(existing), access));
        return;
      }

      setStaffRole(null);
      if (existing) {
        signIn(await signInRegularUser(await ensureActive(existing)));
        return;
      }
      setStep('profile');
    } catch (err) {
      setError(err.message || 'تعذر الاتصال. أعد المحاولة.');
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
    const place = readLocation(location.city, location.districtChoice, location.customDistrict);
    if (!place) {
      setError('اكتب اسم الحي');
      return;
    }
    if (!accepted) {
      setError('الإقرار بإخلاء المسؤولية شرط أساسي لإكمال التسجيل');
      return;
    }
    const user = {
      id: phone,
      name: name.trim(),
      phone,
      role,
      city: place.city,
      district: place.district,
      active: true,
      disclaimerAcceptedAt: Date.now(),
      createdAt: Date.now(),
    };
    setBusy(true);
    try {
      const result = await saveItem('users', user);
      onResult(result);
      if (staffRole) signIn(await signInStaff(user, staffRole));
      else signIn(await signInRegularUser(user));
    } catch (err) {
      setError(err.message || 'تعذر حفظ البيانات');
    } finally {
      setBusy(false);
    }
  }

  async function ensureActive(user) {
    if (user.active !== false) return user;
    const next = { ...user, active: true };
    const result = await saveItem('users', next);
    onResult(result);
    return next;
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="m-auto flex w-full flex-col items-center gap-6">
        <img
          src="/logo.png"
          alt="نعمه"
          className="h-36 w-36 object-contain"
        />

        <div className="w-full rounded-2xl bg-white p-6 shadow-lg">
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
              <Button type="submit" busy={busy}>
                {busy ? 'جارٍ التحقق' : 'متابعة'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" noValidate onSubmit={submitProfile}>
              <h2 className="text-center text-xl font-bold text-ink md:text-2xl">أكمل بياناتك</h2>
              <p className="text-center text-base leading-relaxed text-ink/70">
                الاسم يظهر للمتبرعين والمحتاجين داخل الطلبات.
              </p>
              <Field label="الاسم (يمكنك اختيار اسم مستعار أو كنيه)">
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
              <LocationFields
                city={location.city}
                districtChoice={location.districtChoice}
                customDistrict={location.customDistrict}
                onChange={setLocation}
              />
              <DisclaimerAck checked={accepted} onChange={setAccepted} />
              {error ? (
                <p className="text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" busy={busy}>
                {busy ? 'جارٍ الحفظ' : 'ابدأ'}
              </Button>
              <Button variant="ghost" onClick={() => setStep('phone')} disabled={busy}>
                رجوع
              </Button>
            </form>
          )}
        </div>

        <p className="w-full px-2 text-center font-tajawal text-base font-medium leading-relaxed text-white">
          نعمه تطبيق إلكتروني يمكنك من مشاركة فائض الطعام والملابس والأثاث مع من يحتاج إليه.
        </p>
      </div>
    </div>
  );
}

function DisclaimerAck({ checked, onChange }) {
  return (
    <section className="rounded-2xl bg-brand-soft p-3 ring-1 ring-brand/15">
      <h3 className="text-base font-bold text-brand-deep">إخلاء مسؤولية</h3>
      <div className="mt-2 space-y-2 text-sm font-semibold leading-relaxed text-ink">
        <p>تطبيق نعمه هو منصة وسيطة لحفظ النعمه، ولا يتبع لأي جهة أو جمعية خيرية.</p>
        <p>
          التطبيق غير ربحي ويقتصر على عرض فائض الطعام أو الملابس أو الأجهزة المستعملة ليستفيد منها من يحتاج إليها ولا يتحمل أي مسؤولية قانونية أو التزام تجاه المتبرع أو المحتاج أو المتبرع به، مع التأكيد على عدم طلب أي تبرع نقدي ويتم طلب ذلك عن طريق الجمعيات الخيرية المعتمدة في المملكة العربية السعودية.
        </p>
      </div>
      <label className="mt-3 flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-brand/10">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[#3B986C]"
          checked={checked}
          required
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="text-sm font-bold leading-relaxed text-ink">
          أقر بأنني قرأت إخلاء المسؤولية وأوافق عليه، وهذا الإقرار شرط أساسي للتسجيل.
        </span>
      </label>
    </section>
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
