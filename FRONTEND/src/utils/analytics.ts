declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
  }
}

const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

export function initAnalytics(): void {
  if (gaId && !document.getElementById('vibe-ga-script')) {
    const script = document.createElement('script');
    script.id = 'vibe-ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    window.gtag = window.gtag || function gtag(...args: unknown[]) {
      (window as unknown as { dataLayer: unknown[] }).dataLayer =
        (window as unknown as { dataLayer: unknown[] }).dataLayer || [];
      (window as unknown as { dataLayer: unknown[] }).dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: false });
  }

  if (plausibleDomain && !document.getElementById('vibe-plausible-script')) {
    const script = document.createElement('script');
    script.id = 'vibe-plausible-script';
    script.defer = true;
    script.dataset.domain = plausibleDomain;
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }
}

export function trackPageView(path: string, title?: string): void {
  if (gaId && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
    });
  }
  if (plausibleDomain && window.plausible) {
    window.plausible('pageview');
  }
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number>
): void {
  if (gaId && window.gtag) {
    window.gtag('event', name, params);
  }
  if (plausibleDomain && window.plausible) {
    window.plausible(name, params ? { props: params } : undefined);
  }
}

/** Funnel: event detail → checkout → payment success */
export const AnalyticsEvents = {
  viewEvent: (eventId: string, title: string) =>
    trackEvent('view_event', { event_id: eventId, event_title: title }),
  beginCheckout: (eventId: string, valueKes: number) =>
    trackEvent('begin_checkout', { event_id: eventId, value: valueKes, currency: 'KES' }),
  purchase: (eventId: string, orderId: string, valueKes: number) =>
    trackEvent('purchase', {
      event_id: eventId,
      transaction_id: orderId,
      value: valueKes,
      currency: 'KES',
    }),
};
