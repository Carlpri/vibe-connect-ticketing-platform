import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { DigitalTicketPass } from '../services/ticketService';
import { formatDate } from './format';

/**
 * Generates a high-resolution QR code data URL for a given ticket.
 */
export async function getTicketQrDataUrl(qrPayload: string | null): Promise<string | null> {
  if (!qrPayload) return null;
  try {
    return await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  } catch (err) {
    console.error('Failed to generate QR data URL for PDF', err);
    return null;
  }
}

/**
 * Appends a formatted ticket pass page to a jsPDF instance.
 */
export async function addTicketPage(
  doc: jsPDF,
  ticket: DigitalTicketPass,
  isFirstPage: boolean = true
): Promise<void> {
  if (!isFirstPage) {
    doc.addPage();
  }

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // Outer border / pass container
  doc.setDrawColor(209, 203, 195);
  doc.setLineWidth(0.5);
  doc.setFillColor(254, 253, 251);
  doc.roundedRect(margin, margin, contentWidth, 260, 4, 4, 'FD');

  // Header banner (dark)
  doc.setFillColor(14, 16, 19);
  doc.roundedRect(margin, margin, contentWidth, 48, 4, 4, 'F');
  // Fill the bottom corners of header so it sits flush
  doc.rect(margin, margin + 40, contentWidth, 8, 'F');

  // Lime accent strip
  doc.setFillColor(181, 224, 42); // #B5E02A
  doc.rect(margin, margin + 48, contentWidth, 2.5, 'F');

  // Header text: Brand
  doc.setTextColor(181, 224, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VIBE CONNECT  |  OFFICIAL EVENT PASS', margin + 8, margin + 12);

  // Status badge
  const statusText = ticket.status === 'CHECKED_IN' ? 'ADMITTED' : ticket.status === 'VOID' ? 'VOID' : 'VALID PASS';
  doc.setFontSize(9);
  doc.setTextColor(14, 16, 19);
  doc.setFillColor(181, 224, 42);
  doc.roundedRect(pageWidth - margin - 35, margin + 6, 28, 7, 2, 2, 'F');
  doc.text(statusText, pageWidth - margin - 21, margin + 11, { align: 'center' });

  // Event title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const splitTitle = doc.splitTextToSize(ticket.event.title.toUpperCase(), contentWidth - 16);
  doc.text(splitTitle, margin + 8, margin + 25);

  // Serial number
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text(`PASS #${ticket.serialNumber}  •  ORDER #${ticket.orderId.slice(0, 8).toUpperCase()}`, margin + 8, margin + 43);

  // Event & Admission details section
  let currentY = margin + 58;

  doc.setTextColor(38, 34, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(ticket.ticketType.name.toUpperCase(), margin + 8, currentY);

  currentY += 8;
  doc.setFontSize(10);
  doc.setTextColor(91, 86, 81);
  doc.setFont('helvetica', 'normal');
  doc.text(`Price: KES ${ticket.ticketType.priceKes.toLocaleString()}`, margin + 8, currentY);

  currentY += 8;
  // Date & Venue grid
  doc.setDrawColor(225, 220, 215);
  doc.line(margin + 8, currentY, pageWidth - margin - 8, currentY);

  currentY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 80, 50); // Coral
  doc.text('DATE & TIME', margin + 8, currentY);
  doc.text('LOCATION & VENUE', margin + 95, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(formatDate(ticket.event.startsAt), margin + 8, currentY);
  doc.text(`${ticket.event.venue}, ${ticket.event.city}`, margin + 95, currentY);

  currentY += 8;
  doc.line(margin + 8, currentY, pageWidth - margin - 8, currentY);

  currentY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 80, 50);
  doc.text('TICKET HOLDER', margin + 8, currentY);
  doc.text('PAYMENT REFERENCE', margin + 95, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(ticket.holderName || ticket.holderEmail || 'Attendee', margin + 8, currentY);
  doc.text(ticket.paymentRef || 'CONFIRMED', margin + 95, currentY);

  // QR Code Box
  currentY += 12;
  const qrBoxY = currentY;
  const qrBoxHeight = 88;

  doc.setFillColor(245, 243, 239);
  doc.setDrawColor(209, 203, 195);
  doc.roundedRect(margin + 12, qrBoxY, contentWidth - 24, qrBoxHeight, 3, 3, 'FD');

  const qrDataUrl = await getTicketQrDataUrl(ticket.qrPayload);

  if (qrDataUrl && ticket.qrPayload) {
    const qrSize = 65;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrBoxY + 5, qrSize, qrSize);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(14, 16, 19);
    doc.text('GATE SCAN READY', pageWidth / 2, qrBoxY + 75, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(91, 86, 81);
    doc.text(`Ticket ID: ${ticket.id}`, pageWidth / 2, qrBoxY + 81, { align: 'center' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 80, 50);
    doc.text('CONTACT VERIFICATION REQUIRED', pageWidth / 2, qrBoxY + 38, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(91, 86, 81);
    doc.text('Please verify your email or phone on vibe-connect.co.ke', pageWidth / 2, qrBoxY + 46, { align: 'center' });
    doc.text('to reveal your entry QR code before arrival at the gate.', pageWidth / 2, qrBoxY + 52, { align: 'center' });
  }

  // Gate & Entry Instructions
  const instY = qrBoxY + qrBoxHeight + 8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(225, 220, 215);
  doc.roundedRect(margin + 8, instY, contentWidth - 16, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(14, 16, 19);
  doc.text('IMPORTANT GATE & ADMISSION INSTRUCTIONS', margin + 12, instY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(91, 86, 81);
  doc.text('• Present this digital pass on your smartphone or print on paper for admission.', margin + 12, instY + 12);
  doc.text('• Each QR pass admits one attendee and is permanently invalidated once scanned.', margin + 12, instY + 17);
  doc.text('• Do not share or publish your QR code publicly to prevent unauthorized entry.', margin + 12, instY + 22);
  doc.text('• Valid national ID or student identification may be requested at venue security.', margin + 12, instY + 27);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 135, 130);
  doc.text('Vibe-Connect Ticketing Platform  •  www.vibe-connect.co.ke  •  Secure Entry System', pageWidth / 2, margin + 255, { align: 'center' });
}

/**
 * Downloads a single ticket pass as a PDF.
 */
export async function downloadTicketPdf(ticket: DigitalTicketPass): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await addTicketPage(doc, ticket, true);

  const cleanTitle = ticket.event.title.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
  doc.save(`vibe-connect-ticket-${ticket.serialNumber}-${cleanTitle}.pdf`);
}

/**
 * Downloads all tickets for an order in a single multi-page PDF.
 */
export async function downloadAllTicketsPdf(tickets: DigitalTicketPass[], orderId: string): Promise<void> {
  if (!tickets || tickets.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < tickets.length; i++) {
    await addTicketPage(doc, tickets[i], i === 0);
  }

  const shortOrderId = orderId.slice(0, 8);
  doc.save(`vibe-connect-tickets-order-${shortOrderId}.pdf`);
}
