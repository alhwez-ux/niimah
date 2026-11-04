import { useState } from 'react';
import { useAppState } from '../context';
import { saveSession } from '../lib/auth';
import { initialLocation, readLocation } from '../lib/asir';
import { threadsFor } from '../lib/messages';
import {
  CATEGORIES,
  KIND_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  newId,
  saveItem,
} from '../lib/repository';
import InstallPrompt from './InstallPrompt';
import LocationFields from './LocationFields';
import MessageDesk from './Messages';
import { Button, Field, Warning, inputClass } from './ui';

function newest(list) {
  return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function formatWhen(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short' }).format(value);
  } catch {
    return '';
  }
}

export default function UserApp({ session }) {
  const { data, warning, onResult, signOut, updateSession } = useAppState();
  const user = data.users.find((item) => item.id === session.user.id) || session.user;
  const [tab, setTab] = useState('home');
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState('donate');
  const [chatRequestId, setChatRequestId] = useState(null);

  function start(nextKind) {
    setKind(nextKind);
    setShowForm(true);
    setTab('requests');
  }

  const chatRequest = data.requests.find((item) => item.id === chatRequestId) || null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="px-5 pb-6 pt-3 text-white">
        <img src="/logo.png" alt="نعمه" className="mx-auto h-16 w-auto object-contain" />
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-white/80">أهلًا بك</p>
            <h1 className="truncate text-xl font-bold md:text-2xl">{user.name}</h1>
          </div>
          <p className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {ROLE_LABEL[user.role] || 'مستخدم'}
          </p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-t-[1.75rem] bg-brand-soft px-4 pt-4">
        <InstallPrompt />
        <Warning text={warning} />
        {tab === 'home' ? <Home data={data} user={user} onStart={start} onMessage={setChatRequestId} /> : null}
        {tab === 'requests' ? (
          <Requests
            user={user}
            data={data}
            showForm={showForm}
            setShowForm={setShowForm}
            kind={kind}
            setKind={setKind}
            onResult={onResult}
            onMessage={setChatRequestId}
          />
        ) : null}
        {tab === 'ads' ? <Ads data={data} /> : null}
        {tab === 'profile' ? (
          <Profile user={user} onResult={onResult} updateSession={updateSession} onLogout={signOut} />
        ) : null}
        <div className="h-6" />
      </main>
      {chatRequest ? (
        <MessageDesk
          request={chatRequest}
          user={user}
          threads={data.threads || []}
          onClose={() => setChatRequestId(null)}
          onResult={onResult}
        />
      ) : null}

      <nav className="border-t border-black/5 bg-white pb-safe" aria-label="التنقل">
        <div className="grid grid-cols-4">
          <NavButton id="home" label="الرئيسية" active={tab === 'home'} onClick={setTab} icon="home" />
          <NavButton id="requests" label="الطلبات" active={tab === 'requests'} onClick={setTab} icon="box" />
          <NavButton id="ads" label="الإعلانات" active={tab === 'ads'} onClick={setTab} icon="ads" />
          <NavButton id="profile" label="حسابي" active={tab === 'profile'} onClick={setTab} icon="user" />
        </div>
      </nav>
    </div>
  );
}

function Home({ data, user, onStart, onMessage }) {
  const ads = newest(data.ads.filter((ad) => ad.active !== false)).slice(0, 2);
  const requests = newest(data.requests.filter((item) => item.status !== 'done')).slice(0, 3);

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-xl font-bold text-ink md:text-2xl">ماذا تريد أن تفعل؟</h2>
        <p className="mt-1 text-base leading-relaxed text-ink/70">
          انشر ما زاد عن حاجتك، أو اطلب ما ينقصك.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onStart('donate')}
            className="min-h-14 rounded-3xl bg-brand px-3 py-4 text-base font-bold text-white"
          >
            انشر فائضًا
          </button>
          <button
            type="button"
            onClick={() => onStart('need')}
            className="min-h-14 rounded-3xl bg-white px-3 py-4 text-base font-bold text-brand-deep ring-1 ring-brand/15"
          >
            اطلب مساعدة
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink md:text-2xl">الإعلانات</h2>
        {ads.length === 0 ? <Empty text="لا توجد إعلانات ظاهرة الآن." /> : ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink md:text-2xl">أحدث الطلبات</h2>
        {requests.length === 0 ? (
          <Empty text="لم يُنشر شيء هنا بعد." />
        ) : (
          requests.map((item) => (
            <RequestCard key={item.id} item={item} user={user} threads={data.threads} onMessage={onMessage} />
          ))
        )}
      </section>
    </div>
  );
}

function Requests({ user, data, showForm, setShowForm, kind, setKind, onResult, onMessage }) {
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState(() => initialLocation(user));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const items = newest(data.requests).filter((item) => {
    if (filter === 'donate') return item.kind === 'donate';
    if (filter === 'need') return item.kind === 'need';
    return true;
  });

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('اكتب عنوان الطلب');
      return;
    }
    const place = readLocation(location.city, location.districtChoice, location.customDistrict);
    if (!place) {
      setError('اكتب اسم الحي');
      return;
    }
    setBusy(true);
    try {
      const result = await saveItem('requests', {
        id: newId(),
        title: title.trim(),
        description: description.trim(),
        category,
        kind,
        status: 'open',
        city: place.city,
        district: place.district,
        authorName: user.name,
        userId: user.id,
        createdAt: Date.now(),
      });
      onResult(result);
      if (result.warning) {
        setError(result.warning);
        return;
      }
      setTitle('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'تعذر الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function markDone(item) {
    try {
      const result = await saveItem('requests', { ...item, status: 'done' });
      onResult(result);
    } catch (err) {
      onResult({ warning: err.message || 'تعذر الحفظ. أعد المحاولة.' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ink md:text-2xl">الطلبات</h2>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="shrink-0 rounded-2xl bg-brand px-3 py-2 text-sm font-bold text-white"
        >
          {showForm ? 'إغلاق' : 'إضافة'}
        </button>
      </div>

      {showForm ? (
        <form className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand/10" onSubmit={submit}>
          <Field label="العنوان">
            <input className={inputClass} maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="الوصف">
            <textarea
              className={`${inputClass} min-h-24 resize-none`}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label="التصنيف">
            <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <TypeButton active={kind === 'donate'} onClick={() => setKind('donate')}>
              تبرع
            </TypeButton>
            <TypeButton active={kind === 'need'} onClick={() => setKind('need')}>
              احتياج
            </TypeButton>
          </div>
          <LocationFields
            city={location.city}
            districtChoice={location.districtChoice}
            customDistrict={location.customDistrict}
            onChange={setLocation}
          />
          <p className="text-sm leading-relaxed text-ink/70">
            التواصل بعد النشر يتم عبر زر المراسلة، من دون إظهار رقم الجوال.
          </p>
          {error ? (
            <p className="text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" busy={busy}>
            {busy ? 'جارٍ الحفظ' : 'نشر'}
          </Button>
        </form>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ['all', 'الكل'],
          ['donate', 'تبرعات'],
          ['need', 'احتياجات'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              filter === id ? 'bg-brand text-white' : 'bg-white text-brand-deep ring-1 ring-brand/15'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? <Empty text="لا توجد طلبات ضمن هذا التصنيف." /> : null}
      {items.map((item) => (
        <RequestCard
          key={item.id}
          item={item}
          user={user}
          threads={data.threads}
          onMessage={onMessage}
          action={
            item.userId === user.id && item.status !== 'done' ? (
              <button type="button" className="text-sm font-bold text-brand-deep" onClick={() => markDone(item)}>
                تم التسليم
              </button>
            ) : null
          }
        />
      ))}
    </div>
  );
}

function Ads({ data }) {
  const ads = newest(data.ads.filter((ad) => ad.active !== false));
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-ink md:text-2xl">الإعلانات</h2>
      <p className="text-base leading-relaxed text-ink/70">تنبيهات وتعليمات ظاهرة لكل المستخدمين.</p>
      {ads.length === 0 ? <Empty text="لا توجد إعلانات ظاهرة الآن." /> : ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
    </div>
  );
}

function Profile({ user, onResult, updateSession, onLogout }) {
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(user.role || 'donor');
  const [location, setLocation] = useState(() => initialLocation(user));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save(event) {
    event.preventDefault();
    if (!name.trim()) return;
    const place = readLocation(location.city, location.districtChoice, location.customDistrict);
    if (!place) {
      setMessage('اكتب اسم الحي');
      return;
    }
    const next = { ...user, name: name.trim(), role, city: place.city, district: place.district };
    setBusy(true);
    try {
      const result = await saveItem('users', next);
      onResult(result);
      if (result.warning) {
        setMessage(result.warning);
        return;
      }
      const session = {
        kind: 'user',
        user: {
          id: next.id,
          name: next.name,
          phone: next.phone,
          role: next.role,
          city: next.city,
          district: next.district,
        },
      };
      saveSession(session);
      updateSession(session);
      setMessage('تم حفظ بياناتك');
    } catch (err) {
      setMessage(err.message || 'تعذر الحفظ. أعد المحاولة.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={save}>
      <h2 className="text-xl font-bold text-ink md:text-2xl">حسابي</h2>
      <p className="text-base text-ink/70" dir="ltr">
        {user.phone}
      </p>
      <Field label="الاسم (يمكنك اختيار اسم مستعار أو كنيه)">
        <input className={inputClass} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <TypeButton active={role === 'donor'} onClick={() => setRole('donor')}>
          متبرع
        </TypeButton>
        <TypeButton active={role === 'beneficiary'} onClick={() => setRole('beneficiary')}>
          محتاج
        </TypeButton>
      </div>
      <LocationFields
        city={location.city}
        districtChoice={location.districtChoice}
        customDistrict={location.customDistrict}
        onChange={setLocation}
      />
      {message ? <p className="text-sm font-semibold text-brand-deep">{message}</p> : null}
      <Button type="submit" busy={busy}>
        {busy ? 'جارٍ الحفظ' : 'حفظ'}
      </Button>
      <Button variant="ghost" onClick={onLogout}>
        تسجيل الخروج
      </Button>
    </form>
  );
}

function RequestCard({ item, action, user, threads, onMessage }) {
  const mine = user && item.userId === user.id;
  const count = mine ? threadsFor(threads, item.id).length : 0;
  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-deep">{KIND_LABEL[item.kind] || 'طلب'}</span>
        <span className="text-sm text-ink/60">{item.category}</span>
      </div>
      <h3 className="mt-2 text-base font-bold text-ink">{item.title}</h3>
      {item.city || item.district ? (
        <p className="mt-1 text-sm font-semibold text-brand-deep">
          {[item.city, item.district].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <p className="mt-1 text-base leading-relaxed text-ink/80">{item.description}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-ink/60">
          {STATUS_LABEL[item.status] || 'مفتوح'}
          {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ''}
        </span>
        <span className="flex items-center gap-3">
          {action}
          {onMessage && item.userId ? (
            <button
              type="button"
              className="rounded-2xl bg-brand px-3 py-2 text-sm font-bold text-white"
              onClick={() => onMessage(item.id)}
            >
              {mine ? `الرسائل${count ? ` (${count})` : ''}` : 'مراسلة'}
            </button>
          ) : null}
        </span>
      </div>
    </article>
  );
}

function AdCard({ ad }) {
  return (
    <article className="rounded-3xl bg-brand-mist p-4 ring-1 ring-brand/10">
      <h3 className="text-base font-bold text-brand-deep">{ad.title}</h3>
      <p className="mt-1 text-base leading-relaxed text-ink/80">{ad.body}</p>
    </article>
  );
}

function Empty({ text }) {
  return <p className="rounded-3xl bg-white px-4 py-6 text-center text-base text-ink/70">{text}</p>;
}

function TypeButton({ active, children, onClick }) {
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

function NavButton({ id, label, active, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm font-semibold ${
        active ? 'text-brand-deep' : 'text-ink/45'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <NavIcon name={icon} />
      {label}
    </button>
  );
}

function NavIcon({ name }) {
  const common = { viewBox: '0 0 24 24', className: 'h-6 w-6', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'box') {
    return (
      <svg {...common}>
        <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Z" strokeLinejoin="round" />
        <path d="M12 12.2 20 8.7M12 12.2V20M12 12.2 4 8.7" />
      </svg>
    );
  }
  if (name === 'ads') {
    return (
      <svg {...common}>
        <path d="M5 10v4h3l5 3V7L8 10H5Z" strokeLinejoin="round" />
        <path d="M16 9.5a3 3 0 0 1 0 5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.2c1.4-2.6 3.6-3.7 6.5-3.7s5.1 1.1 6.5 3.7" strokeLinecap="round" />
    </svg>
  );
}
