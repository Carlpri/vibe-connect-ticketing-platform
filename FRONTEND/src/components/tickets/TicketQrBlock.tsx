import { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import QRCode from 'qrcode';
import { colors } from '../../styles/theme';

interface TicketQrBlockProps {
  qrPayload: string | null;
  ticketLabel: string;
  locked?: boolean;
  lockedMessage?: string;
}

export default function TicketQrBlock({
  qrPayload,
  ticketLabel,
  locked = false,
  lockedMessage,
}: TicketQrBlockProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!qrPayload || locked) {
      setDataUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qrPayload, locked]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${ticketLabel.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.click();
  };

  if (locked) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: '8px',
          bgcolor: '#0E1013',
          minWidth: 160,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 120,
            height: 120,
            mx: 'auto',
            borderRadius: '4px',
            border: `2px dashed ${colors.border}`,
            display: 'grid',
            placeItems: 'center',
            color: colors.mutedFg,
            fontSize: '0.7rem',
            fontWeight: 700,
            px: 1,
          }}
        >
          QR LOCKED
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: colors.lime, fontWeight: 700 }}>
          {lockedMessage || 'Verify email & phone to unlock'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '8px',
        bgcolor: '#0E1013',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          bgcolor: colors.qrBg,
          p: 1,
          borderRadius: '4px',
          minWidth: 132,
          minHeight: 132,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {loading && <CircularProgress size={32} sx={{ color: colors.lime }} />}
        {!loading && dataUrl && (
          <Box component="img" src={dataUrl} alt="Ticket QR code" sx={{ width: 120, height: 120, display: 'block' }} />
        )}
      </Box>
      <Typography variant="caption" sx={{ fontSize: '0.62rem', fontFamily: 'monospace', color: colors.lime, fontWeight: 700 }}>
        GATE SCAN READY
      </Typography>
      {dataUrl && (
        <Button
          size="small"
          startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
          onClick={handleDownload}
          sx={{
            color: colors.inkFg,
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        >
          Download QR
        </Button>
      )}
    </Box>
  );
}
