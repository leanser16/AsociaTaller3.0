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

const VehicleDetailDialog = ({ isOpen, onOpenChange, vehicle }) => {
  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glassmorphism">
        <DialogHeader>
          <DialogTitle className="text-primary">Detalles del Vehículo</DialogTitle>
          <DialogDescription>
            Información completa de {vehicle.brand} {vehicle.model} ({vehicle.plate})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1 pr-3">
          <div className="py-4 space-y-4 text-sm">
            <p><strong className="w-28 inline-block">Cliente:</strong> {vehicle.customerName}</p>
            <p><strong className="w-28 inline-block">Marca:</strong> {vehicle.brand}</p>
            <p><strong className="w-28 inline-block">Modelo:</strong> {vehicle.model}</p>
            <p><strong className="w-28 inline-block">Año:</strong> {vehicle.year || 'N/A'}</p>
            <p><strong className="w-28 inline-block">Patente:</strong> {vehicle.plate}</p>
            <p><strong className="w-28 inline-block">N° Chasis:</strong> {vehicle.vin || 'N/A'}</p>
            <p><strong className="w-28 inline-block">Color:</strong> {vehicle.color || 'N/A'}</p>
            <p><strong className="w-28 inline-block">Tipo:</strong> {vehicle.vehicleType || 'N/A'}</p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailDialog;