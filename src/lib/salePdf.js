import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate, formatSaleNumber } from '@/lib/utils';
import { addHeader, addFooter, addClientInfo, cleanAndParseFloat } from '@/lib/pdfUtils';

export const generateSalePDF = async (sale, client, organization, user, saleProducts, purchaseProducts) => {
  const doc = new jsPDF();
  const title = `${sale.type} N°: ${formatSaleNumber(sale)}`;

  await addHeader(doc, title, organization, user);

  let currentY = 47;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Fecha Documento: ${formatDate(sale.sale_date)}`, 14, currentY);

  const paymentMethodsText = (sale.payment_methods && sale.payment_methods.length > 0)
    ? sale.payment_methods.map(p => p.method).join(', ')
    : 'N/A';
  doc.text(`Forma de Pago: ${paymentMethodsText}`, doc.internal.pageSize.width - 14, currentY, { align: 'right' });

  currentY += 7;
  doc.text(`Estado: ${sale.status}`, 14, currentY);
  if (sale.work_order_number) doc.text(`Orden de Trabajo: #${sale.work_order_number}`, doc.internal.pageSize.width - 14, currentY, { align: 'right' });
  currentY += 10;

  const fullClient = {
    ...client,
    name: sale.customerName || client?.name,
    taxid: sale.customerTaxId || client?.taxid,
    taxcondition: client?.taxcondition || 'N/A'
  };

  currentY = addClientInfo(doc, fullClient, currentY);

  doc.setLineWidth(0.2);
  doc.line(14, currentY - 3, doc.internal.pageSize.width - 14, currentY - 3);
  currentY += 5;

  const allProducts = [...(saleProducts || []), ...(purchaseProducts || [])];
  const serviceItems = sale.items.filter(item => {
    const product = allProducts.find(p => p.id === item.productId);
    return product?.work_hours > 0 || item.type === 'service';
  });
  const productItems = sale.items.filter(item => {
    const product = allProducts.find(p => p.id === item.productId);
    return !(product?.work_hours > 0) && item.type !== 'service';
  });

  const tableHeaders = ['Cant.', 'Descripción', 'P. Unitario', 'IVA (%)', 'Dto. (%)', 'Total'];
  const tableOptions = {
    theme: 'grid',
    headStyles: { fillColor: [63, 81, 181] },
    styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
    columnStyles: { 
      0: { cellWidth: 15 }, 1: { cellWidth: 'auto' }, 2: { halign: 'right' },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } 
    }
  };

  const mapItemsToRows = (items) => items.map(item => [
    String(Number(item.quantity) || 0),
    item.description || 'N/A',
    String(formatCurrency(cleanAndParseFloat(item.unitPrice))),
    String(`${Number(item.iva) || 0}%`),
    String(`${Number(item.discount) || 0}%`),
    String(formatCurrency(cleanAndParseFloat(item.total))),
  ]);

  if (serviceItems.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Servicios', 14, currentY);
    currentY += 6;
    doc.autoTable({
      ...tableOptions,
      head: [tableHeaders],
      body: mapItemsToRows(serviceItems),
      startY: currentY,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  if (productItems.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Productos', 14, currentY);
    currentY += 6;
    doc.autoTable({
      ...tableOptions,
      head: [tableHeaders],
      body: mapItemsToRows(productItems),
      startY: currentY,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total General: ${formatCurrency(cleanAndParseFloat(sale.total))}`, doc.internal.pageSize.width - 14, currentY, { align: 'right' });
  if (sale.status === 'Pendiente de Pago') {
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Saldo Pendiente: ${formatCurrency(cleanAndParseFloat(sale.balance))}`, doc.internal.pageSize.width - 14, currentY, { align: 'right' });
  }

  addFooter(doc);
  doc.output('dataurlnewwindow');
};