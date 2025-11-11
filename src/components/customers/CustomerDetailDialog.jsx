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

const CustomerDetailDialog = ({ isOpen, onOpenChange, customer }) => {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glassmorphism">
        <DialogHeader>
          <DialogTitle className="text-primary">Detalles del Cliente</DialogTitle>
          <DialogDescription>
            Información completa de {customer.name}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1 pr-3">
          <div className="py-4 space-y-4 text-sm">
            <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground">Datos Personales</h4>
                <p><strong className="w-28 inline-block">Nombre:</strong> {customer.name}</p>
                <p><strong className="w-28 inline-block">Email:</strong> {customer.email || 'N/A'}</p>
                <p><strong className="w-28 inline-block">Teléfono:</strong> {customer.phone || 'N/A'}</p>
                <p><strong className="w-28 inline-block">Dirección:</strong> {customer.address || 'N/A'}</p>
                <p><strong className="w-28 inline-block">Ciudad:</strong> {customer.city || 'N/A'}</p>
                <p><strong className="w-28 inline-block">Cód. Postal:</strong> {customer.postalcode || 'N/A'}</p>
                <p><strong className="w-28 inline-block">Contacto:</strong> {customer.contact_person || 'N/A'}</p>
            </div>
            <div className="space-y-2 pt-4 border-t">
                <h4 className="font-semibold text-muted-foreground">Datos Fiscales</h4>
                <p><strong className="w-28 inline-block">CUIT/DNI:</strong> {customer.taxid || 'N/A'}</p>
                <p><strong className="w-28 inline-block">Cond. IVA:</strong> {customer.taxcondition || 'N/A'}</p>
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

export default CustomerDetailDialog;