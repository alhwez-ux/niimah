export function containsMobile(text) {
  const normalized = String(text || '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const compact = normalized.replace(/[\s\-().]/g, '');
  return /(?:\+?966|0)5\d{8}/.test(compact);
}

export function threadKey(requestId, peerId) {
  return `${requestId}__${peerId}`;
}

export function partyRole(request, who) {
  const ownerIsDonor = request?.kind !== 'need';
  if (who === 'owner') return ownerIsDonor ? 'متبرع' : 'محتاج';
  return ownerIsDonor ? 'محتاج' : 'متبرع';
}

export function threadsFor(threads, requestId) {
  return (threads || [])
    .filter((thread) => thread.requestId === requestId)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
