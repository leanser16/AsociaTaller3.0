import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SaleForm from '@/components/sales/SaleForm';
import CustomerForm from '@/components/forms/CustomerForm';
import VehicleForm from '@/components/forms/VehicleForm';
import SalesHeader from '@/components/sales/SalesHeader';
import SalesTable from '@/components/sales/SalesTable';
import { generateSalePDF, generateAccountSummaryPDF } from '@/lib/pdfGenerator';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatSaleNumber } from '@/lib/utils';
import AccountSummaryDialog from '@/components/collections/AccountSummaryDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSalesLogic } from '@/hooks/useSalesLogic';
import ProductForm from '@/components/forms/ProductForm';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkOrderDetailDialog from '@/components/workorders/WorkOrderDetailDialog';
import SaleDetailDialog from '@/components/sales/SaleDetailDialog';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const statusConfig = {
  'Pendiente': { color: 'bg-yellow-500', icon: 'Clock' },
  'Aprobado': { color: 'bg-blue-500', icon: 'CheckCircle' },
  'Rechazado': { color: 'bg-red-700', icon: 'XCircle' },
  'Facturado': { color: 'bg-cyan-500', icon: 'FileText' },
  'Pendiente de Pago': { color: 'bg-orange-500', icon: 'Clock' },
  'Pagado': { color: 'bg-green-500', icon: 'CheckCircle' },
  'Anulada': { color: 'bg-red-500', icon: 'XCircle' },
};

const workOrderStatusColors = {
  'Ingresado': 'bg-blue-500',
  'En Proceso': 'bg-yellow-500',
  'Finalizado': 'bg-green-500',
  'Cancelado': 'bg-red-500',
};

const paymentMethods = ["Efectivo", "Transferencia", "Tarjeta de Crédito", "Tarjeta de Débito", "Cheque", "Dolares"];

const SalesPage = () => {
  const { data, addData, updateData, deleteData, loading } = useData();
  const { user, organization } = useAuth();
  const { sales = [], customers = [], vehicles = [], sale_products: saleProducts = [], purchase_products: purchaseProducts = [], work_orders = [] } = data;
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    handleDeleteSale,
    handleConvertToInvoice,
    handleApprovePresupuesto,
    handleRejectPresupuesto,
    handleSaveSale: logicHandleSaveSale,
  } = useSalesLogic({ sales, customers, addData, updateData, deleteData, toast });

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormType, setProductFormType] = useState('Venta');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [currentSale, setCurrentSale] = useState(null);
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [isWorkOrderDetailOpen, setIsWorkOrderDetailOpen] = useState(false);
  const [currentWorkOrder, setCurrentWorkOrder] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'sale_date', direction: 'desc' });

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

    return maxNumber + 1;
  }, [sales]);

  useEffect(() => {
    const state = location.state;
    if (state) {
      if (state.fromWorkOrder) {
        const workOrder = state.fromWorkOrder;
        const nextNumber = getNextNumberForType('Factura');
        
        const newSaleFromWO = {
          isNew: true,
          type: 'Factura',
          sale_number_parts: {
            letter: 'A',
            pointOfSale: '0001',
            number: String(nextNumber).padStart(8, '0')
          },
          customer_id: workOrder.customer_id,
          vehicle_id: workOrder.vehicle_id,
          work_order_id: workOrder.id,
          items: workOrder.items.map(item => ({
            ...item,
            unitPrice: String(item.unitPrice || '0').replace('.', ',')
          })),
          sale_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
        };
        
        setCurrentSale(newSaleFromWO);
        setIsFormOpen(true);
      } else if (state.openSaleId) {
        const saleToOpen = sales.find(s => s.id === state.openSaleId);
        if (saleToOpen) {
          setCurrentSale(saleToOpen);
          setIsFormOpen(true);
        }
      }
      
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, getNextNumberForType, sales]);

  const salesWithDetails = useMemo(() => {
    if (!sales || !customers || !work_orders) return [];
    return sales.map(sale => {
      const customer = customers.find(c => c.id === sale.customer_id);
      const workOrder = work_orders.find(wo => wo.id === sale.work_order_id);
      let status = sale.status;
      if ((sale.type === 'Factura' || sale.type === 'Recibo') && sale.status !== 'Anulada') {
        status = parseFloat(sale.balance) <= 0.009 ? 'Pagado' : 'Pendiente de Pago';
      }
      return {
        ...sale,
        status,
        customerName: customer ? customer.name : 'Cliente Eliminado',
        work_order_number: workOrder ? workOrder.order_number : null,
      };
    });
  }, [sales, customers, work_orders]);

  const sortedAndFilteredSales = useMemo(() => {
    let filtered = salesWithDetails.filter(sale => {
        const typeMatch = filterType === 'Todos' || sale.type === filterType;
        const statusMatch = filterStatus === 'Todos' || sale.status === filterStatus;
        const searchMatch = (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          formatSaleNumber(sale).toLowerCase().includes(searchTerm.toLowerCase());
        return typeMatch && statusMatch && searchMatch;
    });

    return filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [salesWithDetails, searchTerm, filterType, filterStatus, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSaveSale = async (saleData) => {
    await logicHandleSaveSale(saleData, currentSale);
    setIsFormOpen(false);
    setCurrentSale(null);
  };
  
  const openDetail = (sale) => {
    setCurrentSale(sale);
    setIsDetailOpen(true);
  };

  const openForm = (sale = null) => {
    if (sale) {
      setCurrentSale(sale);
    } else {
      const nextNumber = getNextNumberForType('Factura');
      const newSaleTemplate = {
        isNew: true,
        type: 'Factura',
        sale_number_parts: {
          letter: 'A',
          pointOfSale: '0001',
          number: String(nextNumber).padStart(8, '0')
        }
      };
      setCurrentSale(newSaleTemplate);
    }
    setIsFormOpen(true);
  };

  const confirmDelete = (id) => {
    setSaleToDelete(id);
  };

  const handlePrintSale = (sale) => {
    const customer = customers.find(c => c.id === sale.customer_id);
    generateSalePDF(sale, customer, organization, user, saleProducts, purchaseProducts);
    toast({ title: "PDF Generado", description: `Se ha generado el PDF para ${sale.type} ${formatSaleNumber(sale)}.` });
  };

  const handleSaveQuickCustomer = async (customerData) => {
    try {
      await addData('customers', customerData);
      toast({ title: "Cliente Creado", description: `El cliente ${customerData.name} ha sido creado.` });
      setIsCustomerFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: `Error al crear cliente: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveQuickVehicle = async (vehicleData) => {
    try {
      const dataToSave = {
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: parseInt(vehicleData.year),
        plate: vehicleData.plate,
        vin: vehicleData.chassisNumber,
        customer_id: vehicleData.customer_id,
      };
      await addData('vehicles', dataToSave);
      toast({ title: "Vehículo Creado", description: `El vehículo ${vehicleData.plate} ha sido creado.` });
      setIsVehicleFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: `Error al crear vehículo: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveQuickProduct = async (productData) => {
    try {
      const table = productFormType === 'Venta' ? 'sale_products' : 'purchase_products';
      let dataToSave;
      if (productFormType === 'Venta') {
        dataToSave = { name: productData.name, description: productData.description, category: productData.category, price: parseFloat(productData.price) || 0, work_hours: parseFloat(productData.work_hours) || 0 };
      } else {
        dataToSave = { name: productData.name, description: productData.description, category: productData.category, cost: parseFloat(productData.cost) || 0 };
      }
      await addData(table, dataToSave);
      toast({ title: "Producto Creado", description: `El producto ${productData.name} ha sido creado.` });
      setIsProductFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: `Error al crear producto: ${error.message}`, variant: "destructive" });
    }
  };

  const openQuickProductForm = (type) => {
    setProductFormType(type);
    setIsProductFormOpen(true);
  };

  const handleGenerateSummary = (customerId, summaryType) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      toast({ title: "Error", description: "Cliente no encontrado.", variant: "destructive" });
      return;
    }

    let documentsToSummarize = [];
    if (summaryType === 'all') {
      documentsToSummarize = sales.filter(s => s.customer_id === customerId);
    } else {
      documentsToSummarize = sales.filter(s => s.customer_id === customerId && s.status === 'Pendiente de Pago' && s.balance > 0);
    }

    if (documentsToSummarize.length > 0) {
      generateAccountSummaryPDF(customer, documentsToSummarize, 'customer', summaryType, organization, user);
      toast({ title: "Resumen Generado", description: `Se ha generado el resumen de cuenta para ${customer.name}.` });
      setIsSummaryOpen(false);
    } else {
      toast({ title: "Sin Documentos", description: "El cliente seleccionado no tiene documentos para este tipo de resumen.", variant: "destructive" });
    }
  };

  const handleNavigateToWorkOrder = (workOrderId) => {
    const workOrder = work_orders.find(wo => wo.id === workOrderId);
    if (workOrder) {
      const customer = customers.find(c => c.id === workOrder.customer_id);
      const vehicle = vehicles.find(v => v.id === workOrder.vehicle_id);
      setCurrentWorkOrder({
        ...workOrder,
        customerName: customer ? customer.name : 'N/A',
        vehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'N/A',
      });
      setIsWorkOrderDetailOpen(true);
    } else {
      toast({ title: "Error", description: "Orden de trabajo no encontrada.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xl">Cargando ventas...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Gestión de Ventas</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button onClick={() => setIsSummaryOpen(true)} variant="outline" className="w-full md:w-auto">
            <FileText className="mr-2 h-5 w-5" /> Generar Resumen
          </Button>
          <Button onClick={() => openForm()} className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white w-full md:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" /> Nuevo Documento
          </Button>
        </div>
      </div>

      <SalesHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        statusConfig={statusConfig}
      />

      <SalesTable
        sales={sortedAndFilteredSales}
        statusConfig={statusConfig}
        onApprove={handleApprovePresupuesto}
        onReject={handleRejectPresupuesto}
        onConvertToInvoice={handleConvertToInvoice}
        onEdit={openForm}
        onDelete={confirmDelete}
        onPrint={handlePrintSale}
        onNavigateToWorkOrder={handleNavigateToWorkOrder}
        onSort={handleSort}
        onViewDetail={openDetail}
        sortConfig={sortConfig}
      />

      <SaleDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        sale={currentSale}
        customer={customers.find(c => c.id === currentSale?.customer_id)}
        statusConfig={statusConfig}
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) setCurrentSale(null); setIsFormOpen(isOpen); }}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col glassmorphism">
          <DialogHeader>
            <DialogTitle className="text-primary">{currentSale?.isNew ? 'Nuevo Documento de Venta' : `Editar ${currentSale?.type}`}</DialogTitle>
            <DialogDescription>
              {currentSale?.isNew ? 'Ingresa los detalles del nuevo documento.' : 'Modifica los detalles del documento.'}
            </DialogDescription>
          </DialogHeader>
          <SaleForm
            sale={currentSale}
            onSave={handleSaveSale}
            onCancel={() => { setIsFormOpen(false); setCurrentSale(null); }}
            onQuickAddCustomer={() => setIsCustomerFormOpen(true)}
            onQuickAddVehicle={() => setIsVehicleFormOpen(true)}
            onQuickAddProduct={openQuickProductForm}
            statusConfig={statusConfig}
            paymentMethods={paymentMethods}
            toast={toast}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomerFormOpen} onOpenChange={setIsCustomerFormOpen}>
        <DialogContent className="sm:max-w-2xl glassmorphism">
          <DialogHeader>
            <DialogTitle className="text-primary">Nuevo Cliente Rápido</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo cliente.</DialogDescription>
          </DialogHeader>
          <CustomerForm
            onSave={handleSaveQuickCustomer}
            onCancel={() => setIsCustomerFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isVehicleFormOpen} onOpenChange={setIsVehicleFormOpen}>
        <DialogContent className="sm:max-w-lg glassmorphism">
          <DialogHeader>
            <DialogTitle className="text-primary">Nuevo Vehículo Rápido</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo vehículo.</DialogDescription>
          </DialogHeader>
          <VehicleForm
            customers={customers}
            onSave={handleSaveQuickVehicle}
            onCancel={() => setIsVehicleFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo {productFormType === 'Venta' ? 'Servicio' : 'Producto'}</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo item.</DialogDescription>
          </DialogHeader>
          <ProductForm
            onSave={handleSaveQuickProduct}
            onCancel={() => setIsProductFormOpen(false)}
            productType={productFormType}
          />
        </DialogContent>
      </Dialog>

      <AccountSummaryDialog
        isOpen={isSummaryOpen}
        onOpenChange={setIsSummaryOpen}
        customers={customers}
        sales={sales}
        onGenerate={handleGenerateSummary}
        entityType="customer"
        summaryType="all"
      />

      <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el documento de venta y todos los cheques asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteSale(saleToDelete)} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkOrderDetailDialog
        isOpen={isWorkOrderDetailOpen}
        onOpenChange={setIsWorkOrderDetailOpen}
        workOrder={currentWorkOrder}
        statusColors={workOrderStatusColors}
      />

    </motion.div>
  );
};

export default SalesPage;