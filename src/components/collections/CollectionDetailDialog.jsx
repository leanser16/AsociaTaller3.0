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
import { Printer } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateCollectionPDF } from '@/lib/pdfGenerator';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CollectionDetailDialog = ({ isOpen, onOpenChange, collection, sale, customer }) => {
  const { toast } = useToast();
  const { organization, user } = useAuth();
  
  if (!collection) return null;

  const handlePrint = () => {
    if (!collection || !sale || !customer || !organization) {
      toast({
        title: "Error de Impresión",
        description: "Faltan datos para generar el recibo. Asegúrese de que el cobro, la venta y el cliente estén disponibles.",
        variant: "destructive",
      });
      return;
    }
    generateCollectionPDF(collection, sale, customer, organization, user);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glassmorphism">
        <DialogHeader>
          <DialogTitle className="text-primary">Detalles del Cobro</DialogTitle>
          <DialogDescription>
            Cobro realizado el {formatDate(collection.collection_date)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1 pr-3">
          <div className="py-4 space-y-3 text-sm">
            <p><strong className="text-muted-foreground">Cliente:</strong> {collection.customerName}</p>
            <p><strong className="text-muted-foreground">Venta Afectada:</strong> {collection.saleFormattedNumber}</p>
            <p className="text-lg font-bold"><strong className="text-muted-foreground">Monto:</strong> {formatCurrency(collection.amount)}</p>
            <p><strong className="text-muted-foreground">Método de Pago:</strong> {collection.method}</p>
            
            {collection.method === 'Cheque' && collection.check_details && (
              <div className="p-3 border rounded-md mt-2 bg-muted/30">
                <h4 className="font-semibold mb-1">Detalles del Cheque</h4>
                <p><strong className="text-muted-foreground">N°:</strong> {collection.check_details.checkNumber}</p>
                <p><strong className="text-muted-foreground">Banco:</strong> {collection.check_details.bank}</p>
                <p><strong className="text-muted-foreground">Vencimiento:</strong> {formatDate(collection.check_details.dueDate)}</p>
              </div>
            )}
            
            {collection.method === 'Transferencia' && collection.transfer_details && (
              <div className="p-3 border rounded-md mt-2 bg-muted/30">
                <h4 className="font-semibold mb-1">Detalles de Transferencia</h4>
                <p><strong className="text-muted-foreground">Ref:</strong> {collection.transfer_details.reference}</p>
              </div>
            )}

            {collection.method === 'Dolares' && collection.dollardetails && (
              <div className="p-3 border rounded-md mt-2 bg-muted/30">
                <h4 className="font-semibold mb-1">Detalles Dólares</h4>
                <p><strong className="text-muted-foreground">Cotización:</strong> {formatCurrency(collection.dollardetails.exchangeRate)}</p>
              </div>
            )}
            
            {collection.isVirtual && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">Este es un registro de un pago de contado y no puede ser modificado individualmente.</p>
            )}

          </div>
        </ScrollArea>
        <DialogFooter className="justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionDetailDialog;