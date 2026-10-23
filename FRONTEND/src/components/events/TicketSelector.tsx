import { Box, Paper, Typography, IconButton, Button, Divider, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import type { TicketType } from '../../types';
import { formatKes } from '../../utils/format';
import { colors } from '../../styles/theme';

interface TicketSelectorProps {
  ticketTypes: TicketType[];
  quantities: Record<string, number>;
  onQuantityChange: (ticketTypeId: string, newQty: number) => void;
  onProceedToCheckout: () => void;
  hasVerifiedContact?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export default function TicketSelector({
  ticketTypes,
  quantities,
  onQuantityChange,
  onProceedToCheckout,
  hasVerifiedContact = true,
  emailVerified = false,
  phoneVerified = false,
}: TicketSelectorProps) {
  const totalCount = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const totalKes = ticketTypes.reduce((sum, ticket) => {
    const qty = quantities[ticket.id] || 0;
    return sum + ticket.priceKes * qty;
  }, 0);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: '8px',
        bgcolor: '#FEFDFB',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <ConfirmationNumberIcon sx={{ color: colors.limeFg }} />
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '1.15rem',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: colors.fg,
          }}
        >
          Select Tickets
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {ticketTypes.map((ticket) => {
          const qty = quantities[ticket.id] || 0;
          const isSoldOut = ticket.available <= 0;

          return (
            <Box
              key={ticket.id}
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: qty > 0 ? 'rgba(181, 224, 42, 0.12)' : '#F7F4EE',
                border: `1px solid ${qty > 0 ? colors.lime : colors.border}`,
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                    {ticket.name}
                  </Typography>
                  {ticket.description && (
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: colors.mutedFg, mt: 0.3 }}>
                      {ticket.description}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: isSoldOut ? colors.coral : colors.success,
                      fontWeight: 700,
                      display: 'block',
                      mt: 0.5,
                    }}
                  >
                    {isSoldOut ? 'SOLD OUT' : `${ticket.available} REMAINING`}
                  </Typography>
                </Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: '"Archivo Black", sans-serif',
                    fontSize: '1.05rem',
                    color: ticket.priceKes === 0 ? colors.success : colors.fg,
                  }}
                >
                  {ticket.priceKes === 0 ? 'FREE' : formatKes(ticket.priceKes)}
                </Typography>
              </Box>

              {/* Quantity controller */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
                <IconButton
                  size="small"
                  disabled={qty <= 0}
                  onClick={() => onQuantityChange(ticket.id, qty - 1)}
                  sx={{
                    bgcolor: '#FEFDFB',
                    border: `1px solid ${colors.border}`,
                    color: colors.fg,
                    borderRadius: '6px',
                    p: 0.6,
                    '&:hover': { bgcolor: colors.mutedBg },
                    '&.Mui-disabled': { opacity: 0.4 },
                  }}
                >
                  <RemoveIcon sx={{ fontSize: 16 }} />
                </IconButton>

                <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: colors.fg }}>
                  {qty}
                </Typography>

                <IconButton
                  size="small"
                  disabled={isSoldOut || qty >= Math.min(ticket.available, 10)}
                  onClick={() => onQuantityChange(ticket.id, qty + 1)}
                  sx={{
                    bgcolor: colors.lime,
                    color: colors.limeFg,
                    borderRadius: '6px',
                    p: 0.6,
                    '&:hover': { bgcolor: colors.limeLt },
                    '&.Mui-disabled': { opacity: 0.4, bgcolor: colors.mutedBg },
                  }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ my: 2.5, borderColor: colors.border }} />

      {/* Summary */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.mutedFg }}>
          Total ({totalCount} {totalCount === 1 ? 'ticket' : 'tickets'}):
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '1.3rem',
            color: colors.fg,
          }}
        >
          {formatKes(totalKes)}
        </Typography>
      </Box>

      {!hasVerifiedContact && totalCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Verify your email or phone number before purchasing tickets.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {!emailVerified && (
              <Button component={Link} to="/verify-email" size="small" variant="contained">
                VERIFY EMAIL
              </Button>
            )}
            {!phoneVerified && (
              <Button component={Link} to="/profile" size="small" variant="outlined">
                VERIFY PHONE NUMBER
              </Button>
            )}
          </Box>
        </Alert>
      )}

      <Button
        fullWidth
        variant="contained"
        disabled={totalCount === 0}
        onClick={onProceedToCheckout}
        sx={{
          py: 1.4,
          bgcolor: colors.lime,
          color: colors.limeFg,
          fontWeight: 800,
          fontSize: '0.92rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          borderRadius: '8px',
          '&:hover': { bgcolor: colors.limeLt },
          '&.Mui-disabled': { bgcolor: colors.mutedBg, color: colors.mutedFg },
        }}
      >
        {totalCount === 0 ? 'Select Tickets' : totalKes === 0 ? 'Reserve Free Spot' : 'Get Tickets'}
      </Button>
    </Paper>
  );
}
