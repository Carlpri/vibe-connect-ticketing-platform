/**
 * LocationMapPicker
 *
 * A fully self-contained map component that lets organisers pin the exact
 * location of an event on an OpenStreetMap tile layer (via Leaflet).
 *
 * Features
 * ─────────
 * • Click anywhere on the map to drop a pin and capture lat / lng
 * • Address search box (Nominatim geocoding — free, no API key)
 * • Reverse-geocode on pin drop to auto-fill venue, city, county, address
 * • "Use my location" button for quick geolocation
 * • Draggable marker so the organiser can fine-tune the pin position
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import PinDropIcon from '@mui/icons-material/PinDrop';
import 'leaflet/dist/leaflet.css';
import { colors } from '../../styles/theme';

// ── Leaflet CSS injected once (fallback for CDN or SSR) ────────────────────────
const LEAFLET_CSS_ID = 'leaflet-css';
function injectLeafletCss() {
  if (document.getElementById(LEAFLET_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = LEAFLET_CSS_ID;
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LocationDetails {
  address?: string;
  city?: string;
  county?: string;
  venue?: string;
}

interface Props {
  latitude: number | string;
  longitude: number | string;
  onChange: (lat: number, lng: number, details?: LocationDetails) => void;
}

// ── Nominatim types & helpers ─────────────────────────────────────────────────
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    amenity?: string;
    leisure?: string;
    tourism?: string;
  };
}

async function geocode(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Geocode failed');
  return res.json() as Promise<NominatimResult[]>;
}

async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return null;
  return res.json() as Promise<NominatimResult>;
}

function extractDetails(r: NominatimResult): LocationDetails {
  const a = r.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const suburb = a.suburb ?? '';
  return {
    address: [street, suburb].filter(Boolean).join(', '),
    city: a.city ?? a.town ?? a.village ?? '',
    county: a.county ?? a.state ?? '',
    venue: a.amenity ?? a.leisure ?? a.tourism ?? '',
  };
}

// ── SVG pin icon HTML (reused across Leaflet marker instances) ────────────────
const PIN_HTML = `<div style="width:32px;height:40px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35))"><svg xmlns='http://www.w3.org/2000/svg' width='32' height='40' viewBox='0 0 32 40'><path d='M16 0C7.163 0 0 7.163 0 16c0 10.386 14 24 16 24s16-13.614 16-24C32 7.163 24.837 0 16 0z' fill='#E8503A'/><circle cx='16' cy='16' r='7' fill='white'/></svg></div>`;

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [-1.2864, 36.8172]; // Nairobi CBD
const DEFAULT_ZOOM = 13;

// ── Component ─────────────────────────────────────────────────────────────────
export default function LocationMapPicker({ latitude, longitude, onChange }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coordsLabel, setCoordsLabel] = useState('');

  const pinLat = typeof latitude === 'number' ? latitude : (parseFloat(latitude as string) || null);
  const pinLng = typeof longitude === 'number' ? longitude : (parseFloat(longitude as string) || null);

  // ── Build / attach a draggable marker ─────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attachDragEnd = useCallback((m: any) => {
    m.on('dragend', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos = (m as any).getLatLng();
      setCoordsLabel(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
      setReverseLoading(true);
      try {
        const result = await reverseGeocode(pos.lat, pos.lng);
        onChange(pos.lat, pos.lng, result ? extractDetails(result) : undefined);
      } finally {
        setReverseLoading(false);
      }
    });
  }, [onChange]);

  // ── Place or move the marker ───────────────────────────────────────────────
  const placeMarker = useCallback(async (lat: number, lng: number, skipReverseGeocode = false) => {
    if (!mapRef.current) return;

    const L = await import('leaflet');
    const icon = L.divIcon({ html: PIN_HTML, className: '', iconSize: [32, 40], iconAnchor: [16, 40] });

    setCoordsLabel(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const m = L.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);
      attachDragEnd(m);
      markerRef.current = m;
    }

    if (!skipReverseGeocode) {
      setReverseLoading(true);
      try {
        const result = await reverseGeocode(lat, lng);
        onChange(lat, lng, result ? extractDetails(result) : undefined);
      } finally {
        setReverseLoading(false);
      }
    }
  }, [attachDragEnd, onChange]);

  // ── Initialise Leaflet ─────────────────────────────────────────────────────
  useEffect(() => {
    injectLeafletCss();
    let destroyed = false;

    import('leaflet').then((L) => {
      if (destroyed || !mapContainerRef.current || mapRef.current) return;

      const startLat = pinLat ?? DEFAULT_CENTER[0];
      const startLng = pinLng ?? DEFAULT_CENTER[1];

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: DEFAULT_ZOOM,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Pre-place marker if coords already exist
      if (pinLat !== null && pinLng !== null) {
        const icon = L.divIcon({ html: PIN_HTML, className: '', iconSize: [32, 40], iconAnchor: [16, 40] });
        const m = L.marker([pinLat, pinLng], { icon, draggable: true }).addTo(map);
        markerRef.current = m;
        setCoordsLabel(`${pinLat.toFixed(6)}, ${pinLng.toFixed(6)}`);

        m.on('dragend', async () => {
          const pos = m.getLatLng();
          setCoordsLabel(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
          setReverseLoading(true);
          try {
            const result = await reverseGeocode(pos.lat, pos.lng);
            onChange(pos.lat, pos.lng, result ? extractDetails(result) : undefined);
          } finally {
            setReverseLoading(false);
          }
        });
      }

      // Click to pin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('click', (e: any) => {
        if (destroyed) return;
        const { lat, lng } = e.latlng;
        // Use the placeMarker helper — but we need to call it after it's stable;
        // for simplicity handle directly here since `placeMarker` isn't stable yet
        const doPlace = async () => {
          const Lz = await import('leaflet');
          const icon = Lz.divIcon({ html: PIN_HTML, className: '', iconSize: [32, 40], iconAnchor: [16, 40] });
          setCoordsLabel(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const m = Lz.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);
            m.on('dragend', async () => {
              const pos = m.getLatLng();
              setCoordsLabel(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
              setReverseLoading(true);
              try {
                const rev = await reverseGeocode(pos.lat, pos.lng);
                onChange(pos.lat, pos.lng, rev ? extractDetails(rev) : undefined);
              } finally {
                setReverseLoading(false);
              }
            });
            markerRef.current = m;
          }
          setReverseLoading(true);
          try {
            const result = await reverseGeocode(lat, lng);
            onChange(lat, lng, result ? extractDetails(result) : undefined);
          } finally {
            setReverseLoading(false);
          }
        };
        doPlace();
      });

      // Invalidate size once after mounting so Leaflet tiles calculate properly
      setTimeout(() => {
        if (!destroyed && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 150);
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync marker & view when props change externally (e.g. presets) ────────
  useEffect(() => {
    if (!mapRef.current || pinLat === null || pinLng === null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([pinLat, pinLng]);
    }
    mapRef.current.panTo([pinLat, pinLng]);
    setCoordsLabel(`${pinLat.toFixed(6)}, ${pinLng.toFixed(6)}`);
  }, [pinLat, pinLng]);

  // ── Address search ────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await geocode(q);
      setSearchResults(results);
    } catch { /* Nominatim throttle — silent */ }
    finally { setSearching(false); }
  }, [searchQuery]);

  const selectResult = useCallback(async (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0].trim());
    if (mapRef.current) mapRef.current.setView([lat, lng], 16);
    await placeMarker(lat, lng, true);
    onChange(lat, lng, extractDetails(result));
  }, [onChange, placeMarker]);

  // ── Geolocation ───────────────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current) mapRef.current.setView([lat, lng], 16);
        await placeMarker(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [placeMarker]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* ── Search row ── */}
      <Box sx={{ display: 'flex', gap: 1, position: 'relative' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search for a venue, street or area…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value.trim()) setSearchResults([]);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ color: colors.mutedFg, mr: 0.5, fontSize: 20 }} />,
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
        />

        <Tooltip title="Use my location">
          <span>
            <IconButton
              onClick={handleLocateMe}
              disabled={locating}
              sx={{
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                bgcolor: 'white',
                '&:hover': { bgcolor: colors.mutedBg },
                flexShrink: 0,
              }}
            >
              {locating
                ? <CircularProgress size={18} sx={{ color: colors.coral }} />
                : <MyLocationIcon sx={{ fontSize: 20, color: colors.coral }} />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Search">
          <span>
            <IconButton
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              sx={{
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                bgcolor: colors.coral,
                color: 'white',
                '&:hover': { bgcolor: colors.coralLt },
                '&:disabled': { bgcolor: colors.mutedBg },
                flexShrink: 0,
              }}
            >
              {searching
                ? <CircularProgress size={18} sx={{ color: 'white' }} />
                : <SearchIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </span>
        </Tooltip>

        {/* Results dropdown */}
        {searchResults.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              bgcolor: 'white',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 1400,
              overflow: 'hidden',
            }}
          >
            {searchResults.map((r, i) => (
              <Box
                key={i}
                onClick={() => selectResult(r)}
                sx={{
                  px: 2, py: 1.2,
                  cursor: 'pointer',
                  borderBottom: i < searchResults.length - 1 ? `1px solid ${colors.border}` : 'none',
                  '&:hover': { bgcolor: colors.mutedBg },
                  display: 'flex', alignItems: 'flex-start', gap: 1,
                }}
              >
                <PinDropIcon sx={{ fontSize: 16, color: colors.coral, mt: 0.3, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                  {r.display_name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ── Map ── */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          border: `1px solid ${colors.border}`,
        }}
      >
        <Box
          ref={mapContainerRef}
          sx={{
            height: 380,
            width: '100%',
            '& .leaflet-container': { fontFamily: '"Manrope", system-ui, sans-serif' },
          }}
        />

        {/* Reverse geocoding indicator */}
        {reverseLoading && (
          <Box
            sx={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              bgcolor: 'rgba(255,255,255,0.93)',
              border: `1px solid ${colors.border}`,
              borderRadius: '20px', px: 2, py: 0.6,
              display: 'flex', alignItems: 'center', gap: 1,
              zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            }}
          >
            <CircularProgress size={13} sx={{ color: colors.coral }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: colors.fg }}>
              Looking up address…
            </Typography>
          </Box>
        )}

        {/* Tip when no pin yet */}
        {pinLat === null && (
          <Box
            sx={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              bgcolor: 'rgba(26,22,18,0.80)', borderRadius: '20px',
              px: 2.5, py: 0.8, zIndex: 1000, whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
              📍 Click on the map to set the event location
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Coordinates readout ── */}
      {coordsLabel && (
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1.5, py: 0.8,
            bgcolor: colors.mutedBg,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <PinDropIcon sx={{ fontSize: 15, color: colors.coral }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: colors.fg, fontFamily: 'monospace' }}>
            {coordsLabel}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.mutedFg }}>
            · Drag the pin to fine-tune
          </Typography>
        </Box>
      )}
    </Box>
  );
}
