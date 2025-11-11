import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Edit, Trash2, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useData } from '@/contexts/DataContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import WorkOrderFormDialog from '@/components/workorders/WorkOrderFormDialog';
import WorkOrderDetailDialog from '@/components/workorders/WorkOrderDetailDialog';
import CustomerForm from '@/components/forms/CustomerForm';
import VehicleForm from '@/components/forms/VehicleForm';
import ProductForm from '@/components/forms/ProductForm';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from 'react-router-dom';


const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const statusConfig = {
  'Ingresado': 'bg-blue-500',
  'En Proceso': 'bg-yellow-500',
  'Finalizado': 'bg-green-500',
  'Cancelado': 'bg-red-500',
};

const WorkOrdersPage = () => {
  const { data, addData, updateData, deleteData, loading, organization } = useData();
  const { work_orders = [], customers = [], vehicles = [], sales = [] } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormType, setProductFormType] = useState('Venta');
  const [activeTab, setActiveTab] = useState('en-proceso');
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'order_number', direction: 'desc' });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');
    if (highlightId) {
      const orderToHighlight = work_orders.find(wo => wo.id === highlightId);
      if (orderToHighlight) {
        setActiveTab(orderToHighlight.status === 'Finalizado' ? 'finalizadas' : 'en-proceso');
        setHighlightedRow(highlightId);
        const timer = setTimeout(() => setHighlightedRow(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [location.search, work_orders]);

  const ordersWithDetails = useMemo(() => {
    if (!work_orders || !customers || !vehicles) return [];
    return work_orders.map(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      const vehicle = vehicles.find(v => v.id === order.vehicle_id);
      const linkedSale = sales.find(s => s.id === order.sale_id);
      return {
        ...order,
        customerName: customer ? customer.name : 'N/A',
        vehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'N/A',
        linkedSaleId: linkedSale?.id,
      };
    });
  }, [work_orders, customers, vehicles, sales]);

  const sortedAndFilteredOrders = useMemo(() => {
    let filtered = ordersWithDetails.filter(order =>
      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.vehicleInfo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      String(order.order_number).includes(searchTerm)
    );

    return filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [ordersWithDetails, searchTerm, sortConfig]);

  const inProcessOrders = useMemo(() =>
    sortedAndFilteredOrders.filter(order => order.status !== 'Finalizado'),
    [sortedAndFilteredOrders]
  );

  const finishedOrders = useMemo(() =>
    sortedAndFilteredOrders.filter(order => order.status === 'Finalizado'),
    [sortedAndFilteredOrders]
  );

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSaveOrder = async (orderData) => {
    try {
      if (currentOrder) {
        await updateData('work_orders', currentOrder.id, orderData);
        toast({ title: "Orden Actualizada", description: `La orden de trabajo ha sido actualizada.` });
      } else {
        const lastOrderNumber = work_orders.reduce((max, wo) => Math.max(max, wo.order_number || 0), 0);
        const newOrderData = { ...orderData, order_number: lastOrderNumber + 1, status: 'Ingresado' };
        await addData('work_orders', newOrderData);
        toast({ title: "Orden Creada", description: `La orden de trabajo ha sido creada.` });
      }
      setIsFormOpen(false);
      setCurrentOrder(null);
    } catch (error) {
      toast({ title: "Error", description: `Error al guardar la orden: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      await addData('customers', customerData);
      toast({ title: "Cliente Creado", description: "El nuevo cliente ha sido agregado." });
      setIsCustomerFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: `Error al guardar el cliente: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveVehicle = async (vehicleData) => {
    try {
      const dataToSave = {
        ...vehicleData,
        year: parseInt(vehicleData.year, 10) || null
      };
      await addData('vehicles', dataToSave);
      toast({ title: "Vehículo Creado", description: "El nuevo vehículo ha sido agregado." });
      setIsVehicleFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: `Error al guardar el vehículo: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      const table = productFormType === 'Venta' ? 'sale_products' : 'purchase_products';
      let dataToSave;

      if (productFormType === 'Venta') {
        dataToSave = {
            name: productData.name,
            description: productData.description,
            category: productData.category,
            work_hours: parseFloat(productData.work_hours) || 0,
            price: parseFloat(productData.price) || 0,
        };
      } else { // Compra
        dataToSave = {
            name: productData.name,
            description: productData.description,
            category: productData.category,
            cost: parseFloat(productData.cost) || 0,
        };
      }

      await addData(table, dataToSave);
      toast({ title: "Producto Creado", description: `El nuevo producto/servicio ha sido agregado.` });
      setIsProductFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: `Error al guardar el producto: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateData('work_orders', id, { status: newStatus });
      toast({ title: "Estado Actualizado", description: "El estado de la orden ha sido actualizado." });
    } catch (error) {
      toast({ title: "Error", description: `Error al actualizar el estado: ${error.message}`, variant: "destructive" });
    }
  };

  const openForm = (order = null) => {
    setCurrentOrder(order);
    setIsFormOpen(true);
  };

  const openDetail = (order) => {
    setCurrentOrder(order);
    setIsDetailOpen(true);
  };

  const openProductForm = (type) => {
    setProductFormType(type);
    setIsProductFormOpen(true);
  }

  const confirmDelete = (order) => {
    if (order.sale_id) {
      toast({
        variant: "destructive",
        title: "Acción Bloqueada",
        description: "No se puede eliminar esta Orden de Trabajo porque tiene un Documento de Venta asociado. Por favor, elimine primero el documento de venta.",
      });
      return;
    }
    setOrderToDelete(order.id);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await deleteData('work_orders', orderToDelete);
      toast({ title: "Orden Eliminada", description: "La orden de trabajo ha sido eliminada.", variant: "destructive" });
    } catch (error) {
      toast({ title: "Error", description: `Error al eliminar la orden: ${error.message}`, variant: "destructive" });
    } finally {
      setOrderToDelete(null);
    }
  };

  const handleGenerateSale = (order) => {
    const separator = '---DATA---';
    const separatorIndex = (order.notes || '').indexOf(separator);
    let extraData = {};
    if (separatorIndex !== -1) {
        const dataString = order.notes.substring(separatorIndex + separator.length);
        try { extraData = JSON.parse(dataString); } catch (e) { console.error("Error parsing notes:", e); }
    }

    const serviceItems = extraData.service_items || [];
    const productItems = extraData.product_items || [];

    const saleItems = [...serviceItems, ...productItems].map(item => ({
        productId: item.productId,
        description: item.details || item.description,
        quantity: item.quantity,
        unitPrice: parseFloat(String(item.price).replace(',', '.')) || 0,
        iva: item.vat,
        discount: item.discount,
        calculationMode: item.calculationMode || 'net',
    }));

    const orderForSale = {
        ...order,
        items: saleItems,
    };

    navigate('/sales', { state: { fromWorkOrder: orderForSale } });
  };

  const handleViewSale = (saleId) => {
    navigate('/sales', { state: { openSaleId: saleId } });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando órdenes de trabajo...</div>;
  }

  const renderHeader = (key, title) => {
    const getSortIndicator = (k) => {
        if (sortConfig.key !== k) return null;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    };
    return (
        <TableHead onClick={() => handleSort(key)} className="cursor-pointer hover:bg-muted/50">
            {title} {getSortIndicator(key)}
        </TableHead>
    );
  };

  const renderTable = (orders) => (
    <div className="rounded-lg border overflow-hidden glassmorphism">
      <Table>
        <TableHeader>
          <TableRow>
            {renderHeader('order_number', 'N° Orden')}
            {renderHeader('customerName', 'Cliente')}
            {renderHeader('vehicleInfo', 'Vehículo')}
            {renderHeader('creation_date', 'Fecha Ingreso')}
            {renderHeader('status', 'Estado')}
            {renderHeader('final_cost', 'Costo Final')}
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length > 0 ? (
            orders.map((order) => {
              const isBilled = !!order.sale_id;
              const rowClass = isBilled 
                ? 'bg-green-100/50 dark:bg-green-900/30' 
                : (highlightedRow === order.id ? 'bg-primary/20' : '');

              return (
                <TableRow key={order.id} className={rowClass}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.vehicleInfo}</TableCell>
                  <TableCell>{formatDate(order.creation_date)}</TableCell>
                  <TableCell>
                    <Select value={order.status} onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)} disabled={isBilled}>
                        <SelectTrigger className="w-[140px] border-none !bg-transparent p-0 focus:ring-0 disabled:opacity-100 disabled:cursor-not-allowed">
                            <SelectValue>
                                <Badge className={`${statusConfig[order.status]} hover:${statusConfig[order.status]} text-white`}>
                                    {order.status}
                                </Badge>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(statusConfig).map(status => (
                            <SelectItem key={status} value={status}>
                                {status}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{formatCurrency(order.final_cost || 0)}</TableCell>
                  <TableCell className="text-right">
                    <div className='flex items-center justify-end space-x-2'>
                      {order.status === 'Finalizado' && !isBilled && (
                        <Button variant='outline' size='icon' onClick={() => handleGenerateSale(order)} title="Facturar Orden">
                          <FileText className='h-4 w-4 text-green-600' />
                        </Button>
                      )}
                      {isBilled && (
                        <Button variant='outline' size='icon' onClick={() => handleViewSale(order.sale_id)} title="Ver Documento de Venta">
                          <Eye className='h-4 w-4 text-blue-600' />
                        </Button>
                      )}
                      <Button variant='outline' size='icon' onClick={() => openDetail(order)} title="Ver Detalle">
                        <Eye className='h-4 w-4' />
                      </Button>
                      <Button variant='outline' size='icon' onClick={() => openForm(order)} title={isBilled ? "Facturada - No se puede editar" : "Editar Orden"} disabled={isBilled}>
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button variant='destructive' size='icon' onClick={() => confirmDelete(order)} title={isBilled ? "Facturada - No se puede eliminar" : "Eliminar Orden"} disabled={isBilled}>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan="7" className="h-24 text-center">
                No hay órdenes de trabajo para mostrar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Órdenes de Trabajo</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button onClick={() => openForm()} className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white w-full md:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" /> Nueva Orden
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <Input
          placeholder="Buscar por cliente, vehículo o N° de orden..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="en-proceso">En Proceso ({inProcessOrders.length})</TabsTrigger>
            <TabsTrigger value="finalizadas">Finalizadas ({finishedOrders.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
        <TabsContent value="en-proceso" className="flex-grow">
          {renderTable(inProcessOrders)}
        </TabsContent>
        <TabsContent value="finalizadas" className="flex-grow">
          {renderTable(finishedOrders)}
        </TabsContent>
      </Tabs>

      <WorkOrderFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        workOrder={currentOrder}
        onSave={handleSaveOrder}
        onQuickAddCustomer={() => setIsCustomerFormOpen(true)}
        onQuickAddVehicle={() => setIsVehicleFormOpen(true)}
        onQuickAddProduct={openProductForm}
      />

      <WorkOrderDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        workOrder={currentOrder}
        organization={organization}
        statusColors={statusConfig}
      />

      <Dialog open={isCustomerFormOpen} onOpenChange={setIsCustomerFormOpen}>
        <DialogContent className="sm:max-w-2xl glassmorphism">
          <DialogHeader><DialogTitle className="text-primary">Nuevo Cliente Rápido</DialogTitle></DialogHeader>
          <CustomerForm onSave={handleSaveCustomer} onCancel={() => setIsCustomerFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isVehicleFormOpen} onOpenChange={setIsVehicleFormOpen}>
        <DialogContent className="sm:max-w-lg glassmorphism">
          <DialogHeader><DialogTitle className="text-primary">Nuevo Vehículo Rápido</DialogTitle></DialogHeader>
          <VehicleForm customers={customers} onSave={handleSaveVehicle} onCancel={() => setIsVehicleFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo {productFormType === 'Venta' ? 'Servicio' : 'Producto'}</DialogTitle></DialogHeader>
          <ProductForm onSave={handleSaveProduct} onCancel={() => setIsProductFormOpen(false)} productType={productFormType} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la orden de trabajo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default WorkOrdersPage;