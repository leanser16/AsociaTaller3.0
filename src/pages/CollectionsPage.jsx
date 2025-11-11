
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, PlusCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getDaysUntilDue } from '@/lib/utils';
import PendingCollectionsTable from '@/components/collections/PendingCollectionsTable';
import CollectionsHistoryTable from '@/components/collections/CollectionsHistoryTable';
import CollectionFormDialog from '@/components/collections/CollectionFormDialog';
import { useTreasuryLogic } from '@/hooks/useTreasuryLogic';
import AccountSummaryDialog from '@/components/collections/AccountSummaryDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const CollectionsPage = () => {
  const { data, addData, updateData, loading } = useData();
  const { sales = [], collections = [], customers = [], treasury_accounts = [] } = data;
  const { toast } = useToast();
  const { handleCashMovement } = useTreasuryLogic();
  
  const [isFormOpen, setFormOpen] = useState(false);
  const [isSummaryOpen, setSummaryOpen] = useState(false);
  const [currentCollection, setCurrentCollection] = useState(null);
  const [pendingSale, setPendingSale] = useState(null);

  const [accountSelection, setAccountSelection] = useState({
    isOpen: false,
    accounts: [],
    onSelect: () => {},
    onCancel: () => {},
    formData: null,
  });

  const handleCreateCollection = (sale) => {
    setPendingSale(sale);
    setCurrentCollection(null);
    setFormOpen(true);
  };

  const handleEditCollection = (collection) => {
    setPendingSale(null);
    setCurrentCollection(collection);
    setFormOpen(true);
  };
  
  const closeForm = () => {
    setFormOpen(false);
    setPendingSale(null);
    setCurrentCollection(null);
  };

  const processMovement = async (accountId, formData) => {
    const sale = sales.find(s => s.id === formData.sale_id);
    const newBalance = sale.balance - formData.amount;
    const newSaleStatus = newBalance === 0 ? "Cobrado" : "Pendiente de pago";

    // Create collection
    const newCollection = await addData('collections', {...formData, treasury_account_id: accountId });
    
    // Update sale balance and status
    await updateData('sales', formData.sale_id, { balance: newBalance, status: newSaleStatus });

    // Create cash movement
    await handleCashMovement({
        account_id: accountId,
        type: 'Ingreso',
        amount: formData.amount,
        concept: `Cobro de Venta #${sale.sale_number || sale.id.substring(0, 8)}`,
        payment_method: formData.method,
        related_document_id: newCollection.id,
        related_document_type: 'Collection'
    });

    toast({ title: '¡Éxito!', description: 'El cobro ha sido registrado correctamente.' });
    closeForm();
  };

  const handleSaveCollection = async (formData) => {
    try {
      const sale = sales.find(s => s.id === formData.sale_id);
      if (!sale) throw new Error("Venta no encontrada.");
      
      const newBalance = sale.balance - formData.amount;
      if (newBalance < 0) {
        toast({ title: "Error", description: "El monto del cobro no puede ser mayor que el saldo pendiente.", variant: "destructive" });
        return;
      }
      
      // Check for treasury account
      const suitableAccounts = treasury_accounts.filter(acc => acc.payment_method === formData.method);
      
      if (suitableAccounts.length === 0) {
          toast({ title: "Acción requerida", description: `No hay una cuenta de tesorería para "${formData.method}". Por favor, cree una en Tesorería.`, variant: "destructive" });
          return;
      } 
      
      if (suitableAccounts.length === 1) {
          await processMovement(suitableAccounts[0].id, formData);
      } else {
          setAccountSelection({
            isOpen: true,
            accounts: suitableAccounts,
            formData: formData,
            onSelect: async (accountId) => {
                await processMovement(accountId, formData);
                setAccountSelection({ isOpen: false, accounts: [], onSelect: () => {}, onCancel: () => {}, formData: null });
            },
            onCancel: () => {
                setAccountSelection({ isOpen: false, accounts: [], onSelect: () => {}, onCancel: () => {}, formData: null });
            }
          });
      }

    } catch (error) {
      console.error("Error saving collection:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const pendingCollections = useMemo(() => {
    return (sales || []).filter(sale => sale.status === 'Pendiente de pago' || sale.status === 'Vencido');
  }, [sales]);

  const collectionsHistory = useMemo(() => {
    return (collections || []).sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date));
  }, [collections]);

  const totalPending = useMemo(() => {
    return pendingCollections.reduce((sum, sale) => sum + sale.balance, 0);
  }, [pendingCollections]);

  const totalCollected = useMemo(() => {
    return collectionsHistory.reduce((sum, collection) => sum + collection.amount, 0);
  }, [collectionsHistory]);

  const daysToDueStatus = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    if (days === null) return { text: '', color: '' };
    if (days < 0) return { text: `Vencido por ${Math.abs(days)} días`, color: 'text-red-500 font-bold' };
    if (days === 0) return { text: 'Vence hoy', color: 'text-orange-500 font-bold' };
    return { text: `Vence en ${days} días`, color: 'text-green-500' };
  };

  if (loading) return <div>Cargando Cobros...</div>;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.5 }} className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2"><DollarSign className="h-8 w-8"/>Gestión de Cobros</h1>
        <div className="flex gap-2">
          <Button onClick={() => setSummaryOpen(true)}><FileText className="mr-2 h-4 w-4"/>Resumen PDF</Button>
          <Button onClick={() => handleCreateCollection(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nuevo Cobro</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader><CardTitle>Total Pendiente de Cobro</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-500">{formatCurrency(totalPending)}</p></CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader><CardTitle>Total Cobrado (Histórico)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-500">{formatCurrency(totalCollected)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Cobros Pendientes</TabsTrigger>
          <TabsTrigger value="history">Historial de Cobros</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <PendingCollectionsTable
            pendingCollections={pendingCollections}
            customers={customers}
            handleCreateCollection={handleCreateCollection}
            daysToDueStatus={daysToDueStatus}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <CollectionsHistoryTable
            collectionsHistory={collectionsHistory}
            sales={sales}
            customers={customers}
            treasuryAccounts={treasury_accounts}
            onEdit={handleEditCollection}
          />
        </TabsContent>
      </Tabs>
      
      <CollectionFormDialog 
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSaveCollection}
        collection={currentCollection}
        pendingSale={pendingSale}
        sales={sales}
        customers={customers}
      />

       {accountSelection.isOpen && (
         <AccountSelectionDialog 
            isOpen={accountSelection.isOpen}
            accounts={accountSelection.accounts}
            onSelect={accountSelection.onSelect}
            onCancel={accountSelection.onCancel}
        />
       )}
       
      <AccountSummaryDialog
        isOpen={isSummaryOpen}
        onOpenChange={setSummaryOpen}
        customers={customers}
        sales={sales}
       />
    </motion.div>
  );
};

const AccountSelectionDialog = ({ isOpen, accounts, onSelect, onCancel }) => {
    const [selectedAccount, setSelectedAccount] = useState('');

    React.useEffect(() => {
        if (isOpen && accounts.length > 0) {
            setSelectedAccount(accounts[0].id);
        }
    }, [isOpen, accounts]);

    const handleConfirm = () => {
        if (selectedAccount) {
            onSelect(selectedAccount);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Seleccionar Cuenta de Destino</DialogTitle>
                    <DialogDescription>Múltiples cuentas encontradas para este medio de pago. Por favor, selecciona la cuenta donde se recibió el dinero.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="account-select">Cuenta</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount} id="account-select">
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una cuenta..." />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name} ({formatCurrency(acc.balance)})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={!selectedAccount}>Confirmar Cobro</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CollectionsPage;
