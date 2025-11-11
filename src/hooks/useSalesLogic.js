import { useCallback } from 'react';
import { formatSaleNumber } from '@/lib/utils';

export const useSalesLogic = ({ sales, customers, addData, updateData, deleteData, toast }) => {

  const getNextNumberForType = useCallback((type, pointOfSale = '0001') => {
    const relevantSales = sales.filter(s =>
      s.type === type &&
      s.sale_number_parts &&
      s.sale_number_parts.pointOfSale === pointOfSale
    );

    const maxNumber = relevantSales.reduce((max, s) => {
      const num = parseInt(s.sale_number_parts.number, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    return String(maxNumber + 1).padStart(8, '0');
  }, [sales]);

  const handleSaveSale = useCallback(async (saleData, currentSale) => {
    try {
      let { vehicleName, ...saleToSave } = { ...saleData };

      if (currentSale?.id) { // Editing existing sale
        await updateData('sales', currentSale.id, saleToSave);
        toast({ title: "Documento Actualizado", description: `El documento ${formatSaleNumber(saleToSave)} ha sido actualizado.` });
      } else { // Creating new sale
        if (saleToSave.sale_number_parts.number === '00000001' || !saleToSave.sale_number_parts.number) {
          saleToSave.sale_number_parts.number = getNextNumberForType(saleToSave.type, saleToSave.sale_number_parts.pointOfSale);
        }
        
        const newSale = await addData('sales', saleToSave);
        
        if (saleToSave.work_order_id) {
          await updateData('work_orders', saleToSave.work_order_id, { sale_id: newSale.id });
        }

        toast({ title: "Documento Creado", description: `El documento ${formatSaleNumber(saleToSave)} ha sido creado.` });
      }
    } catch (error) {
      toast({ title: "Error", description: `Error al guardar el documento: ${error.message}`, variant: "destructive" });
    }
  }, [updateData, addData, toast, getNextNumberForType]);

  const handleDeleteSale = useCallback(async (saleId) => {
    if (!saleId) return;
    try {
      const saleToDelete = sales.find(s => s.id === saleId);
      if (saleToDelete?.work_order_id) {
        await updateData('work_orders', saleToDelete.work_order_id, { sale_id: null });
      }
      await deleteData('sales', saleId);
      toast({ title: "Documento Eliminado", description: "El documento de venta ha sido eliminado.", variant: "destructive" });
    } catch (error) {
      toast({ title: "Error", description: `Error al eliminar el documento: ${error.message}`, variant: "destructive" });
    }
  }, [sales, deleteData, updateData, toast]);

  const handleConvertToInvoice = useCallback(async (presupuesto) => {
    try {
      const newInvoiceNumber = getNextNumberForType('Factura', presupuesto.sale_number_parts.pointOfSale);
      const newInvoice = {
        ...presupuesto,
        type: 'Factura',
        status: 'Pendiente de Pago',
        sale_number_parts: {
          ...presupuesto.sale_number_parts,
          number: newInvoiceNumber,
        },
        payment_type: 'Cuenta Corriente',
        balance: presupuesto.total,
      };
      delete newInvoice.id;

      await addData('sales', newInvoice);
      await updateData('sales', presupuesto.id, { status: 'Facturado' });

      toast({ title: "Presupuesto Facturado", description: `Se ha creado la factura ${formatSaleNumber(newInvoice)}.` });
    } catch (error) {
      toast({ title: "Error", description: `Error al facturar: ${error.message}`, variant: "destructive" });
    }
  }, [getNextNumberForType, addData, updateData, toast]);

  const handleApprovePresupuesto = useCallback(async (id) => {
    try {
      await updateData('sales', id, { status: 'Aprobado' });
      toast({ title: "Presupuesto Aprobado", description: "El presupuesto ha sido marcado como aprobado." });
    } catch (error) {
      toast({ title: "Error", description: `Error al aprobar: ${error.message}`, variant: "destructive" });
    }
  }, [updateData, toast]);

  const handleRejectPresupuesto = useCallback(async (id) => {
    try {
      await updateData('sales', id, { status: 'Rechazado' });
      toast({ title: "Presupuesto Rechazado", description: "El presupuesto ha sido marcado como rechazado." });
    } catch (error) {
      toast({ title: "Error", description: `Error al rechazar: ${error.message}`, variant: "destructive" });
    }
  }, [updateData, toast]);

  return {
    handleSaveSale,
    handleDeleteSale,
    handleConvertToInvoice,
    handleApprovePresupuesto,
    handleRejectPresupuesto,
  };
};