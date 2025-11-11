
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Landmark, PlusCircle, Trash2, Edit, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useData } from '@/contexts/DataContext';
import { formatCurrency, formatDateTime, getLocalDate } from '@/lib/utils';
import { useTreasuryLogic } from '@/hooks/useTreasuryLogic';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta de Débito", "Tarjeta de Crédito", "Cheque", "Dolares"];

const TreasuryPage = () => {
    const { data, addData, updateData, deleteData, loading } = useData();
    const { toast } = useToast();
    const { handleCashMovement } = useTreasuryLogic();
    const { treasury_accounts = [], cash_movements = [] } = data;

    const [isAccountFormOpen, setAccountFormOpen] = useState(false);
    const [isMovementFormOpen, setMovementFormOpen] = useState(false);
    const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
    
    const [currentAccount, setCurrentAccount] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    const [filterDate, setFilterDate] = useState(getLocalDate());
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterType, setFilterType] = useState('all');

    // Handlers
    const handleSaveAccount = async (formData) => {
        try {
            if (currentAccount) {
                await updateData('treasury_accounts', currentAccount.id, formData);
                toast({ title: 'Cuenta actualizada' });
            } else {
                await addData('treasury_accounts', { ...formData, balance: 0 });
                toast({ title: 'Cuenta creada' });
            }
            setAccountFormOpen(false);
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };
    
    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            // Check if account has movements
            if (itemToDelete.table === 'treasury_accounts' && cash_movements.some(m => m.account_id === itemToDelete.id || m.destination_account_id === itemToDelete.id)) {
                toast({ title: 'Error al eliminar', description: 'No se puede eliminar una cuenta con movimientos asociados.', variant: 'destructive' });
                setDeleteAlertOpen(false);
                return;
            }

            // Reverse balance for manual movements before deleting
            if (itemToDelete.table === 'cash_movements' && itemToDelete.data?.is_manual) {
                const { account_id, destination_account_id, type, amount } = itemToDelete.data;
                const originAccount = treasury_accounts.find(a => a.id === account_id);
                if (type === 'Ingreso') await updateData('treasury_accounts', account_id, { balance: originAccount.balance - amount });
                if (type === 'Egreso') await updateData('treasury_accounts', account_id, { balance: originAccount.balance + amount });
                if (type === 'Transferencia') {
                    const destAccount = treasury_accounts.find(a => a.id === destination_account_id);
                    await updateData('treasury_accounts', account_id, { balance: originAccount.balance + amount });
                    await updateData('treasury_accounts', destination_account_id, { balance: destAccount.balance - amount });
                }
            }

            await deleteData(itemToDelete.table, itemToDelete.id);
            
            toast({ title: `${itemToDelete.name} eliminado` });
        } catch (error) {
            toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
        } finally {
            setDeleteAlertOpen(false);
            setItemToDelete(null);
        }
    };

    const handleSaveMovement = async (formData) => {
        try {
            await handleCashMovement({ ...formData, is_manual: true });
            setMovementFormOpen(false);
        } catch(error) { /* Error is already toasted in the hook */ }
    };

    // UI Openers
    const openAccountForm = (account = null) => {
        setCurrentAccount(account);
        setAccountFormOpen(true);
    };

    const openMovementForm = () => {
        setMovementFormOpen(true);
    };
    
    const openDeleteAlert = (item, table, name) => {
        setItemToDelete({ id: item.id, table, name, data: item });
        setDeleteAlertOpen(true);
    };

    const filteredMovements = useMemo(() => {
        if (!cash_movements) return [];
        return cash_movements.filter(m => {
            const movementDate = m.movement_date.split('T')[0];
            const accountMatch = filterAccount === 'all' || m.account_id === filterAccount || m.destination_account_id === filterAccount;
            const typeMatch = filterType === 'all' || m.type === filterType;
            const dateMatch = !filterDate || movementDate === filterDate;
            return accountMatch && typeMatch && dateMatch;
        }).sort((a,b) => new Date(b.movement_date) - new Date(a.movement_date));
    }, [cash_movements, filterDate, filterAccount, filterType]);

    if(loading) return <div>Cargando tesorería...</div>;

    return (
        <motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.5 }} className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2"><PiggyBank className="h-8 w-8"/>Tesorería y Caja</h1>

            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="movements">Movimientos</TabsTrigger>
                    <TabsTrigger value="accounts">Cuentas</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Saldos de Cuentas</CardTitle>
                            <CardDescription>Saldos actuales en todas tus cuentas de tesorería.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                             {(treasury_accounts || []).map(account => (
                                <Card key={account.id} className="flex items-center p-4">
                                    {account.type === 'Efectivo' ? <PiggyBank className="h-8 w-8 mr-4 text-green-500"/> : <Landmark className="h-8 w-8 mr-4 text-blue-500"/>}
                                    <div>
                                        <p className="font-bold">{account.name}</p>
                                        <p className="text-2xl font-bold">{formatCurrency(account.balance)}</p>
                                        <p className="text-sm text-muted-foreground">{account.payment_method}</p>
                                    </div>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="movements" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Movimientos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="grid gap-1.5"><Label htmlFor="filter-date">Fecha</Label><Input id="filter-date" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="filter-account">Cuenta</Label>
                                    <Select value={filterAccount} onValueChange={setFilterAccount}>
                                        <SelectTrigger id="filter-account" className="w-[180px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas</SelectItem>
                                            {(treasury_accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="filter-type">Tipo</Label>
                                    <Select value={filterType} onValueChange={setFilterType}>
                                        <SelectTrigger id="filter-type" className="w-[180px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem><SelectItem value="Ingreso">Ingreso</SelectItem><SelectItem value="Egreso">Egreso</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={openMovementForm}><PlusCircle className="mr-2 h-4 w-4"/>Nuevo Movimiento</Button>
                            </div>
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead>Tipo</TableHead><TableHead>Cuenta</TableHead><TableHead>Monto</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredMovements.length > 0 ? filteredMovements.map(m => (
                                            <TableRow key={m.id}>
                                                <TableCell>{formatDateTime(m.movement_date)}</TableCell>
                                                <TableCell className="font-medium">{m.concept}</TableCell>
                                                <TableCell><span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${m.type === 'Ingreso' ? 'bg-green-500' : m.type === 'Egreso' ? 'bg-red-500' : 'bg-blue-500'}`}>{m.type}</span></TableCell>
                                                <TableCell>
                                                    {(treasury_accounts || []).find(a => a.id === m.account_id)?.name || 'N/A'}
                                                    {m.type === 'Transferencia' && ` -> ${(treasury_accounts || []).find(a => a.id === m.destination_account_id)?.name || 'N/A'}`}
                                                </TableCell>
                                                <TableCell className={`font-bold ${m.type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(m.amount)}</TableCell>
                                                <TableCell>{m.is_manual && (<Button variant="ghost" size="icon" onClick={() => openDeleteAlert(m, 'cash_movements', 'Movimiento')}><Trash2 className="h-4 w-4 text-red-500" /></Button>)}</TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={6} className="text-center">No hay movimientos.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="accounts" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Cuentas de Tesorería</CardTitle><CardDescription>Gestiona tus cajas y cuentas bancarias.</CardDescription></div>
                            <Button onClick={() => openAccountForm()}><PlusCircle className="mr-2 h-4 w-4"/>Nueva Cuenta</Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Medio de Pago</TableHead><TableHead>Saldo</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {(treasury_accounts || []).map(account => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.name}</TableCell>
                                            <TableCell>{account.type}</TableCell>
                                            <TableCell>{account.payment_method}</TableCell>
                                            <TableCell>{formatCurrency(account.balance)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openAccountForm(account)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => openDeleteAlert(account, 'treasury_accounts', 'Cuenta')}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <AccountFormDialog isOpen={isAccountFormOpen} onOpenChange={setAccountFormOpen} onSave={handleSaveAccount} account={currentAccount} />
            <MovementFormDialog isOpen={isMovementFormOpen} onOpenChange={setMovementFormOpen} onSave={handleSaveMovement} accounts={treasury_accounts} />

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer y eliminará permanentemente el {itemToDelete?.name.toLowerCase()}.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
};

const AccountFormDialog = ({ isOpen, onOpenChange, onSave, account }) => {
    const [formData, setFormData] = useState({ name: '', type: 'Efectivo', payment_method: 'Efectivo' });
    
    React.useEffect(() => {
        if (account) setFormData({ name: account.name, type: account.type, payment_method: account.payment_method || 'Efectivo' });
        else setFormData({ name: '', type: 'Efectivo', payment_method: 'Efectivo' });
    }, [account, isOpen]);

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>{account ? 'Editar' : 'Nueva'} Cuenta</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required /></div>
                    <div className="grid gap-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={formData.type} onValueChange={value => handleChange('type', value)}><SelectTrigger id="type"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Efectivo">Efectivo</SelectItem><SelectItem value="Bancaria">Bancaria</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="payment_method">Medio de Pago Asociado</Label>
                        <Select value={formData.payment_method} onValueChange={value => handleChange('payment_method', value)}><SelectTrigger id="payment_method"><SelectValue /></SelectTrigger>
                            <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit">Guardar</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const MovementFormDialog = ({ isOpen, onOpenChange, onSave, accounts = [] }) => {
    const [formData, setFormData] = useState({ type: 'Egreso', amount: '', concept: '', account_id: '', destination_account_id: '' });
    
    React.useEffect(() => {
        if (!isOpen) {
            setFormData({ type: 'Egreso', amount: '', concept: '', account_id: '', destination_account_id: '' });
        } else if (accounts.length > 0) {
            setFormData(prev => ({ ...prev, account_id: accounts[0].id }));
        }
    }, [isOpen, accounts]);

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const handleSubmit = (e) => { e.preventDefault(); onSave({ ...formData, amount: parseFloat(formData.amount) }); };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Movimiento Manual</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Tipo</Label>
                        <Select value={formData.type} onValueChange={v => handleChange('type', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Egreso">Egreso (Gasto/Retiro)</SelectItem><SelectItem value="Ingreso">Ingreso (Aporte)</SelectItem><SelectItem value="Transferencia">Transferencia</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2"><Label htmlFor="amount">Monto</Label><Input id="amount" type="number" step="0.01" value={formData.amount} onChange={e => handleChange('amount', e.target.value)} required /></div>
                    <div className="grid gap-2"><Label htmlFor="concept">Concepto</Label><Input id="concept" value={formData.concept} onChange={e => handleChange('concept', e.target.value)} required /></div>
                    <div className="grid gap-2">
                        <Label>Cuenta de Origen</Label>
                        <Select value={formData.account_id} onValueChange={v => handleChange('account_id', v)} required>
                            <SelectTrigger><SelectValue placeholder="Seleccione una cuenta"/></SelectTrigger>
                            <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    {formData.type === 'Transferencia' && (
                        <div className="grid gap-2">
                            <Label>Cuenta de Destino</Label>
                            <Select value={formData.destination_account_id} onValueChange={v => handleChange('destination_account_id', v)} required>
                                <SelectTrigger><SelectValue placeholder="Seleccione una cuenta"/></SelectTrigger>
                                <SelectContent>{accounts.filter(a => a.id !== formData.account_id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit">Guardar</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TreasuryPage;
