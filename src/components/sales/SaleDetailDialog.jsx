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
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency, formatSaleNumber } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SaleDetailDialog = ({ isOpen, onOpenChange, sale, customer, statusConfig }) => {
  if (!sale) return null;

  const currentStatusConfig = statusConfig[sale.status] || { color: 'bg-gray-500' };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glassmorphism">
        <DialogHeader>
          <DialogTitle className="text-primary">Detalles de {sale.type}</DialogTitle>
          <DialogDescription>
            {formatSaleNumber(sale)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1 pr-3">
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong className="text-muted-foreground">Cliente:</strong> {customer?.name || 'N/A'}</p>
                <p><strong className="text-muted-foreground">CUIT/DNI:</strong> {customer?.taxid || 'N/A'}</p>
                <p><strong className="text-muted-foreground">Dirección:</strong> {customer?.address || 'N/A'}</p>
              </div>
              <div>
                <p><strong className="text-muted-foreground">Fecha:</strong> {formatDate(sale.sale_date)}</p>
                <p><strong className="text-muted-foreground">Vencimiento:</strong> {formatDate(sale.due_date)}</p>
                <p><strong className="text-muted-foreground">Estado:</strong> <Badge className={`${currentStatusConfig.color} text-white`}>{sale.status}</Badge></p>
              </div>
            </div>

            {sale.items && sale.items.length > 0 && (
              <div>
                <strong className="text-muted-foreground block mb-2">Items</strong>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">P. Unitario</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sale.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <strong className="text-muted-foreground">Forma de Pago:</strong>
                <p>{sale.payment_type}</p>
                {sale.payment_methods && sale.payment_methods.length > 0 && (
                   <ul className="text-sm list-disc pl-5 mt-1">
                      {sale.payment_methods.map((pm, index) => (
                          <li key={index}>{pm.method}: {formatCurrency(pm.amount)}</li>
                      ))}
                   </ul>
                )}
              </div>
              <div className="text-right space-y-1">
                <p><span className="text-muted-foreground">Subtotal:</span> {formatCurrency(sale.subtotal)}</p>
                <p><span className="text-muted-foreground">IVA (21%):</span> {formatCurrency(sale.iva_amount)}</p>
                <p className="text-lg font-bold"><span className="text-muted-foreground">Total:</span> {formatCurrency(sale.total)}</p>
                <p className="text-base font-semibold text-destructive"><span className="text-muted-foreground">Saldo:</span> {formatCurrency(sale.balance)}</p>
              </div>
            </div>

          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailDialog;