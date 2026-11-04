import { useEffect, useState } from 'react';
import { useAppState } from '../context';
import { grantSupervisor, isSuperAdmin, loadSupervisors, revokeSupervisor, SUPER_ADMIN_PHONE } from '../lib/access';
import { changeOwnerPassword } from '../lib/auth';
import { initialLocation, readLocation } from '../lib/asir';
import { isSaudiMobile, normalizeDigits } from '../lib/phone';
import {
  CATEGORIES,
  KIND_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  listOwnerCollection,
  newId,
  removeItem,
  saveItem,
} from '../lib/repository';
import LocationFields from './LocationFields';
import { Button, Field, Warning, inputClass } from './ui';

const TABS = [
  ['users', 'المستخدمون'],
  ['requests', 'الطلبات'],
  ['ads', 'الإعلانات'],
  ['security', 'الرقم السري'],
];

const blankUser = { id: '', name: '', phone: '', role: 'donor', createdAt: 0 };
const blankRequest = {
  id: '',
  title: '',
  description: '',
  category: 'طعام',
  kind: 'donate',
  status: 'open',
  contact: '',
  userId: '',
  createdAt: 0,
  ...initialLocation({}),
};

function requestForm(item) {
  return { ...item, ...initialLocation(item) };
}
const blankAd = { id: '', title: '', body: '', active: true, createdAt: 0 };

function finishWrite(result, onResult) {
  onResult(result);
  return result.warning || '';
}

export default function AdminPanel() {
  const { data, session, warning, onResult, signOut } = useAppState();
  const [tab, setTab] = useState('requests');
  const isSuper = session?.role === 'super' || isSuperAdmin(session?.phone);
  const tabs = isSuper ? [...TABS.slice(0, 3), ['staff', 'المشرفون'], TABS[3]] : TABS;

  useEffect(() => {
    let active = true;
    listOwnerCollection('users')
      .then((users) => {
        if (active) onResult({ users, warning: '' });
      })
      .catch(() => {
        if (active) onResult({ warning: 'تعذر تحميل قائمة المستخدمين من قاعدة البيانات.' });
      });
    return () => {
      active = false;
    };
  }, [onResult]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pb-4 pt-3 text-white">
        <div className="min-w-0">
          <p className="text-sm text-white/80">نعمه</p>
          <h1 className="text-xl font-bold md:text-2xl">لوحة التحكم</h1>
          <p className="text-sm text-white/80">{isSuper ? 'المالك' : 'مشرف'}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold"
        >
          خروج
        </button>
      </header>

      <div className="flex gap-1 overflow-x-auto bg-brand px-3 pb-4">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-12 shrink-0 rounded-2xl px-3 py-2 text-sm font-bold leading-tight ${
              tab === id ? 'bg-white text-brand-deep' : 'bg-white/15 text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-t-[1.75rem] bg-brand-soft px-4 pt-4">
        <Warning text={warning} />
        {tab === 'users' ? <UsersTab data={data} onResult={onResult} /> : null}
        {tab === 'requests' ? <RequestsTab data={data} onResult={onResult} /> : null}
        {tab === 'ads' ? <AdsTab data={data} onResult={onResult} /> : null}
        {tab === 'staff' && isSuper ? <StaffTab /> : null}
        {tab === 'security' ? <SecurityTab /> : null}
        <div className="h-4" />
        <div className="pb-safe" />
      </main>
    </div>
  );
}

function UsersTab({ data, onResult }) {
  const [form, setForm] = useState(blankUser);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const users = [...data.users].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  function edit(user) {
    setForm(user);
    setOpen(true);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const phone = normalizeDigits(form.phone);
    if (!form.name.trim()) {
      setError('اكتب الاسم');
      return;
    }
    if (!isSaudiMobile(phone)) {
      setError('أدخل رقم جوال صحيح');
      return;
    }
    if (data.users.some((user) => user.phone === phone && user.id !== form.id)) {
      setError('رقم الجوال مستخدم من قبل');
      return;
    }
    const item = {
      id: form.id || newId(),
      name: form.name.trim(),
      phone,
      role: form.role,
      active: true,
      createdAt: form.createdAt || Date.now(),
    };
    setBusy(true);
    try {
      const problem = finishWrite(await saveItem('users', item), onResult);
      if (problem) {
        setError(problem);
        return;
      }
      setForm(blankUser);
      setOpen(false);
    } catch (err) {
      setError(err.message || 'تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('حذف المستخدم؟')) return;
    setBusy(true);
    try {
      const problem = finishWrite(await removeItem('users', id), onResult);
      if (problem) {
        setError(problem);
        return;
      }
    } finally {
      setBusy(false);
    }
    if (form.id === id) {
      setForm(blankUser);
      setOpen(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold md:text-2xl">المستخدمون</h2>
        <button type="button" className="text-sm font-bold text-brand-deep" onClick={() => { setForm(blankUser); setOpen(true); setError(''); }}>
          إضافة
        </button>
      </div>
      <p className="text-sm text-ink/70">{users.length} حساب من المتبرعين والمحتاجين</p>
      {open ? (
        <form className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-brand/10" onSubmit={submit}>
          <Field label="الاسم (يمكنك اختيار اسم مستعار أو كنيه)">
            <input className={inputClass} maxLength={40} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="رقم الجوال">
            <input
              className={inputClass}
              dir="ltr"
              inputMode="numeric"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: normalizeDigits(event.target.value) })}
            />
          </Field>
          <Field label="الدور">
            <select className={inputClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="donor">متبرع</option>
              <option value="beneficiary">محتاج</option>
            </select>
          </Field>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <Button type="submit" busy={busy}>{busy ? 'جارٍ الحفظ' : form.id ? 'حفظ التعديل' : 'إضافة المستخدم'}</Button>
          <Button variant="ghost" onClick={() => { setOpen(false); setForm(blankUser); }}>إلغاء</Button>
        </form>
      ) : null}
      {users.length === 0 ? <p className="rounded-3xl bg-white px-4 py-6 text-center text-base text-ink/70">لا يوجد مستخدمون بعد.</p> : null}
      {users.map((user) => (
        <article key={user.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/5">
          <h3 className="text-base font-bold">{user.name}</h3>
          <p className="mt-1 text-sm text-ink/70">
            {ROLE_LABEL[user.role]} · <span dir="ltr">{user.phone}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => edit(user)}>تعديل</Button>
            <Button variant="danger" onClick={() => remove(user.id)}>حذف</Button>
          </div>
        </article>
      ))}
    </section>
  );
}

function RequestsTab({ data, onResult }) {
  const [form, setForm] = useState(blankRequest);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requests = [...data.requests].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('اكتب عنوان الطلب');
      return;
    }
    const contact = form.contact ? normalizeDigits(form.contact) : '';
    if (contact && !isSaudiMobile(contact)) {
      setError('أدخل رقم تواصل صحيح أو اتركه فارغًا');
      return;
    }
    const place = readLocation(form.city, form.districtChoice, form.customDistrict);
    if (!place) {
      setError('اكتب اسم الحي');
      return;
    }
    const { districtChoice, customDistrict, ...rest } = form;
    const item = {
      ...rest,
      id: form.id || newId(),
      title: form.title.trim(),
      description: form.description.trim(),
      contact,
      city: place.city,
      district: place.district,
      createdAt: form.createdAt || Date.now(),
    };
    setBusy(true);
    try {
      const problem = finishWrite(await saveItem('requests', item), onResult);
      if (problem) {
        setError(problem);
        return;
      }
      setForm(blankRequest);
      setOpen(false);
    } catch (err) {
      setError(err.message || 'تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('حذف الطلب؟')) return;
    setBusy(true);
    try {
      const problem = finishWrite(await removeItem('requests', id), onResult);
      if (problem) {
        setError(problem);
        return;
      }
      if (form.id === id) {
        setForm(blankRequest);
        setOpen(false);
      }
    } catch (err) {
      setError(err.message || 'تعذر الحذف');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold md:text-2xl">الطلبات</h2>
        <button type="button" className="text-sm font-bold text-brand-deep" onClick={() => { setForm(blankRequest); setOpen(true); setError(''); }}>
          إضافة
        </button>
      </div>
      {open ? (
        <form className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-brand/10" onSubmit={submit}>
          <Field label="العنوان">
            <input className={inputClass} maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="الوصف">
            <textarea className={`${inputClass} min-h-24 resize-none`} maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="التصنيف">
            <select className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <LocationFields
            city={form.city}
            districtChoice={form.districtChoice}
            customDistrict={form.customDistrict}
            onChange={(location) => setForm({ ...form, ...location })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="النوع">
              <select className={inputClass} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
                <option value="donate">تبرع</option>
                <option value="need">احتياج</option>
              </select>
            </Field>
            <Field label="الحالة">
              <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="open">مفتوح</option>
                <option value="done">مكتمل</option>
              </select>
            </Field>
          </div>
          <Field label="رقم التواصل">
            <input className={inputClass} dir="ltr" inputMode="numeric" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
          </Field>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <Button type="submit" busy={busy}>{busy ? 'جارٍ الحفظ' : form.id ? 'حفظ التعديل' : 'إضافة الطلب'}</Button>
          <Button variant="ghost" onClick={() => { setOpen(false); setForm(blankRequest); }}>إلغاء</Button>
        </form>
      ) : null}
      {requests.map((item) => (
        <article key={item.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-deep">{KIND_LABEL[item.kind]} · {STATUS_LABEL[item.status]}</p>
          <h3 className="mt-1 text-base font-bold">{item.title}</h3>
          {item.city || item.district ? (
            <p className="mt-1 text-sm font-semibold text-brand-deep">{[item.city, item.district].filter(Boolean).join(' · ')}</p>
          ) : null}
          <p className="mt-1 text-base leading-relaxed text-ink/80">{item.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => { setForm(requestForm(item)); setOpen(true); setError(''); }}>تعديل</Button>
            <Button variant="danger" onClick={() => remove(item.id)}>حذف</Button>
          </div>
        </article>
      ))}
    </section>
  );
}

function AdsTab({ data, onResult }) {
  const [form, setForm] = useState(blankAd);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ads = [...data.ads].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('اكتب عنوان الإعلان');
      return;
    }
    const item = {
      id: form.id || newId(),
      title: form.title.trim(),
      body: form.body.trim(),
      active: Boolean(form.active),
      createdAt: form.createdAt || Date.now(),
    };
    setBusy(true);
    try {
      const problem = finishWrite(await saveItem('ads', item), onResult);
      if (problem) {
        setError(problem);
        return;
      }
      setForm(blankAd);
      setOpen(false);
    } catch (err) {
      setError(err.message || 'تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('حذف الإعلان؟')) return;
    setBusy(true);
    try {
      const problem = finishWrite(await removeItem('ads', id), onResult);
      if (problem) {
        setError(problem);
        return;
      }
      if (form.id === id) {
        setForm(blankAd);
        setOpen(false);
      }
    } catch (err) {
      setError(err.message || 'تعذر الحذف');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold md:text-2xl">الإعلانات</h2>
        <button type="button" className="text-sm font-bold text-brand-deep" onClick={() => { setForm(blankAd); setOpen(true); setError(''); }}>
          إضافة
        </button>
      </div>
      {open ? (
        <form className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-brand/10" onSubmit={submit}>
          <Field label="العنوان">
            <input className={inputClass} maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="النص">
            <textarea className={`${inputClass} min-h-24 resize-none`} maxLength={500} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-base">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            ظاهر للمستخدمين
          </label>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <Button type="submit" busy={busy}>{busy ? 'جارٍ الحفظ' : form.id ? 'حفظ التعديل' : 'إضافة الإعلان'}</Button>
          <Button variant="ghost" onClick={() => { setOpen(false); setForm(blankAd); }}>إلغاء</Button>
        </form>
      ) : null}
      {ads.map((ad) => (
        <article key={ad.id} className="rounded-3xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-deep">{ad.active ? 'ظاهر' : 'مخفي'}</p>
          <h3 className="mt-1 text-base font-bold">{ad.title}</h3>
          <p className="mt-1 text-base leading-relaxed text-ink/80">{ad.body}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => { setForm(ad); setOpen(true); }}>تعديل</Button>
            <Button variant="danger" onClick={() => remove(ad.id)}>حذف</Button>
          </div>
        </article>
      ))}
    </section>
  );
}

function StaffTab() {
  const [phones, setPhones] = useState([]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadSupervisors().then((list) => {
      if (active) setPhones(list);
    });
    return () => {
      active = false;
    };
  }, []);

  async function add(event) {
    event.preventDefault();
    setError('');
    const next = normalizeDigits(phone);
    if (next === SUPER_ADMIN_PHONE) {
      setError('هذا الرقم هو المالك الرئيسي');
      return;
    }
    if (!isSaudiMobile(next)) {
      setError('أدخل رقم جوال صحيح');
      return;
    }
    setBusy(true);
    try {
      const result = await grantSupervisor(next);
      setPhones(result.phones);
      if (result.warning) {
        setError(result.warning);
        return;
      }
      setPhone('');
    } catch (err) {
      setError(err.message || 'تعذر تعيين المشرف');
    } finally {
      setBusy(false);
    }
  }

  async function remove(target) {
    if (!window.confirm('إزالة صلاحية المشرف؟')) return;
    setError('');
    setBusy(true);
    try {
      const result = await revokeSupervisor(target);
      setPhones(result.phones);
      if (result.warning) setError(result.warning);
    } catch (err) {
      setError(err.message || 'تعذر إزالة المشرف');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold md:text-2xl">تعيين مشرفين</h2>
      <p className="text-base leading-relaxed text-ink/70">
        أدخل رقم جوال المشرف. يستطيع بعدها فتح لوحة التحكم، دون تعيين مشرفين جدد.
      </p>
      <form className="space-y-3 rounded-3xl bg-white p-4 shadow-sm" onSubmit={add}>
        <Field label="رقم الجوال">
          <input
            className={inputClass}
            inputMode="numeric"
            dir="ltr"
            maxLength={10}
            placeholder="05xxxxxxxx"
            value={phone}
            onChange={(event) => setPhone(normalizeDigits(event.target.value))}
          />
        </Field>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" busy={busy}>
          {busy ? 'جارٍ الحفظ' : 'تعيين مشرف'}
        </Button>
      </form>
      {phones.length === 0 ? (
        <p className="rounded-3xl bg-white p-4 text-base text-ink/60">لا يوجد مشرفون بعد.</p>
      ) : (
        phones.map((item) => (
          <article key={item} className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-base font-bold" dir="ltr">
              {item}
            </p>
            <button type="button" className="text-sm font-bold text-red-700" onClick={() => remove(item)} disabled={busy}>
              إزالة
            </button>
          </article>
        ))
      )}
    </section>
  );
}

function SecurityTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setOk('');
    if (next !== confirm) {
      setError('تأكيد الرقم السري غير مطابق');
      return;
    }
    setBusy(true);
    try {
      await changeOwnerPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setOk('تم تحديث الرقم السري');
    } catch (err) {
      setError(err.message || 'تعذر تحديث الرقم السري');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <h2 className="text-xl font-bold md:text-2xl">تحديث الرقم السري</h2>
      <p className="text-base leading-relaxed text-ink/70">
        بعد الحفظ يُحدَّث الرقم في حساب الدخول، ويُسجَّل وقت التحديث في قاعدة البيانات.
      </p>
      <Field label="الرقم السري الحالي">
        <input className={inputClass} type="password" dir="ltr" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
      </Field>
      <Field label="الرقم السري الجديد">
        <input className={inputClass} type="password" dir="ltr" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
      </Field>
      <Field label="تأكيد الرقم السري">
        <input className={inputClass} type="password" dir="ltr" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      </Field>
      {error ? <p className="text-sm text-red-800" role="alert">{error}</p> : null}
      {ok ? <p className="text-sm font-semibold text-brand-deep" role="status">{ok}</p> : null}
      <Button type="submit" busy={busy}>{busy ? 'جارٍ الحفظ' : 'تحديث الرقم السري'}</Button>
    </form>
  );
}
