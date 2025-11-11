import React from 'react';
    import { Input } from '@/components/ui/input';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Button } from '@/components/ui/button';
    import { Trash2, PlusCircle } from 'lucide-react';
    import { formatCurrency } from '@/lib/utils';
    import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { cn } from '@/lib/utils';

    const SaleItemRow = ({ item, index, handleItemChange, removeItem, products, onQuickAddProduct, type }) => {
      const handleChange = (field, value) => {
        handleItemChange(type, index, { ...item, [field]: value });
      };

      return (
        <div className="grid grid-cols-12 gap-2 items-start p-3 rounded-md border bg-card/50 shadow-sm relative">
          <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive hover:text-destructive/80" onClick={() => removeItem(type, index)}>
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="col-span-12 space-y-2">
            <Label>{type === 'service' ? 'Servicio' : 'Producto'}</Label>
            <div className="flex items-center gap-2">
              <Select
                value={item.productId || ''}
                onValueChange={(value) => handleChange('productId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Seleccionar ${type === 'service' ? 'servicio' : 'producto'}`} />
                </SelectTrigger>
                <SelectContent>
                  {products && products.length > 0 ? (
                    products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                  ) : (
                    <SelectItem value="no-items" disabled>No hay items cargados</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button type="button" onClick={onQuickAddProduct} variant="outline" size="icon" className="min-w-max">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={item.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detalles adicionales del item"
              className="mt-1"
            />
          </div>

          <div className="col-span-6 md:col-span-2 space-y-1">
            <Label>Precio Unit.</Label>
            <Input
              type="number"
              step="any"
              value={item.unitPrice}
              onChange={(e) => handleChange('unitPrice', e.target.value)}
              placeholder="0.00"
              disabled={item.calculationMode === 'total'}
              className={cn(item.calculationMode === 'total' && "bg-muted/50 cursor-not-allowed")}
            />
          </div>
          
          <div className="col-span-6 md:col-span-2 space-y-1">
            <Label>Cantidad</Label>
            <Input
              type="number"
              step="any"
              value={item.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="1"
              min="0"
            />
          </div>

          <div className="col-span-6 md:col-span-2 space-y-1">
            <Label>IVA (%)</Label>
            <Select
              value={String(item.iva)}
              onValueChange={(value) => handleChange('iva', value)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="21">21%</SelectItem>
                <SelectItem value="0">0%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 md:col-span-2 space-y-1">
            <Label>Dto. (%)</Label>
            <Input
              type="number"
              value={item.discount}
              onChange={(e) => handleChange('discount', e.target.value)}
              placeholder="0"
              min="0"
              max="100"
            />
          </div>

          <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-2 items-end">
            <div className="space-y-1">
              <Label>Calcular desde:</Label>
              <RadioGroup
                value={item.calculationMode}
                onValueChange={(value) => handleChange('calculationMode', value)}
                className="flex items-center space-x-2 pt-2"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="net" id={`r-net-${type}-${index}`} />
                  <Label htmlFor={`r-net-${type}-${index}`} className="text-xs font-normal">Neto</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="total" id={`r-total-${type}-${index}`} />
                  <Label htmlFor={`r-total-${type}-${index}`} className="text-xs font-normal">Total</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label>Total Item</Label>
              {item.calculationMode === 'net' ? (
                <div className="p-2 border rounded-md bg-muted text-foreground font-bold h-10 flex items-center justify-end">
                  {formatCurrency(item.total)}
                </div>
              ) : (
                <Input
                  type="number"
                  step="any"
                  value={item.total}
                  onChange={(e) => handleChange('total', e.target.value)}
                  placeholder="0.00"
                  className="font-bold text-right"
                />
              )}
            </div>
          </div>
        </div>
      );
    };

    export default SaleItemRow;