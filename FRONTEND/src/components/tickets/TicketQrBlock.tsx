import { useEffect, useState } from 'react';
import { Alert, Box, Typography, Button, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { colors } from '../../styles/theme';

interface TicketImageDetails {
  eventTitle: string;
  ticketType: string;
  holderName: string;
  date: string;
  venue: string;
  city: string;
  serialNumber: number;
  ticketId: string;
}

interface TicketQrBlockProps {
  qrPayload: string | null;
  ticketLabel: string;
  locked?: boolean;
  lockedMessage?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  ticketDetails: TicketImageDetails;
}

export default function TicketQrBlock({
  qrPayload,
  ticketLabel,
  locked = false,
  lockedMessage,
  emailVerified = false,
  phoneVerified = false,
  ticketDetails,
}: TicketQrBlockProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
        if (!cancelled) {
          setDataUrl(null);
          setDownloadError('Could not generate the ticket QR code. Please reload the page and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qrPayload, locked]);

  const handleDownload = async () => {
    if (!dataUrl) return;
    setDownloadError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1200;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is unavailable');
      }

      context.fillStyle = '#FEFDFB';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#0E1013';
      context.fillRect(0, 0, canvas.width, 300);
      context.fillStyle = '#B5E02A';
      context.font = 'bold 30px Arial';
      context.fillText('VIBE CONNECT  |  EVENT PASS', 60, 75);
      context.fillStyle = '#FFFFFF';
      context.font = 'bold 48px Arial';

      const titleWords = ticketDetails.eventTitle.split(/\s+/);
      let titleLine = '';
      let titleY = 155;
      titleWords.forEach((word) => {
        const nextLine = titleLine ? `${titleLine} ${word}` : word;
        if (context.measureText(nextLine).width > 780 && titleLine) {
          context.fillText(titleLine, 60, titleY);
          titleY += 60;
          titleLine = word;
        } else {
          titleLine = nextLine;
        }
      });
      if (titleLine) context.fillText(titleLine, 60, titleY);

      context.fillStyle = '#262220';
      context.font = 'bold 30px Arial';
      context.fillText(ticketDetails.ticketType, 60, 390);
      context.font = '24px Arial';
      context.fillText(`Ticket #${ticketDetails.serialNumber}`, 60, 440);
      context.fillText(ticketDetails.holderName, 60, 500);
      context.fillText(ticketDetails.date, 60, 545);
      context.fillText(`${ticketDetails.venue}, ${ticketDetails.city}`, 60, 590);

      const qrImage = new Image();
      qrImage.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImage.onload = () => resolve();
        qrImage.onerror = () => reject(new Error('Could not load the ticket QR code'));
      });
      context.drawImage(qrImage, 250, 640, 400, 400);
      context.fillStyle = '#5B5651';
      context.font = '20px monospace';
      context.fillText(`Ticket ID: ${ticketDetails.ticketId}`, 60, 1120);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${ticketLabel.replace(/\s+/g, '-').toLowerCase()}-ticket.png`;
      link.click();
    } catch {
      setDownloadError('Could not download the ticket image. Please try again or use Download PDF.');
    }
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
          {lockedMessage || 'Ticket unavailable'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
          {!emailVerified && (
            <Button component={Link} to="/verify-email" size="small" variant="contained" sx={{ bgcolor: colors.lime, color: colors.limeFg, fontSize: '0.68rem', fontWeight: 800 }}>
              VERIFY EMAIL
            </Button>
          )}
          {!phoneVerified && (
            <Button component={Link} to="/profile" size="small" variant="outlined" sx={{ fontSize: '0.68rem', fontWeight: 800 }}>
              VERIFY PHONE NUMBER
            </Button>
          )}
        </Box>
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
          Download image
        </Button>
      )}
      {downloadError && (
        <Alert severity="error" sx={{ maxWidth: 220, py: 0, fontSize: '0.7rem' }}>
          {downloadError}
        </Alert>
      )}
    </Box>
  );
}
