import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate, formatSaleNumber } from '@/lib/utils';
import { addHeader, addFooter, addClientInfo, cleanAndParseFloat } from '@/lib/pdfUtils';

export const generateCollectionPDF = async (collection, sale, customer, organization, user) => {
  const doc = new jsPDF();
  const title = "Recibo de Cobro";
  
  await addHeader(doc, title, organization, user);
  
  let currentY = 47;
  currentY = addClientInfo(doc, customer, currentY);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Recibo N°: ${String(collection.id).substring(0, 8).toUpperCase()}`, 14, currentY + 6);
  doc.text(`Fecha de Cobro: ${formatDate(collection.collection_date)}`, doc.internal.pageSize.width - 14, currentY + 6, { align: 'right' });
  currentY += 12;

  doc.setLineWidth(0.2);
  doc.line(14, currentY, doc.internal.pageSize.width - 14, currentY);
  currentY += 8;

  doc.setFontSize(12);
  doc.setTextColor(40,40,40);
  doc.setFont(undefined, 'bold');
  doc.text("Detalles del Cobro", 14, currentY);
  currentY += 7;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  doc.text(`Recibimos de ${customer.name} la suma de ${formatCurrency(collection.amount)}.`, 14, currentY);
  currentY += 6;
  doc.text(`En concepto de pago por la factura ${formatSaleNumber(sale)}.`, 14, currentY);
  currentY += 10;
  
  doc.setFont(undefined, 'bold');
  doc.text("Forma de Pago:", 14, currentY);
  doc.setFont(undefined, 'normal');
  doc.text(collection.method, 50, currentY);
  currentY += 10;

  if (collection.method === 'Cheque' && collection.check_details) {
      const chequeDetails = [
          ["Banco", collection.check_details.bank || 'N/A'],
          ["Número", collection.check_details.checkNumber || 'N/A'],
          ["Vencimiento", formatDate(collection.check_details.dueDate) || 'N/A'],
      ];
      doc.autoTable({
          body: chequeDetails,
          startY: currentY,
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 1 },
          columnStyles: { 0: { fontStyle: 'bold' } },
      });
      currentY = doc.lastAutoTable.finalY + 5;
  }
  
  doc.setLineWidth(0.2);
  doc.line(14, currentY, doc.internal.pageSize.width - 14, currentY);
  currentY += 8;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("Resumen de Cuenta:", 14, currentY);
  currentY += 7;
  
  const balanceDetails = [
      ["Total Factura:", formatCurrency(sale.total)],
      ["Saldo Anterior:", formatCurrency(cleanAndParseFloat(sale.balance) + cleanAndParseFloat(collection.amount))],
      ["Importe Recibido:", formatCurrency(collection.amount)],
      ["Saldo Actual:", formatCurrency(sale.balance)],
  ];
  
  doc.autoTable({
    body: balanceDetails,
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, halign: 'right' },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
    didParseCell: (data) => {
        if (data.row.index === 3 && data.column.index === 1) {
            data.cell.styles.fontStyle = 'bold';
        }
    }
  });
  
  currentY = doc.lastAutoTable.finalY + 20;
  
  doc.setLineWidth(0.3);
  doc.line(14, currentY, 80, currentY);
  doc.setFontSize(9);
  doc.text("Firma y Aclaración", 32, currentY + 5);

  addFooter(doc);
  doc.save(`Recibo_Cobro_${collection.id.substring(0, 8)}.pdf`);
};