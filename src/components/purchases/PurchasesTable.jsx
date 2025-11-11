import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Printer, Eye } from 'lucide-react';
import { formatDate, formatCurrency, formatPurchaseNumber } from '@/lib/utils';

const PurchasesTable = ({ purchases, statusConfig, onEdit, onDelete, onPrint, onSort, sortConfig, onViewDetail }) => {
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
        <Card className="shadow-lg">
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {renderHeader('purchase_date', 'Fecha')}
                            {renderHeader('supplierName', 'Proveedor')}
                            <TableHead>N° Comprobante</TableHead>
                            {renderHeader('total', 'Total')}
                            <TableHead>Saldo</TableHead>
                            {renderHeader('status', 'Estado')}
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {purchases.map(purchase => {
                            const currentStatusConfig = statusConfig[purchase.status] || { color: 'bg-gray-400' };
                            return (
                                <TableRow key={purchase.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                                    <TableCell>{purchase.supplierName}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{purchase.document_type}</div>
                                        <div className="text-xs text-muted-foreground">{formatPurchaseNumber(purchase)}</div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(purchase.total)}</TableCell>
                                    <TableCell>{formatCurrency(purchase.balance)}</TableCell>
                                    <TableCell>
                                        <Badge className={`${currentStatusConfig.color} text-white`}>
                                            {purchase.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => onViewDetail(purchase)} title="Ver Detalle">
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(purchase)} className="text-blue-500 hover:text-blue-700" title="Editar">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDelete(purchase.id)} className="text-red-500 hover:text-red-700" title="Eliminar">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onPrint(purchase)} className="text-gray-500 hover:text-gray-700" title="Imprimir">
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                {purchases.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No se encontraron compras.</p>
                )}
            </CardContent>
        </Card>
    );
};

export default PurchasesTable;