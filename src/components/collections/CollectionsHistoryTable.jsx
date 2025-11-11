import React from 'react';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Button } from '@/components/ui/button';
    import { Edit, Trash2, Eye } from 'lucide-react';
    import { formatDate, formatCurrency } from '@/lib/utils';

    const CollectionsHistoryTable = ({ collections, onEdit, onDelete, onViewDetail, onSort, sortConfig }) => {
      const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
      };

      const renderHeader = (key, title) => (
        <TableHead onClick={() => onSort(key)} className="cursor-pointer hover:bg-muted/50">
          {title} {getSortIndicator(key)}
        </TableHead>
      );

      return (
        <>
          {collections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {renderHeader('collection_date', 'Fecha')}
                  {renderHeader('saleFormattedNumber', 'Ref. Venta')}
                  {renderHeader('customerName', 'Cliente')}
                  {renderHeader('amount', 'Monto')}
                  {renderHeader('method', 'Método')}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => (
                  <TableRow key={collection.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{formatDate(collection.collection_date)}</TableCell>
                    <TableCell>{collection.saleFormattedNumber}</TableCell>
                    <TableCell>{collection.customerName}</TableCell>
                    <TableCell>{formatCurrency(collection.amount || 0)}</TableCell>
                    <TableCell>{collection.method}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onViewDetail(collection)} 
                        title="Ver Detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEdit(collection)} 
                        className="text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                        title="Editar"
                        disabled={collection.isVirtual}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onDelete(collection)} 
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed" 
                        title="Eliminar"
                        disabled={collection.isVirtual}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No se encontraron cobros para los filtros aplicados.</p>
          )}
        </>
      );
    };

    export default CollectionsHistoryTable;