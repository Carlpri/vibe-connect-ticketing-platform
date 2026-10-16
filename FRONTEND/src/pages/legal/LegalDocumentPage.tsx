import { Link as RouterLink, Navigate, useLocation } from 'react-router-dom';
import { Box, Container, Typography, Link, Breadcrumbs } from '@mui/material';
import PageMeta from '../../components/common/PageMeta';
import { LEGAL_DOCUMENTS, type LegalDocId } from './legalContent';
import { colors } from '../../styles/theme';

const PATH_TO_DOC: Record<string, LegalDocId> = {
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/organizer-agreement': 'organizer-agreement',
};

export default function LegalDocumentPage() {
  const { pathname } = useLocation();
  const docId = PATH_TO_DOC[pathname];
  if (!docId) {
    return <Navigate to="/" replace />;
  }

  const doc = LEGAL_DOCUMENTS[docId];

  return (
    <Box sx={{ bgcolor: colors.bg, py: { xs: 5, md: 8 }, minHeight: '70vh' }}>
      <PageMeta
        title={doc.title}
        description={`${doc.title} for VIBE-CONNECT — Kenyan event discovery and digital ticketing.`}
        path={doc.path}
      />
      <Container maxWidth="md">
        <Breadcrumbs sx={{ mb: 3, '& a': { color: colors.mutedFg, textDecoration: 'none' } }}>
          <Link component={RouterLink} to="/">
            Home
          </Link>
          <Typography color="text.primary">{doc.title}</Typography>
        </Breadcrumbs>

        <Typography
          component="h1"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            textTransform: 'uppercase',
            mb: 1,
            color: colors.fg,
          }}
        >
          {doc.title}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 4 }}>
          Last updated: {doc.updated}
        </Typography>

        {doc.sections.map((section) => (
          <Box key={section.heading} sx={{ mb: 3.5 }}>
            <Typography
              component="h2"
              sx={{
                fontWeight: 800,
                fontSize: '1.05rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                mb: 1,
                color: colors.fg,
              }}
            >
              {section.heading}
            </Typography>
            <Typography variant="body1" sx={{ color: colors.mutedFg, lineHeight: 1.7 }}>
              {section.body}
            </Typography>
          </Box>
        ))}
      </Container>
    </Box>
  );
}
