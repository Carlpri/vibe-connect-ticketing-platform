/** Formats a KES price. e.g. 1500 → "KES 1,500" */
export function formatKes(amountKes: number): string {
  return `KES ${amountKes.toLocaleString('en-KE')}`;
}

/** Formats an ISO date string for display. e.g. "2026-10-17T18:00:00Z" → "Fri, 17 Oct 2026 · 9:00 PM" */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const formatDate = formatEventDate;

/** Short date only, e.g. "17 Oct" */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
}

/** Extracts an Axios/fetch error message safely */
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  if (!error) return fallback;
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (e.response && typeof e.response === 'object') {
      const resp = e.response as Record<string, unknown>;
      if (resp.data && typeof resp.data === 'object') {
        const d = resp.data as Record<string, unknown>;
        if (typeof d.message === 'string') return d.message;
      }
    }
    if (typeof e.message === 'string') return e.message;
  }
  return fallback;
}

export const getApiErrorMessage = extractErrorMessage;

/** Returns initials from a name, e.g. "Carlos Pinto" → "CP" */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
