import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import SaleFormHeader from '@/components/sales/SaleFormHeader';
import SaleFormItems from '@/components/sales/SaleFormItems';
import SaleFormPayment from '@/components/sales/SaleFormPayment';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getLocalDate } from '@/lib/utils';

const letterOptions = {
    Factura: ['A', 'B', 'C'],
    Presupuesto: ['P'],
    Recibo: ['R'],
    Remito: ['R'],
    default: ['X']
};

const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const SaleForm = ({ sale, onSave, onCancel, onQuickAddCustomer, onQuickAddVehicle, onQuickAddProduct, statusConfig, paymentMethods }) => {
    const { data } = useData();
    const { customers, vehicles, sale_products: saleProducts, purchase_products: purchaseProducts } = data;
    const { organization } = useAuth();
    const workPriceHour = organization?.work_price_hour || 0;
    const saleDocumentNumberMode = organization?.sale_document_number_mode || 'automatic';

    const getInitialIva = (type) => (type === 'Recibo' ? 0 : 21);

    const getInitialItem = (type, itemType) => ({
        id: Math.random().toString(36).substr(2, 9),
        productId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        iva: getInitialIva(type),
        discount: 0,
        calculationMode: 'net',
        total: 0,
        type: itemType,
    });

    const getInitialPaymentMethods = (saleData) => {
        if (saleData && saleData.payment_methods && saleData.payment_methods.length > 0) {
            return saleData.payment_methods;
        }
        return [{ method: 'Efectivo', amount: 0, checkDetails: null, dollarDetails: null }];
    };

    const getInitialFormData = (sale) => {
        const type = sale?.type || 'Factura';
        return {
            sale_date: sale?.sale_date || getLocalDate(),
            due_date: sale?.due_date || getLocalDate(),
            customer_id: sale?.customer_id || null,
            vehicle_id: sale?.vehicle_id || null,
            work_order_id: sale?.work_order_id || null,
            type: type,
            payment_type: sale?.payment_type || (type === 'Presupuesto' ? 'N/A' : 'Contado'),
            status: sale?.status || '',
            sale_number_parts: sale?.sale_number_parts || {
                letter: letterOptions[type]?.[0] || 'X',
                pointOfSale: '0001',
                number: '00000001'
            }
        };
    };

    const [formData, setFormData] = useState(getInitialFormData(sale));
    const [serviceItems, setServiceItems] = useState([]);
    const [productItems, setProductItems] = useState([]);
    const [payments, setPayments] = useState(() => getInitialPaymentMethods(sale));
    const [isFormValid, setIsFormValid] = useState(false);

    const calculateItem = (item) => {
        const quantity = parseNumber(item.quantity);
        const iva = parseNumber(item.iva);
        const discount = parseNumber(item.discount);
        let newUnitPrice = parseNumber(item.unitPrice);
        let newTotal = parseNumber(item.total);

        if (item.calculationMode === 'net') {
            const priceAfterDiscount = newUnitPrice * (1 - discount / 100);
            newTotal = priceAfterDiscount * quantity * (1 + iva / 100);
        } else { // calculationMode === 'total'
            if (quantity > 0) {
                const totalBeforeVat = newTotal / (1 + iva / 100);
                const priceBeforeDiscount = totalBeforeVat / quantity;
                newUnitPrice = (discount > 0 && discount < 100) ? priceBeforeDiscount / (1 - discount / 100) : priceBeforeDiscount;
            }
        }

        return {
            ...item,
            unitPrice: newUnitPrice,
            total: newTotal,
        };
    };

    const populateItems = useCallback((saleData) => {
        const items = saleData?.items || [];
        const type = saleData?.type || 'Factura';
        
        const allSaleProducts = [...(saleProducts || []), ...(purchaseProducts || [])];

        const processItem = (item) => {
            const baseItem = getInitialItem(type, item.type);
            const populatedItem = { ...baseItem, ...item };
            return calculateItem(populatedItem);
        };

        const services = items
            .filter(item => {
                const product = allSaleProducts.find(p => p.id === item.productId);
                return product?.work_hours > 0 || item.type === 'service';
            })
            .map(processItem);

        const products = items
            .filter(item => {
                const product = allSaleProducts.find(p => p.id === item.productId);
                return !(product?.work_hours > 0) && item.type !== 'service';
            })
            .map(processItem);

        setServiceItems(services.length > 0 ? services : []);
        setProductItems(products.length > 0 ? products : []);
    }, [saleProducts, purchaseProducts]);

    useEffect(() => {
        if (sale) {
            setFormData(getInitialFormData(sale));
            populateItems(sale);
            setPayments(getInitialPaymentMethods(sale));
        } else {
            setServiceItems([]);
            setProductItems([]);
        }
    }, [sale, populateItems]);

    const handleFormDataChange = useCallback((name, value) => {
        setFormData(prev => {
            const newFormData = { ...prev, [name]: value };
            if (name === 'type') {
                const newLetterOptions = letterOptions[value] || letterOptions.default;
                newFormData.sale_number_parts = { ...newFormData.sale_number_parts, letter: newLetterOptions[0] };
                const newIva = getInitialIva(value);
                setServiceItems(items => items.map(item => calculateItem({ ...item, iva: newIva })));
                setProductItems(items => items.map(item => calculateItem({ ...item, iva: newIva })));
            }
            if (name === 'customer_id') {
                newFormData.vehicle_id = null;
            }
            return newFormData;
        });
    }, []);

    const handleItemChange = useCallback((type, index, updatedItem) => {
        const setItems = type === 'service' ? setServiceItems : setProductItems;
        const allProducts = type === 'service' ? saleProducts : purchaseProducts;

        setItems(prev => {
            const newItems = [...prev];
            let item = { ...newItems[index], ...updatedItem };

            if (updatedItem.productId && !updatedItem.description) {
                const product = allProducts.find(p => p.id === updatedItem.productId);
                if (product) {
                    const basePrice = (product.work_hours || 0) * workPriceHour > 0 
                        ? (product.work_hours || 0) * workPriceHour 
                        : (product.price || product.cost || 0);
                    
                    item.description = product.name;
                    item.unitPrice = basePrice;
                }
            }
            
            newItems[index] = calculateItem(item);
            return newItems;
        });
    }, [workPriceHour, saleProducts, purchaseProducts]);

    const addItem = useCallback((type) => {
        const newItem = getInitialItem(formData.type, type);
        const setItems = type === 'service' ? setServiceItems : setProductItems;
        setItems(prev => [...prev, newItem]);
    }, [formData.type]);

    const removeItem = useCallback((type, index) => {
        const setItems = type === 'service' ? setServiceItems : setProductItems;
        setItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const calculateGrandTotal = useCallback(() => {
        const allItems = [...serviceItems, ...productItems];
        return allItems.reduce((sum, item) => sum + parseNumber(item.total), 0);
    }, [serviceItems, productItems]);

    const calculateTotalPaid = useCallback(() => {
        return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    }, [payments]);

    useEffect(() => {
        const grandTotal = calculateGrandTotal();
        const totalPaid = calculateTotalPaid();
        const difference = totalPaid - grandTotal;

        let formIsValid = true;
        if (!formData.customer_id) formIsValid = false;
        if (formData.payment_type === 'Contado' && Math.abs(difference) > 0.01) formIsValid = false;
        if ([...serviceItems, ...productItems].length === 0) formIsValid = false;

        setIsFormValid(formIsValid);
    }, [formData.customer_id, formData.payment_type, payments, serviceItems, productItems, calculateGrandTotal, calculateTotalPaid]);

    const handlePaymentChange = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;
        setPayments(newPayments);
    };

    const addPaymentMethod = () => {
        setPayments([...payments, { method: 'Efectivo', amount: 0, checkDetails: null, dollarDetails: null }]);
    };

    const removePaymentMethod = (index) => {
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const grandTotal = calculateGrandTotal();
        const allItems = [...serviceItems, ...productItems];

        const saleDataToSave = {
            ...formData,
            items: allItems.map(item => {
                const { id, ...rest } = item;
                return {
                    ...rest,
                    quantity: parseNumber(item.quantity),
                    unitPrice: parseNumber(item.unitPrice),
                    iva: parseNumber(item.iva),
                    discount: parseNumber(item.discount),
                    total: parseNumber(item.total),
                };
            }),
            total: grandTotal,
            payment_methods: payments,
            sale_number: `${formData.sale_number_parts.letter}-${formData.sale_number_parts.pointOfSale}-${formData.sale_number_parts.number}`,
        };

        if (sale?.id) {
            saleDataToSave.status = formData.status;
        } else {
            if (saleDataToSave.type === 'Presupuesto') saleDataToSave.status = 'Pendiente';
            else if (saleDataToSave.payment_type === 'Contado') saleDataToSave.status = 'Pagado';
            else saleDataToSave.status = 'Pendiente de Pago';
        }

        saleDataToSave.balance = saleDataToSave.status === 'Pagado' ? 0 : grandTotal;
        onSave(saleDataToSave);
    };

    const getAvailableStatuses = () => {
        if (formData.type === 'Presupuesto') return ['Pendiente', 'Aceptado', 'Rechazado', 'Facturado'];
        if (formData.type === 'Factura' || formData.type === 'Recibo') return ['Pendiente de Pago', 'Pagado', 'Anulada'];
        return Object.keys(statusConfig);
    };

    const grandTotal = calculateGrandTotal();
    const totalPaid = calculateTotalPaid();

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <SaleFormHeader
                formData={formData}
                onFormDataChange={handleFormDataChange}
                customers={customers || []}
                onQuickAddCustomer={onQuickAddCustomer}
                vehicles={vehicles || []}
                onQuickAddVehicle={onQuickAddVehicle}
                getAvailableStatuses={getAvailableStatuses}
                saleDocumentNumberMode={saleDocumentNumberMode}
            />

            <SaleFormItems
                serviceItems={serviceItems}
                productItems={productItems}
                handleItemChange={handleItemChange}
                removeItem={removeItem}
                addItem={addItem}
                saleProducts={saleProducts || []}
                purchaseProducts={purchaseProducts || []}
                onQuickAddProduct={onQuickAddProduct}
            />

            <SaleFormPayment
                formData={formData}
                onFormDataChange={handleFormDataChange}
                grandTotal={grandTotal}
                totalPaid={totalPaid}
                payments={payments}
                paymentMethods={paymentMethods}
                handlePaymentChange={handlePaymentChange}
                addPaymentMethod={addPaymentMethod}
                removePaymentMethod={removePaymentMethod}
            />

            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={!isFormValid}>{sale?.isNew ? 'Crear Documento' : 'Guardar Cambios'}</Button>
            </DialogFooter>
        </form>
    );
};

export default SaleForm;