import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString + 'T00:00:00'); // Assume local timezone
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Fecha inválida';
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy HH:mm", { locale: es });
  } catch (error) {
    console.error("Error formatting datetime:", dateString, error);
    return 'Fecha inválida';
  }
}

export function formatCurrency(value, currency = 'ARS') {
  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    return '$ 0,00';
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function formatSaleNumber(sale) {
  if (!sale || !sale.sale_number_parts) return 'N/A';
  const { letter, pointOfSale, number } = sale.sale_number_parts;
  return `${letter}-${String(pointOfSale).padStart(4, '0')}-${String(number).padStart(8, '0')}`;
}

export function formatPurchaseNumber(purchase) {
  if (!purchase || !purchase.document_number_parts) return 'N/A';
  const { letter, pointOfSale, number } = purchase.document_number_parts;
  return `${letter}-${String(pointOfSale).padStart(4, '0')}-${String(number).padStart(8, '0')}`;
}

export function getDaysUntilDue(dueDateString) {
  if (!dueDateString) return null;
  const dueDate = new Date(dueDateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}