export type LegalDocId = 'privacy' | 'terms' | 'organizer-agreement';

export interface LegalDocument {
  id: LegalDocId;
  title: string;
  path: string;
  updated: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_DOCUMENTS: Record<LegalDocId, LegalDocument> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    path: '/privacy',
    updated: 'October 2026',
    sections: [
      {
        heading: 'Overview',
        body:
          'VIBE-CONNECT ("we", "us") operates vibe-connect.co.ke and related services for event discovery and ticketing in Kenya. This policy explains what personal data we collect, why we use it, and your choices.',
      },
      {
        heading: 'Data we collect',
        body:
          'Account details (name, email, phone), order and ticket information, M-Pesa payment references (we do not store full PINs), device and usage data, and content you submit as an organizer (event descriptions, images).',
      },
      {
        heading: 'How we use data',
        body:
          'To create accounts, issue tickets and QR codes, process payments via Safaricom M-Pesa and other providers, prevent fraud, provide customer support, and improve the platform. We may send transactional messages about your orders; marketing is opt-in where required.',
      },
      {
        heading: 'Sharing',
        body:
          'We share data with payment processors, hosting providers, and event organizers for events you purchase (attendee name and ticket tier as needed for entry). We do not sell personal data.',
      },
      {
        heading: 'Retention & security',
        body:
          'We keep data as long as needed for legal, accounting, and support purposes. We use encryption in transit (HTTPS) and access controls; no method is 100% secure.',
      },
      {
        heading: 'Your rights',
        body:
          'You may request access, correction, or deletion of your account data by contacting support@vibe-connect.co.ke. You may also lodge a complaint with the Office of the Data Protection Commissioner (Kenya) where applicable.',
      },
      {
        heading: 'Contact',
        body: 'Privacy questions: support@vibe-connect.co.ke',
      },
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    path: '/terms',
    updated: 'October 2026',
    sections: [
      {
        heading: 'Agreement',
        body:
          'By using VIBE-CONNECT you agree to these Terms. If you do not agree, do not use the service.',
      },
      {
        heading: 'Tickets & events',
        body:
          'Events are created by independent organizers. VIBE-CONNECT facilitates listing and payment; the organizer is responsible for delivering the event as described. Refund policies are set by the organizer and shown at checkout unless otherwise required by law.',
      },
      {
        heading: 'Payments',
        body:
          'Prices are shown in Kenyan Shillings (KES). M-Pesa STK push and other methods may apply fees from your mobile provider. Failed or reversed payments may cancel your order.',
      },
      {
        heading: 'Acceptable use',
        body:
          'Do not resell tickets in violation of organizer rules, scrape the platform, attempt fraud, or upload unlawful content. We may suspend accounts that abuse the service.',
      },
      {
        heading: 'Limitation of liability',
        body:
          'To the fullest extent permitted by Kenyan law, VIBE-CONNECT is not liable for indirect losses or for organizer cancellations beyond our role as a ticketing platform. Our total liability for a transaction is limited to the fees paid to us for that transaction.',
      },
      {
        heading: 'Changes',
        body:
          'We may update these Terms; continued use after changes constitutes acceptance. Material changes will be posted on this page.',
      },
      {
        heading: 'Contact',
        body: 'Legal / support: support@vibe-connect.co.ke',
      },
    ],
  },
  'organizer-agreement': {
    id: 'organizer-agreement',
    title: 'Organizer Agreement',
    path: '/organizer-agreement',
    updated: 'October 2026',
    sections: [
      {
        heading: 'Role',
        body:
          'As an organizer you list events on VIBE-CONNECT and sell tickets through our checkout. You are the merchant of record for your event; we provide software and payment facilitation.',
      },
      {
        heading: 'Your responsibilities',
        body:
          'Provide accurate dates, venues, pricing, and refund rules. Deliver the event as advertised. Comply with Kenyan law (licensing, tax, age restrictions, safety). You must have rights to images and content you upload.',
      },
      {
        heading: 'Payouts & fees',
        body:
          'Platform and payment fees (if any) are disclosed in your organizer dashboard or separate commercial terms. Payout timing depends on payment settlement and verification.',
      },
      {
        heading: 'Customer data',
        body:
          'You receive attendee information needed for entry and support. You must use it only for event operations and in line with our Privacy Policy and applicable data protection law.',
      },
      {
        heading: 'Cancellations & refunds',
        body:
          'You must communicate cancellation or postponement promptly. Refunds follow your stated policy and applicable consumer protection rules.',
      },
      {
        heading: 'Termination',
        body:
          'We may remove listings or suspend organizer accounts for fraud, repeated complaints, or breach of this agreement.',
      },
      {
        heading: 'Contact',
        body: 'Organizer support: support@vibe-connect.co.ke',
      },
    ],
  },
};
