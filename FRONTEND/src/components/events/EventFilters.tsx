import { Box, Button, Select, MenuItem, FormControl } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CategoryIcon from '@mui/icons-material/Category';
import PaymentsIcon from '@mui/icons-material/Payments';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '../../styles/theme';

const CATEGORIES = [
  'All Categories',
  'Music',
  'Parties',
  'Festivals',
  'Campus',
  'Comedy',
  'Sports',
  'Fashion',
  'Networking',
];

const LOCATIONS = [
  'All Locations',
  'Nairobi',
  'Mombasa',
  'Kilifi',
  'Kisumu',
  'Nakuru',
];

const DATES = [
  'Any Date',
  'Today',
  'This Weekend',
  'This Month',
];

const PRICES = [
  'Any Price',
  'Free',
  'Under KES 500',
  'KES 500–1,000',
  'Over KES 1,000',
];

interface EventFiltersProps {
  selectedDate: string;
  onDateChange: (val: string) => void;
  selectedLocation: string;
  onLocationChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedPrice: string;
  onPriceChange: (val: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export default function EventFilters({
  selectedDate,
  onDateChange,
  selectedLocation,
  onLocationChange,
  selectedCategory,
  onCategoryChange,
  selectedPrice,
  onPriceChange,
  onClear,
  hasActiveFilters,
}: EventFiltersProps) {
  const isSelected = (val: string, defaultVal: string) => val && val !== defaultVal;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
      {/* 1. Date Dropdown */}
      <FormControl size="small">
        <Select
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          displayEmpty
          startAdornment={<CalendarMonthIcon sx={{ fontSize: 18, mr: 0.8, color: isSelected(selectedDate, 'Any Date') ? colors.limeFg : colors.mutedFg }} />}
          sx={{
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            bgcolor: isSelected(selectedDate, 'Any Date') ? colors.lime : '#FEFDFB',
            color: isSelected(selectedDate, 'Any Date') ? colors.limeFg : colors.fg,
            border: `1px solid ${isSelected(selectedDate, 'Any Date') ? colors.lime : colors.border}`,
            '& .MuiSelect-select': { py: 1, pr: 3 },
            '& fieldset': { border: 'none' },
          }}
        >
          {DATES.map((d) => (
            <MenuItem key={d} value={d} sx={{ fontSize: '0.86rem', fontWeight: 600 }}>
              {d}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 2. Location Dropdown */}
      <FormControl size="small">
        <Select
          value={selectedLocation}
          onChange={(e) => onLocationChange(e.target.value)}
          displayEmpty
          startAdornment={<LocationOnIcon sx={{ fontSize: 18, mr: 0.8, color: isSelected(selectedLocation, 'All Locations') ? colors.limeFg : colors.mutedFg }} />}
          sx={{
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            bgcolor: isSelected(selectedLocation, 'All Locations') ? colors.lime : '#FEFDFB',
            color: isSelected(selectedLocation, 'All Locations') ? colors.limeFg : colors.fg,
            border: `1px solid ${isSelected(selectedLocation, 'All Locations') ? colors.lime : colors.border}`,
            '& .MuiSelect-select': { py: 1, pr: 3 },
            '& fieldset': { border: 'none' },
          }}
        >
          {LOCATIONS.map((loc) => (
            <MenuItem key={loc} value={loc} sx={{ fontSize: '0.86rem', fontWeight: 600 }}>
              {loc}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 3. Category Dropdown */}
      <FormControl size="small">
        <Select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          displayEmpty
          startAdornment={<CategoryIcon sx={{ fontSize: 18, mr: 0.8, color: isSelected(selectedCategory, 'All Categories') ? colors.limeFg : colors.mutedFg }} />}
          sx={{
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            bgcolor: isSelected(selectedCategory, 'All Categories') ? colors.lime : '#FEFDFB',
            color: isSelected(selectedCategory, 'All Categories') ? colors.limeFg : colors.fg,
            border: `1px solid ${isSelected(selectedCategory, 'All Categories') ? colors.lime : colors.border}`,
            '& .MuiSelect-select': { py: 1, pr: 3 },
            '& fieldset': { border: 'none' },
          }}
        >
          {CATEGORIES.map((cat) => (
            <MenuItem key={cat} value={cat} sx={{ fontSize: '0.86rem', fontWeight: 600 }}>
              {cat}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 4. Price Dropdown */}
      <FormControl size="small">
        <Select
          value={selectedPrice}
          onChange={(e) => onPriceChange(e.target.value)}
          displayEmpty
          startAdornment={<PaymentsIcon sx={{ fontSize: 18, mr: 0.8, color: isSelected(selectedPrice, 'Any Price') ? colors.limeFg : colors.mutedFg }} />}
          sx={{
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            bgcolor: isSelected(selectedPrice, 'Any Price') ? colors.lime : '#FEFDFB',
            color: isSelected(selectedPrice, 'Any Price') ? colors.limeFg : colors.fg,
            border: `1px solid ${isSelected(selectedPrice, 'Any Price') ? colors.lime : colors.border}`,
            '& .MuiSelect-select': { py: 1, pr: 3 },
            '& fieldset': { border: 'none' },
          }}
        >
          {PRICES.map((p) => (
            <MenuItem key={p} value={p} sx={{ fontSize: '0.86rem', fontWeight: 600 }}>
              {p}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Clear Action */}
      {hasActiveFilters && (
        <Button
          onClick={onClear}
          size="small"
          startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
          sx={{
            color: colors.coral,
            fontWeight: 700,
            fontSize: '0.82rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            ml: { xs: 0, sm: 'auto' },
            '&:hover': { bgcolor: 'rgba(232, 80, 58, 0.08)' },
          }}
        >
          Clear Filters
        </Button>
      )}
    </Box>
  );
}
