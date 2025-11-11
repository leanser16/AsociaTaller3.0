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
import { formatDate, formatCurrency, formatPurchaseNumber } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PurchaseDetailDialog = ({ isOpen, onOpenChange, purchase, supplier, statusConfig }) => {
  if (!purchase) return null;

  const currentStatusConfig = statusConfig[purchase.status] || { color: 'bg-gray-500' };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glassmorphism">
        <DialogHeader>
          <DialogTitle className="text-primary">Detalles de {purchase.document_type}</DialogTitle>
          <DialogDescription>
            {formatPurchaseNumber(purchase)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1 pr-3">
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong className="text-muted-foreground">Proveedor:</strong> {supplier?.name || 'N/A'}</p>
                <p><strong className="text-muted-foreground">CUIT:</strong> {supplier?.cuit || 'N/A'}</p>
              </div>
              <div>
                <p><strong className="text-muted-foreground">Fecha:</strong> {formatDate(purchase.purchase_date)}</p>
                <p><strong className="text-muted-foreground">Vencimiento:</strong> {formatDate(purchase.due_date)}</p>
                <p><strong className="text-muted-foreground">Estado:</strong> <Badge className={`${currentStatusConfig.color} text-white`}>{purchase.status}</Badge></p>
              </div>
            </div>

            {purchase.items && purchase.items.length > 0 && (
              <div>
                <strong className="text-muted-foreground block mb-2">Items</strong>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchase.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
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
                <p>{purchase.payment_type}</p>
                 {purchase.payment_methods && purchase.payment_methods.length > 0 && (
                   <ul className="text-sm list-disc pl-5 mt-1">
                      {purchase.payment_methods.map((pm, index) => (
                          <li key={index}>{pm.method}: {formatCurrency(pm.amount)}</li>
                      ))}
                   </ul>
                )}
              </div>
              <div className="text-right space-y-1">
                <p><span className="text-muted-foreground">Subtotal:</span> {formatCurrency(purchase.subtotal)}</p>
                <p><span className="text-muted-foreground">IVA (21%):</span> {formatCurrency(purchase.iva_amount)}</p>
                <p className="text-lg font-bold"><span className="text-muted-foreground">Total:</span> {formatCurrency(purchase.total)}</p>
                <p className="text-base font-semibold text-destructive"><span className="text-muted-foreground">Saldo:</span> {formatCurrency(purchase.balance)}</p>
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

export default PurchaseDetailDialog;