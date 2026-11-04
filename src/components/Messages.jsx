import { useEffect, useRef, useState } from 'react';
import { containsMobile, partyRole, threadKey, threadsFor } from '../lib/messages';
import { newId, saveItem } from '../lib/repository';
import { Button, inputClass } from './ui';

function formatTime(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit' }).format(value);
  } catch {
    return '';
  }
}

export default function MessageDesk({ request, user, threads, onClose, onResult }) {
  const related = threadsFor(threads, request?.id);
  const mine = request?.userId === user.id;
  const [peerId, setPeerId] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const activePeer = mine ? peerId || (related.length === 1 ? related[0].peerId : null) : user.id;
  const thread = related.find((item) => item.peerId === activePeer) || null;
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, activePeer]);

  if (!request) return null;

  const otherName = mine
    ? thread?.peerName || partyRole(request, 'peer')
    : thread?.ownerName || request.authorName || partyRole(request, 'owner');

  async function send(event) {
    event.preventDefault();
    const body = text.trim();
    if (!body || !activePeer) return;
    if (containsMobile(body)) {
      setError('لا يمكن إرسال رقم الجوال. التواصل يتم داخل التطبيق فقط.');
      return;
    }
    setError('');
    const next = {
      id: thread?.id || threadKey(request.id, activePeer),
      requestId: request.id,
      requestTitle: request.title,
      ownerId: request.userId,
      peerId: activePeer,
      ownerName: mine ? user.name : thread?.ownerName || request.authorName || '',
      peerName: mine ? thread?.peerName || '' : user.name,
      updatedAt: Date.now(),
      messages: [
        ...messages,
        { id: newId(), fromId: user.id, text: body, createdAt: Date.now() },
      ].slice(-200),
    };
    setBusy(true);
    try {
      const result = await saveItem('threads', next);
      onResult(result);
      if (result.warning) {
        setError(result.warning);
        return;
      }
      setText('');
    } catch (err) {
      setError(err.message || 'تعذر إرسال الرسالة');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    if (mine && peerId && related.length > 1) {
      setPeerId(null);
      setError('');
      return;
    }
    onClose();
  }

  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-brand-soft">
      <header className="flex items-center gap-3 bg-brand px-4 py-3 text-white">
        <button type="button" onClick={back} className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold">
          رجوع
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm text-white/80">{request.title}</p>
          <h2 className="truncate text-base font-bold">{activePeer ? otherName : 'الرسائل'}</h2>
        </div>
      </header>

      {mine && !activePeer ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {related.length === 0 ? (
            <p className="rounded-3xl bg-white px-4 py-6 text-center text-base text-ink/70">
              لم تصلك رسائل على هذا الطلب بعد.
            </p>
          ) : (
            related.map((item) => {
              const last = Array.isArray(item.messages) ? item.messages[item.messages.length - 1] : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeerId(item.peerId)}
                  className="block w-full rounded-3xl bg-white p-4 text-right shadow-sm ring-1 ring-black/5"
                >
                  <span className="block text-base font-bold text-ink">
                    {item.peerName || partyRole(request, 'peer')}
                  </span>
                  <span className="mt-1 block truncate text-sm text-ink/70">{last?.text || 'محادثة جديدة'}</span>
                </button>
              );
            })
          )}
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="rounded-3xl bg-white px-4 py-6 text-center text-base text-ink/70">
                اكتب رسالتك للاتفاق على التسليم، من دون إرسال رقم الجوال.
              </p>
            ) : (
              messages.map((message) => {
                const own = message.fromId === user.id;
                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      own ? 'self-start bg-brand text-white' : 'self-end bg-white text-ink shadow-sm'
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className={`mt-1 text-xs ${own ? 'text-white/75' : 'text-ink/50'}`}>{formatTime(message.createdAt)}</p>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>
          <form className="flex items-end gap-2 border-t border-black/5 bg-white px-3 py-3 pb-safe" onSubmit={send}>
            <div className="min-w-0 flex-1">
              {error ? (
                <p className="mb-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <input
                className={inputClass}
                maxLength={400}
                value={text}
                placeholder="اكتب رسالة"
                onChange={(event) => {
                  setText(event.target.value);
                  setError('');
                }}
              />
            </div>
            <Button type="submit" full={false} busy={busy} disabled={!text.trim()}>
              إرسال
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
