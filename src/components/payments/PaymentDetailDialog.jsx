import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, formatCurrency } from '@/lib/utils';

const PaymentDetailDialog = ({ isOpen, onOpenChange, payment }) => {
  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glassmorphism">
        <DialogHeader>
          <DialogTitle className="text-primary">Detalles del Pago</DialogTitle>
          <DialogDescription>
            Pago realizado el {formatDate(payment.payment_date)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1 pr-3">
          <div className="py-4 space-y-3 text-sm">
            <p><strong className="text-muted-foreground">Proveedor:</strong> {payment.supplierName}</p>
            <p><strong className="text-muted-foreground">Compra Afectada:</strong> {payment.purchaseFormattedNumber}</p>
            <p className="text-lg font-bold"><strong className="text-muted-foreground">Monto:</strong> {formatCurrency(payment.amount)}</p>
            <p><strong className="text-muted-foreground">Método de Pago:</strong> {payment.method}</p>
            
            {payment.method === 'Cheque' && payment.check_details && (
              <div className="p-3 border rounded-md mt-2 bg-muted/30">
                <h4 className="font-semibold mb-1">Detalles del Cheque</h4>
                <p><strong className="text-muted-foreground">N°:</strong> {payment.check_details.checkNumber}</p>
                <p><strong className="text-muted-foreground">Banco:</strong> {payment.check_details.bank}</p>
                <p><strong className="text-muted-foreground">Vencimiento:</strong> {formatDate(payment.check_details.dueDate)}</p>
              </div>
            )}
            
            {payment.method === 'Transferencia' && payment.transfer_details && (
              <div className="p-3 border rounded-md mt-2 bg-muted/30">
                <h4 className="font-semibold mb-1">Detalles de Transferencia</h4>
                <p><strong className="text-muted-foreground">Ref:</strong> {payment.transfer_details.reference}</p>
              </div>
            )}

            {payment.isVirtual && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">Este es un registro de un pago de contado y no puede ser modificado individualmente.</p>
            )}

          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailDialog;