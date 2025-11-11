import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import SaleItemRow from '@/components/sales/SaleItemRow';

const SaleFormItems = ({ serviceItems, productItems, handleItemChange, removeItem, addItem, saleProducts, purchaseProducts, onQuickAddProduct }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-md text-primary">Items de Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceItems.map((item, index) => (
            <SaleItemRow
              key={item.id || index}
              item={item}
              index={index}
              handleItemChange={handleItemChange}
              removeItem={removeItem}
              products={saleProducts}
              onQuickAddProduct={() => onQuickAddProduct('Venta')}
              type="service"
            />
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('service')} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Servicio
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-md text-primary">Items de Producto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {productItems.map((item, index) => (
            <SaleItemRow
              key={item.id || index}
              item={item}
              index={index}
              handleItemChange={handleItemChange}
              removeItem={removeItem}
              products={purchaseProducts}
              onQuickAddProduct={() => onQuickAddProduct('Compra')}
              type="product"
            />
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('product')} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Producto
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaleFormItems;