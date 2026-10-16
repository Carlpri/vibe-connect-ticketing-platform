import type { Event } from '../types';

/**
 * Generates ISO date relative to current time so mock events always stay
 * realistically scheduled across Today, This Weekend, This Month, and upcoming dates.
 */
function getRelativeDate(daysFromNow: number, hours = 19, minutes = 0): { startsAt: string; endsAt: string } {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start);
  end.setHours(start.getHours() + 5);

  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

/** Calculate days until the upcoming Friday/Saturday of this weekend */
function getWeekendOffset(): number {
  const day = new Date().getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  if (day === 5) return 0; // Today is Friday
  if (day === 6) return 0; // Today is Saturday
  if (day === 0) return 0; // Today is Sunday
  return 5 - day; // Days until Friday
}

const weekendOffset = getWeekendOffset();

export const MOCK_EVENTS: Event[] = [
  {
    id: 'evt-001',
    title: 'Sol Generation Experience: Live in Nairobi',
    slug: 'sol-generation-experience-live-in-nairobi',
    description:
      'Immerse yourself in an unforgettable evening of soulful Afro-pop, live orchestral arrangements, and high-energy performances by Kenya’s biggest musical sensations. Featuring Sauti Sol, Bensoul, Nviiri The Storyteller, and guest international artists.',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    category: 'Music',
    format: 'PHYSICAL',
    venue: 'Carnivore Grounds',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Carnivore Road, Off Langata Road',
    latitude: -1.3307,
    longitude: 36.7650,
    ...getRelativeDate(weekendOffset, 18, 0), // Happening This Weekend!
    status: 'PUBLISHED',
    organizerId: 'org-01',
    organizerName: 'Sol Entertainment Ltd',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-001',
        name: 'Early Bird Regular',
        description: 'Standard access before general tickets release. Limited availability.',
        priceKes: 1500,
        capacity: 500,
        available: 34,
        eventId: 'evt-001',
      },
      {
        id: 'tt-002',
        name: 'Regular Gate Pass',
        description: 'General arena access, food courts, and main stage standing area.',
        priceKes: 2500,
        capacity: 2000,
        available: 1240,
        eventId: 'evt-001',
      },
      {
        id: 'tt-003',
        name: 'VIP Experience',
        description: 'Elevated viewing lounge, dedicated bar, welcome cocktail, fast-track entry.',
        priceKes: 6000,
        capacity: 400,
        available: 82,
        eventId: 'evt-001',
      },
    ],
  },
  {
    id: 'evt-002',
    title: 'Blankets & Wine: The Afro-Fusion Garden Party',
    slug: 'blankets-and-wine-afro-fusion-garden-party',
    description:
      'East Africa’s premier picnic-style music and lifestyle festival celebrating African music, fashion, food, and culture under the Nairobi sun. Bring your picnic mats, hats, and positive vibes.',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    category: 'Festivals',
    format: 'PHYSICAL',
    venue: 'Laureus Gardens, Karen',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Karen Road, Karen',
    latitude: -1.3196,
    longitude: 36.7103,
    ...getRelativeDate(weekendOffset + 1, 12, 0), // Happening This Weekend!
    status: 'PUBLISHED',
    organizerId: 'org-02',
    organizerName: 'Muthoni Drummer Queen Productions',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-005',
        name: 'Advance Die-Hard Ticket',
        description: 'Early admission for true festival loyalists.',
        priceKes: 3000,
        capacity: 800,
        available: 110,
        eventId: 'evt-002',
      },
      {
        id: 'tt-006',
        name: 'General Admission',
        description: 'Access to main lawn, artisan food truck village, and curated art exhibitions.',
        priceKes: 4500,
        capacity: 2500,
        available: 950,
        eventId: 'evt-002',
      },
    ],
  },
  {
    id: 'evt-003',
    title: 'Kilifi New Year: Coastal Electronic Odyssey',
    slug: 'kilifi-new-year-coastal-electronic-odyssey',
    description:
      '3 days of groundbreaking electronic and afro-house sounds amidst ancient baobabs by the Indian Ocean. An eco-conscious arts gathering with incredible light installations, wellness workshops, and beach stages.',
    coverImage: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80',
    category: 'Parties',
    format: 'PHYSICAL',
    venue: 'Beneath The Baobabs, Kilifi Creek',
    city: 'Kilifi',
    county: 'Kilifi',
    address: 'Kilifi Creek Road',
    latitude: -3.6305,
    longitude: 39.8499,
    ...getRelativeDate(20, 14, 0),
    status: 'PUBLISHED',
    organizerId: 'org-03',
    organizerName: 'Baobab Collective',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-008',
        name: '3-Day Full Festival Pass',
        description: 'Complete access to all stages and beach areas across all 3 days.',
        priceKes: 7500,
        capacity: 1200,
        available: 430,
        eventId: 'evt-003',
      },
    ],
  },
  {
    id: 'evt-004',
    title: 'Nairobi Comedy All-Stars: Stand-Up Special',
    slug: 'nairobi-comedy-all-stars-stand-up-special',
    description:
      'A side-splitting evening featuring Kenya’s top comedic talent delivering fresh, raw, and relatable punchlines on Nairobi life, dating, traffic, and everything in between.',
    coverImage: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80',
    category: 'Comedy',
    format: 'PHYSICAL',
    venue: 'Kenya National Theatre',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Harry Thuku Road, University Way',
    latitude: -1.2794,
    longitude: 36.8168,
    ...getRelativeDate(0, 19, 30), // Happening TODAY!
    status: 'PUBLISHED',
    organizerId: 'org-04',
    organizerName: 'Laugh Festival Kenya',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-010',
        name: 'Auditorium Gallery',
        description: 'Upper tier seating with full view of stage and screen.',
        priceKes: 800,
        capacity: 300,
        available: 140,
        eventId: 'evt-004',
      },
      {
        id: 'tt-011',
        name: 'Stalls / Main Floor',
        description: 'Prime lower level seating up close to the comedians.',
        priceKes: 1500,
        capacity: 450,
        available: 210,
        eventId: 'evt-004',
      },
    ],
  },
  {
    id: 'evt-005',
    title: 'Kenya Tech & Startup Summit 2026',
    slug: 'kenya-tech-startup-summit-2026',
    description:
      'Connect with Africa’s top tech founders, angel investors, venture capitalists, and creators shaping the future of Silicon Savannah. Keynotes, pitch competitions, and high-level networking lounges.',
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    category: 'Networking',
    format: 'PHYSICAL',
    venue: 'Sarit Expo Centre, Westlands',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Karuna Close, Off Lower Kabete Road, Westlands',
    latitude: -1.2590,
    longitude: 36.8045,
    ...getRelativeDate(7, 8, 30), // Happening This Month!
    status: 'PUBLISHED',
    organizerId: 'org-05',
    organizerName: 'East Africa Tech Hub',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-013',
        name: 'Student / Early Career',
        description: 'Valid student ID or recent graduate proof required at registration.',
        priceKes: 1000,
        capacity: 250,
        available: 75,
        eventId: 'evt-005',
      },
      {
        id: 'tt-014',
        name: 'Professional Delegate',
        description: 'Full 2-day pass with summit lunches, keynote recordings, and expo entry.',
        priceKes: 4000,
        capacity: 600,
        available: 310,
        eventId: 'evt-005',
      },
    ],
  },
  {
    id: 'evt-006',
    title: 'Nairobi Derby: Gor Mahia vs AFC Leopards (Mashemeji)',
    slug: 'nairobi-derby-mashemeji-derby-2026',
    description:
      'The most storied football rivalry in Kenyan sports history! Passion, pride, and unmatched stadium atmosphere as the giants of Kenyan Premier League clash.',
    coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    category: 'Sports',
    format: 'PHYSICAL',
    venue: 'Nyayo National Stadium',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'Mombasa Road, Kibra',
    latitude: -1.3095,
    longitude: 36.8219,
    ...getRelativeDate(4, 15, 0), // Happening This Month!
    status: 'PUBLISHED',
    organizerId: 'org-06',
    organizerName: 'FKF Premier League',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-016',
        name: 'Russia / Terraces',
        description: 'Open terrace standing & bleacher seating. Unmatched singing and cheering.',
        priceKes: 300,
        capacity: 15000,
        available: 9200,
        eventId: 'evt-006',
      },
      {
        id: 'tt-017',
        name: 'VIP Main Stand',
        description: 'Roofed seating area, center pitch alignment.',
        priceKes: 1000,
        capacity: 2000,
        available: 640,
        eventId: 'evt-006',
      },
    ],
  },
  {
    id: 'evt-007',
    title: 'Mombasa Beach Reggae Carnival & Food Festival',
    slug: 'mombasa-beach-reggae-carnival-food-festival',
    description:
      'Roots, rock, reggae and authentic Swahili seafood by the white sands of Nyali Beach. Featuring top coastal soundsystems, live percussion, and sunset beach bonfires.',
    coverImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
    category: 'Parties',
    format: 'PHYSICAL',
    venue: 'Nyali Beachfront Park',
    city: 'Mombasa',
    county: 'Mombasa',
    address: 'Nyali Links Road, Mombasa',
    latitude: -4.0435,
    longitude: 39.7112,
    ...getRelativeDate(5, 16, 0), // Happening This Month!
    status: 'PUBLISHED',
    organizerId: 'org-07',
    organizerName: 'Coast Sound Productions',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-019',
        name: 'Early Beach Pass',
        description: 'Access to beach concerts and seafood village.',
        priceKes: 700,
        capacity: 1000,
        available: 450,
        eventId: 'evt-007',
      },
      {
        id: 'tt-020',
        name: 'VIP Sunset Lounge',
        description: 'Reserved beach cabana and complimentary coconut welcome drink.',
        priceKes: 2000,
        capacity: 200,
        available: 60,
        eventId: 'evt-007',
      },
    ],
  },
  {
    id: 'evt-008',
    title: 'Dala Sunset Afrobeats & Lakeside Chillout',
    slug: 'dala-sunset-afrobeats-lakeside-chillout',
    description:
      'Vibrant lakeside sundowner with live acoustic jazz, fresh tilapia bites, and soulful Afrobeats as the sun sets over Lake Victoria. The premier weekend hangout in Kisumu.',
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    category: 'Music',
    format: 'PHYSICAL',
    venue: 'Dunga Hill Camp',
    city: 'Kisumu',
    county: 'Kisumu',
    address: 'Dunga Beach Road, Kisumu',
    latitude: -0.1384,
    longitude: 34.7368,
    ...getRelativeDate(weekendOffset, 15, 0), // Happening This Weekend!
    status: 'PUBLISHED',
    organizerId: 'org-08',
    organizerName: 'Lakeside Vibes Entertainment',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-021',
        name: 'Regular Entry',
        description: 'General lakeside lawn pass.',
        priceKes: 500,
        capacity: 800,
        available: 310,
        eventId: 'evt-008',
      },
    ],
  },
  {
    id: 'evt-009',
    title: 'Rift Valley Great Run & Crater Festival',
    slug: 'rift-valley-great-run-crater-festival',
    description:
      'Scenic athletic marathon around Menengai Crater followed by an open-air sundowner festival with local acoustic bands and barbecue.',
    coverImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    category: 'Sports',
    format: 'PHYSICAL',
    venue: 'Menengai Crater Viewpoint',
    city: 'Nakuru',
    county: 'Nakuru',
    address: 'Menengai Forest Road, Nakuru',
    latitude: -0.2012,
    longitude: 36.0718,
    ...getRelativeDate(10, 7, 0), // Happening This Month!
    status: 'PUBLISHED',
    organizerId: 'org-09',
    organizerName: 'Rift Valley Athletics Collective',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-022',
        name: 'Runner Entry + Finisher Medal',
        description: 'Official marathon bib, timing chip, hydration stations, and evening concert pass.',
        priceKes: 1200,
        capacity: 1500,
        available: 720,
        eventId: 'evt-009',
      },
    ],
  },
  {
    id: 'evt-010',
    title: 'Campus Culture Rave & Freshers Welcome Showcase',
    slug: 'campus-culture-rave-freshers-welcome-showcase',
    description:
      'The biggest inter-university music and creator fest in Nairobi. DJ battles, dance showdowns, photo booths, and student entrepreneur market stalls. 100% Free with university student ID!',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    category: 'Campus',
    format: 'PHYSICAL',
    venue: 'UoN Graduation Square Grounds',
    city: 'Nairobi',
    county: 'Nairobi',
    address: 'University Way, Nairobi CBD',
    latitude: -1.2801,
    longitude: 36.8163,
    ...getRelativeDate(0, 14, 0), // Happening TODAY!
    status: 'PUBLISHED',
    organizerId: 'org-10',
    organizerName: 'Student Union Council',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-023',
        name: 'Free Student Pass',
        description: 'Complimentary entrance with valid university ID or admission letter.',
        priceKes: 0,
        capacity: 3000,
        available: 1820,
        eventId: 'evt-010',
      },
    ],
  },
  {
    id: 'evt-011',
    title: 'Swahili Street Fashion Runway & Exhibition',
    slug: 'swahili-street-fashion-runway-exhibition',
    description:
      'Celebrating high-end African streetwear, sustainable fabrics, and coastal Swahili haute couture. Meet top East African fashion designers, models, and fashion photographers.',
    coverImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
    category: 'Fashion',
    format: 'PHYSICAL',
    venue: 'Fort Jesus Cultural Amphitheatre',
    city: 'Mombasa',
    county: 'Mombasa',
    address: 'Nkurumah Road, Old Town, Mombasa',
    latitude: -4.0628,
    longitude: 39.6792,
    ...getRelativeDate(9, 18, 0), // Happening This Month!
    status: 'PUBLISHED',
    organizerId: 'org-11',
    organizerName: 'Swahili Arts & Fashion Hub',
    createdAt: new Date().toISOString(),
    ticketTypes: [
      {
        id: 'tt-024',
        name: 'Runway Viewing Pass',
        description: 'Seat along the main catwalk and entrance to exhibition hall.',
        priceKes: 1500,
        capacity: 400,
        available: 130,
        eventId: 'evt-011',
      },
    ],
  },
];
