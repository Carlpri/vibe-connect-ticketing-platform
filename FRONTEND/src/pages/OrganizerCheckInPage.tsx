import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import { useParams, Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import RefreshIcon from '@mui/icons-material/Refresh';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import HistoryIcon from '@mui/icons-material/History';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';

import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

import { ticketService, type CheckInResponseData, type CheckInStatsData } from '../services/ticketService';
import { eventService } from '../services/eventService';
import type { AttendeeListItem } from '../types';
import { colors } from '../styles/theme';
import { formatKes } from '../utils/format';

/**
 * Synthesizes a crisp audio tone using the browser Web Audio API for fast gate feedback.
 */
function playAudioFeedback(type: 'success' | 'warning' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'warning') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // AudioContext blocked by browser autoplay policy — non-critical
  }

  // Tactile haptic feedback on mobile devices
  if (navigator.vibrate) {
    if (type === 'success') navigator.vibrate(100);
    else if (type === 'warning') navigator.vibrate([100, 50, 100]);
    else navigator.vibrate([150, 100, 150]);
  }
}

export default function OrganizerCheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();

  // Scanner & Navigation state
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'attendees'>('camera');
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Validation processing state
  const [processing, setProcessing] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResponseData | null>(null);
  const [manualCode, setManualCode] = useState('');

  // Event stats & audit logs
  const [stats, setStats] = useState<CheckInStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Attendee Roster state
  const [attendees, setAttendees] = useState<AttendeeListItem[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeFilter, setAttendeeFilter] = useState<'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'VOID'>('ALL');
  const [attendeeCounts, setAttendeeCounts] = useState<{
    totalIssued: number;
    checkedIn: number;
    notCheckedIn: number;
    percentage: number;
  }>({ totalIssued: 0, checkedIn: 0, notCheckedIn: 0, percentage: 0 });

  // References
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const containerId = 'vibe-qr-reader';

  // Load event statistics
  const fetchStats = useCallback(async () => {
    if (!eventId) return;
    try {
      setStatsError(null);
      const res = await ticketService.getCheckInStats(eventId);
      setStats(res.data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to load check-in statistics.';
      setStatsError(msg || 'Failed to load event data.');
    } finally {
      setLoadingStats(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Poll every 15s for live updates
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Load attendee roster
  const fetchAttendees = useCallback(async () => {
    if (!eventId) return;
    setAttendeesLoading(true);
    try {
      const res = await eventService.getEventAttendees(eventId, {
        search: attendeeSearch.trim() || undefined,
        status: attendeeFilter,
        limit: 100,
      });
      setAttendees(res.data.items);
      setAttendeeCounts(res.data.counts);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to load attendees.';
      toast.error(msg || 'Failed to load attendee roster.');
    } finally {
      setAttendeesLoading(false);
    }
  }, [eventId, attendeeSearch, attendeeFilter]);

  useEffect(() => {
    if (activeTab === 'attendees') {
      fetchAttendees();
    }
  }, [activeTab, fetchAttendees]);

  const handleExportCsv = () => {
    if (attendees.length === 0) {
      toast.error('No attendees to export.');
      return;
    }
    const headers = ['Attendee Name', 'Email', 'Ticket Code', 'Ticket Type', 'Status', 'Checked In At', 'Issued At'];
    const rows = attendees.map((a) => [
      `"${(a.attendeeName || 'Attendee').replace(/"/g, '""')}"`,
      `"${(a.attendeeEmail || '').replace(/"/g, '""')}"`,
      `"${a.ticketNumber}"`,
      `"${(a.ticketType?.name || 'General').replace(/"/g, '""')}"`,
      a.status,
      a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : 'N/A',
      new Date(a.createdAt).toLocaleString(),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendees-${stats?.event?.title || 'event'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendee list exported.');
  };

  // Execute check-in API call with duplicate debounce & state locks
  const handleValidateIdentifier = useCallback(async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed || !eventId || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setProcessing(true);
    setScanCooldown(true);

    try {
      const res = await ticketService.checkIn(eventId, trimmed);
      const data = res.data;
      setLastResult(data);

      if (data.outcome === 'VALID') {
        playAudioFeedback('success');
        toast.success(`Admitted: ${data.attendee?.name || 'Attendee'} (${data.ticketType?.name || 'Ticket'})`);
      } else if (data.outcome === 'ALREADY_USED') {
        playAudioFeedback('warning');
        toast.error(`Already Admitted: ${data.attendee?.name || 'Ticket'} was previously used.`);
      } else {
        playAudioFeedback('error');
        toast.error(data.message || `Check-in rejected: ${data.outcome}`);
      }

      // Refresh stats
      fetchStats();
    } catch (err: unknown) {
      playAudioFeedback('error');
      const errorMsg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; data?: CheckInResponseData } } }).response?.data?.message
        : 'Network or validation error occurred.';
      
      const responseData = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { data?: CheckInResponseData } } }).response?.data?.data
        : null;

      if (responseData) {
        setLastResult(responseData);
      } else {
        setLastResult({
          outcome: 'INVALID',
          valid: false,
          message: errorMsg || 'Unable to communicate with the admission server.',
        });
      }
      toast.error(errorMsg || 'Check-in validation failed.');
    } finally {
      setProcessing(false);
      // Debounce scanner for 1.8 seconds to avoid re-reading the same physical ticket immediately
      setTimeout(() => {
        isProcessingRef.current = false;
        setScanCooldown(false);
      }, 1800);
    }
  }, [eventId, fetchStats]);

  // Start camera scanner
  const startScanner = useCallback(async () => {
    if (!eventId) return;
    setCameraPermissionError(null);

    try {
      // Find devices
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraPermissionError('No camera found on this device. Please use manual ticket entry.');
        return;
      }

      setAvailableCameras(devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 4)}` })));

      const targetCamera = devices[selectedCameraIndex] || devices[0];
      const html5QrCode = new Html5Qrcode(containerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        targetCamera.id,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Trigger validation when not cooled down
          if (!isProcessingRef.current) {
            handleValidateIdentifier(decodedText);
          }
        },
        () => {
          // Ignored per-frame decode miss
        }
      );

      setScannerActive(true);

      // Inspect torch support
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setCameraPermissionError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else {
        setCameraPermissionError(`Could not access camera: ${msg}. Try manual ticket entry.`);
      }
      setScannerActive(false);
    }
  }, [eventId, selectedCameraIndex, handleValidateIdentifier]);

  // Stop camera scanner
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
        setScannerActive(false);
        setTorchOn(false);
      }
    }
  }, []);

  // Switch camera (front / rear)
  const toggleCamera = async () => {
    if (availableCameras.length <= 1) {
      toast('Only one camera is available on this device.');
      return;
    }
    await stopScanner();
    setSelectedCameraIndex((prev) => (prev + 1) % availableCameras.length);
  };

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.error('Torch error:', err);
      toast.error('Torch control is not supported on this device stream.');
    }
  };

  // Start/stop camera based on active tab & mount
  useEffect(() => {
    if (activeTab === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [activeTab, selectedCameraIndex, startScanner, stopScanner]);

  // Handle manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || processing) return;
    handleValidateIdentifier(manualCode.trim());
    setManualCode('');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 2.5, md: 4 } }}>
      <Container maxWidth="lg">
        {/* Navigation Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Button
            component={Link}
            to="/organizer"
            startIcon={<ArrowBackIcon />}
            sx={{
              color: colors.fg,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
            }}
          >
            Organizer Dashboard
          </Button>

          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchStats}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: colors.fg,
              borderColor: colors.border,
            }}
          >
            Refresh Counts
          </Button>
        </Box>

        {/* Event Header Banner */}
        <Card
          sx={{
            mb: 3,
            bgcolor: colors.ink,
            color: colors.inkFg,
            borderRadius: '16px',
            p: { xs: 2.5, md: 3 },
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label="GATE SCANNER"
                  size="small"
                  sx={{
                    bgcolor: colors.lime,
                    color: colors.limeFg,
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                  }}
                />
                <Chip
                  label={stats?.event?.status || 'LIVE'}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                />
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.4rem', md: '1.9rem' },
                  color: '#fff',
                }}
              >
                {stats?.event?.title || 'Event Admission Gate'}
              </Typography>

              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                📍 {stats?.event?.venue || 'Venue'}, {stats?.event?.city || 'Nairobi'}
              </Typography>
            </Box>

            {/* Attendance Progress Metrics */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minWidth: { md: 280 },
                bgcolor: 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
                p: 2,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                  ATTENDEE ADMISSION
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 900, color: colors.lime }}>
                  {stats ? `${stats.counts.checkedIn} / ${stats.counts.total}` : '0 / 0'}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={stats?.counts?.percentage || 0}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: colors.lime,
                    borderRadius: 5,
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {stats?.counts?.remaining || 0} remaining
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff' }}>
                  {stats?.counts?.percentage || 0}% checked in
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>

        {statsError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {statsError}
          </Alert>
        )}

        {/* Main Interface: Left Column (Scanner & Input) + Right Column (Feedback & History) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 3 }}>
          {/* LEFT: Scanner / Entry Deck */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Card
              sx={{
                bgcolor: colors.cardBg,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              {/* Mode Tabs */}
              <Box sx={{ borderBottom: `1px solid ${colors.border}`, bgcolor: colors.mutedBg }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, val) => setActiveTab(val)}
                  variant="fullWidth"
                  textColor="primary"
                  indicatorColor="primary"
                >
                  <Tab
                    value="camera"
                    icon={<QrCodeScannerIcon />}
                    iconPosition="start"
                    label="Camera Scanner"
                    sx={{ textTransform: 'none', fontWeight: 700, py: 1.5 }}
                  />
                  <Tab
                    value="manual"
                    icon={<KeyboardIcon />}
                    iconPosition="start"
                    label="Manual Code Entry"
                    sx={{ textTransform: 'none', fontWeight: 700, py: 1.5 }}
                  />
                  <Tab
                    value="attendees"
                    icon={<PeopleAltIcon />}
                    iconPosition="start"
                    label="Attendees & Registrations"
                    sx={{ textTransform: 'none', fontWeight: 700, py: 1.5 }}
                  />
                </Tabs>
              </Box>

              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {activeTab === 'camera' ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {cameraPermissionError ? (
                      <Alert
                        severity="warning"
                        action={
                          <Button color="inherit" size="small" onClick={startScanner}>
                            Retry
                          </Button>
                        }
                        sx={{ width: '100%', mb: 2, borderRadius: '10px' }}
                      >
                        {cameraPermissionError}
                      </Alert>
                    ) : null}

                    {/* Scanner Viewport */}
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 420,
                        position: 'relative',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        bgcolor: '#000',
                        aspectRatio: '1/1',
                        border: `2px solid ${scanCooldown ? colors.lime : colors.border}`,
                        transition: 'border-color 0.3s ease',
                      }}
                    >
                      <Box
                        id={containerId}
                        sx={{
                          width: '100%',
                          height: '100%',
                          '& video': {
                            width: '100% !important',
                            height: '100% !important',
                            objectFit: 'cover',
                          },
                        }}
                      />

                      {/* Scanning HUD Crosshair Overlay */}
                      {scannerActive && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              width: 220,
                              height: 220,
                              border: `2px dashed ${processing ? colors.coral : colors.lime}`,
                              borderRadius: '16px',
                              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                              animation: processing ? 'pulse 1s infinite' : 'none',
                            }}
                          />
                        </Box>
                      )}

                      {/* Processing Badge */}
                      {processing && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bgcolor: 'rgba(0,0,0,0.85)',
                            color: colors.lime,
                            px: 2,
                            py: 0.6,
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            zIndex: 10,
                          }}
                        >
                          <CircularProgress size={14} sx={{ color: colors.lime }} />
                          <Typography variant="caption" sx={{ fontWeight: 800 }}>
                            VALIDATING TICKET…
                          </Typography>
                        </Box>
                      )}

                      {/* Cooldown Lock Indicator */}
                      {scanCooldown && !processing && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bgcolor: 'rgba(26,22,18,0.88)',
                            color: '#fff',
                            px: 2,
                            py: 0.5,
                            borderRadius: '20px',
                            zIndex: 10,
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Ready for next scan…
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Camera Controls Toolbar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 2, width: '100%' }}>
                      <Tooltip title="Switch Camera (Front/Rear)">
                        <span>
                          <IconButton
                            onClick={toggleCamera}
                            disabled={availableCameras.length <= 1}
                            sx={{
                              border: `1px solid ${colors.border}`,
                              borderRadius: '10px',
                              bgcolor: colors.mutedBg,
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
                            }}
                          >
                            <CameraswitchIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {torchSupported && (
                        <Tooltip title={torchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}>
                          <IconButton
                            onClick={toggleTorch}
                            sx={{
                              border: `1px solid ${colors.border}`,
                              borderRadius: '10px',
                              bgcolor: torchOn ? colors.lime : colors.mutedBg,
                              color: torchOn ? colors.limeFg : colors.fg,
                            }}
                          >
                            {torchOn ? <FlashOffIcon fontSize="small" /> : <FlashOnIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}

                      {scannerActive ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<StopIcon />}
                          onClick={stopScanner}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                        >
                          Pause Camera
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PlayArrowIcon />}
                          onClick={startScanner}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            bgcolor: colors.lime,
                            color: colors.limeFg,
                            '&:hover': { bgcolor: colors.limeLt },
                          }}
                        >
                          Start Camera
                        </Button>
                      )}
                    </Box>
                  </Box>
                ) : activeTab === 'manual' ? (
                  /* MANUAL ENTRY FORM */
                  <Box component="form" onSubmit={handleManualSubmit} sx={{ py: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.fg, mb: 1 }}>
                      Enter Ticket ID or Code
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.mutedFg, display: 'block', mb: 2 }}>
                      Type the attendee&apos;s Ticket UUID (e.g. <code>c0a80123-4567...</code>) or scanned code reference.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField
                        fullWidth
                        size="medium"
                        placeholder="Paste or type ticket code…"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        disabled={processing}
                        autoFocus
                        slotProps={{
                          htmlInput: {
                            style: { fontFamily: 'monospace', fontWeight: 600, fontSize: '1rem' },
                          },
                        }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={processing || !manualCode.trim()}
                        sx={{
                          bgcolor: colors.lime,
                          color: colors.limeFg,
                          fontWeight: 800,
                          px: 3,
                          borderRadius: '8px',
                          textTransform: 'none',
                          flexShrink: 0,
                          '&:hover': { bgcolor: colors.limeLt },
                        }}
                      >
                        {processing ? <CircularProgress size={20} sx={{ color: colors.limeFg }} /> : 'Validate'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Ticket Tier Breakdown */}
            <Card
              sx={{
                bgcolor: colors.cardBg,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                p: 2.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleAltIcon sx={{ fontSize: 18, color: colors.limeDk }} /> TICKET TIER ADMISSION STATS
              </Typography>

              {loadingStats && !stats ? (
                <CircularProgress size={24} sx={{ color: colors.lime }} />
              ) : stats?.ticketTypes && stats.ticketTypes.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {stats.ticketTypes.map((tier) => (
                    <Box key={tier.id} sx={{ p: 1.5, bgcolor: colors.mutedBg, borderRadius: '10px' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.fg }}>
                          {tier.name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: 'monospace', color: colors.fg }}>
                          {tier.checkedIn} / {tier.sold} admitted
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={tier.sold > 0 ? Math.min(100, Math.round((tier.checkedIn / tier.sold) * 100)) : 0}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'rgba(0,0,0,0.06)',
                          '& .MuiLinearProgress-bar': { bgcolor: colors.limeDk, borderRadius: 3 },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                  No active ticket types found for this event.
                </Typography>
              )}
            </Card>
          </Box>

          {/* RIGHT: Live Admission Feedback & Scan Audit History */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* LATEST SCAN RESULT BANNER */}
            <Card
              sx={{
                bgcolor: colors.cardBg,
                borderRadius: '16px',
                border: `2px solid ${
                  !lastResult
                    ? colors.border
                    : lastResult.outcome === 'VALID'
                    ? colors.success
                    : lastResult.outcome === 'ALREADY_USED'
                    ? colors.warning
                    : colors.coral
                }`,
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  bgcolor: !lastResult
                    ? colors.mutedBg
                    : lastResult.outcome === 'VALID'
                    ? colors.success
                    : lastResult.outcome === 'ALREADY_USED'
                    ? colors.warning
                    : colors.coral,
                  color: !lastResult ? colors.fg : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                {!lastResult ? (
                  <QrCodeScannerIcon sx={{ fontSize: 28 }} />
                ) : lastResult.outcome === 'VALID' ? (
                  <CheckCircleIcon sx={{ fontSize: 28 }} />
                ) : lastResult.outcome === 'ALREADY_USED' ? (
                  <WarningAmberIcon sx={{ fontSize: 28 }} />
                ) : (
                  <ReportProblemIcon sx={{ fontSize: 28 }} />
                )}

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {!lastResult
                      ? 'GATE READY FOR SCAN'
                      : lastResult.outcome === 'VALID'
                      ? 'ADMISSION GRANTED (VALID)'
                      : lastResult.outcome === 'ALREADY_USED'
                      ? 'ALREADY USED TICKET'
                      : `REJECTED: ${lastResult.outcome}`}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {!lastResult
                      ? 'Position the QR code inside the camera box or type ticket ID.'
                      : lastResult.message}
                  </Typography>
                </Box>
              </Box>

              {lastResult && (
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700 }}>
                        ATTENDEE
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: colors.fg }}>
                        {lastResult.attendee?.name || 'Unknown Name'}
                      </Typography>
                      {lastResult.attendee?.emailMasked && (
                        <Typography variant="caption" sx={{ color: colors.mutedFg, fontFamily: 'monospace' }}>
                          {lastResult.attendee.emailMasked}
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700 }}>
                        TICKET TYPE
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: colors.fg }}>
                        {lastResult.ticketType?.name || 'General Admission'}
                      </Typography>
                      {lastResult.ticketType?.priceKes !== undefined && (
                        <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                          {formatKes(lastResult.ticketType.priceKes)}
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700 }}>
                        TICKET CODE / SERIAL
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: colors.fg }}>
                        {lastResult.ticketCode || 'N/A'} {lastResult.serialNumber ? `(#${lastResult.serialNumber})` : ''}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700 }}>
                        {lastResult.outcome === 'ALREADY_USED' ? 'PREVIOUS CHECK-IN' : 'ADMITTED TIME'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: colors.fg }}>
                        {lastResult.outcome === 'ALREADY_USED' && lastResult.previousCheckInAt
                          ? new Date(lastResult.previousCheckInAt).toLocaleTimeString()
                          : lastResult.checkedInAt
                          ? new Date(lastResult.checkedInAt).toLocaleTimeString()
                          : 'Just now'}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setLastResult(null);
                      isProcessingRef.current = false;
                      setScanCooldown(false);
                    }}
                    sx={{
                      mt: 2.5,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: colors.border,
                      color: colors.fg,
                      borderRadius: '8px',
                    }}
                  >
                    Clear &amp; Scan Next
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* RECENT SCAN HISTORY AUDIT LOG */}
            <Card
              sx={{
                bgcolor: colors.cardBg,
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                p: 2.5,
                flexGrow: 1,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon sx={{ fontSize: 18, color: colors.fg }} /> RECENT SCAN LOGS
                </Typography>
                <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                  Live Audit Trail
                </Typography>
              </Box>

              {loadingStats && !stats ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <CircularProgress size={24} sx={{ color: colors.lime }} />
                </Box>
              ) : stats?.recentScans && stats.recentScans.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 380, overflowY: 'auto' }}>
                  {stats.recentScans.map((log) => {
                    const isValid = log.outcome === 'VALID';
                    const isUsed = log.outcome === 'ALREADY_USED';
                    return (
                      <Paper
                        key={log.id}
                        elevation={0}
                        sx={{
                          p: 1.2,
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          bgcolor: isValid ? 'rgba(43, 184, 90, 0.05)' : isUsed ? 'rgba(212, 168, 48, 0.05)' : 'rgba(229, 62, 62, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={log.outcome}
                            size="small"
                            sx={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              height: 20,
                              bgcolor: isValid ? colors.success : isUsed ? colors.warning : colors.coral,
                              color: '#fff',
                            }}
                          />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: colors.fg, display: 'block' }}>
                              {log.attendeeName || log.ticketCode || 'Unknown Ticket'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.mutedFg, fontSize: '0.7rem' }}>
                              {log.ticketTypeName || 'Pass'} · By {log.scannedByName}
                            </Typography>
                          </Box>
                        </Box>

                        <Typography variant="caption" sx={{ color: colors.mutedFg, fontFamily: 'monospace', fontSize: '0.72rem', flexShrink: 0 }}>
                          {new Date(log.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: colors.mutedFg, display: 'block', textAlign: 'center', py: 3 }}>
                  No tickets have been scanned for this event yet.
                </Typography>
              )}
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
