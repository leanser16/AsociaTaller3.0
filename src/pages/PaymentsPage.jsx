
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Coins as HandCoins, PlusCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getDaysUntilDue } from '@/lib/utils';
import PendingPaymentsTable from '@/components/payments/PendingPaymentsTable';
import PaymentsHistoryTable from '@/components/payments/PaymentsHistoryTable';
import PaymentFormDialog from '@/components/payments/PaymentFormDialog';
import { useTreasuryLogic } from '@/hooks/useTreasuryLogic';
import AccountSummaryDialog from '@/components/collections/AccountSummaryDialog'; // Reusing for suppliers
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const PaymentsPage = () => {
  const { data, addData, updateData, loading } = useData();
  const { purchases = [], payments = [], suppliers = [], treasury_accounts = [] } = data;
  const { toast } = useToast();
  const { handleCashMovement } = useTreasuryLogic();
  
  const [isFormOpen, setFormOpen] = useState(false);
  const [isSummaryOpen, setSummaryOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [pendingPurchase, setPendingPurchase] = useState(null);

  const [accountSelection, setAccountSelection] = useState({
    isOpen: false,
    accounts: [],
    onSelect: () => {},
    onCancel: () => {},
    formData: null,
  });

  const handleCreatePayment = (purchase) => {
    setPendingPurchase(purchase);
    setCurrentPayment(null);
    setFormOpen(true);
  };

  const handleEditPayment = (payment) => {
    setPendingPurchase(null);
    setCurrentPayment(payment);
    setFormOpen(true);
  };
  
  const closeForm = () => {
    setFormOpen(false);
    setPendingPurchase(null);
    setCurrentPayment(null);
  };

  const processMovement = async (accountId, formData) => {
    const purchase = purchases.find(p => p.id === formData.purchase_id);
    const newBalance = purchase.balance - formData.amount;
    const newPurchaseStatus = newBalance === 0 ? "Pagado" : "Pendiente de pago";

    // Create payment
    const newPayment = await addData('payments', {...formData, treasury_account_id: accountId });
    
    // Update purchase balance and status
    await updateData('purchases', formData.purchase_id, { balance: newBalance, status: newPurchaseStatus });

    // Create cash movement
    await handleCashMovement({
        account_id: accountId,
        type: 'Egreso',
        amount: formData.amount,
        concept: `Pago de Compra #${purchase.document_number || purchase.id.substring(0, 8)}`,
        payment_method: formData.method,
        related_document_id: newPayment.id,
        related_document_type: 'Payment'
    });

    toast({ title: '¡Éxito!', description: 'El pago ha sido registrado correctamente.' });
    closeForm();
  };

  const handleSavePayment = async (formData) => {
    try {
      const purchase = purchases.find(p => p.id === formData.purchase_id);
      if (!purchase) throw new Error("Compra no encontrada.");
      
      const newBalance = purchase.balance - formData.amount;
      if (newBalance < 0) {
        toast({ title: "Error", description: "El monto del pago no puede ser mayor que el saldo pendiente.", variant: "destructive" });
        return;
      }
      
      const suitableAccounts = treasury_accounts.filter(acc => acc.payment_method === formData.method);
      if (suitableAccounts.length === 0) {
          toast({ title: "Acción requerida", description: `No hay una cuenta de tesorería para "${formData.method}". Por favor, cree una.`, variant: "destructive" });
          return;
      } else if (suitableAccounts.length === 1) {
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
      console.error("Error saving payment:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const pendingPayments = useMemo(() => {
    return (purchases || []).filter(p => p.status === 'Pendiente de pago' || p.status === 'Vencido');
  }, [purchases]);

  const paymentsHistory = useMemo(() => {
    return (payments || []).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  }, [payments]);

  const totalPending = useMemo(() => {
    return pendingPayments.reduce((sum, p) => sum + p.balance, 0);
  }, [pendingPayments]);

  const totalPaid = useMemo(() => {
    return paymentsHistory.reduce((sum, p) => sum + p.amount, 0);
  }, [paymentsHistory]);

  const daysToDueStatus = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    if (days === null) return { text: '', color: '' };
    if (days < 0) return { text: `Vencido por ${Math.abs(days)} días`, color: 'text-red-500 font-bold' };
    if (days === 0) return { text: 'Vence hoy', color: 'text-orange-500 font-bold' };
    return { text: `Vence en ${days} días`, color: 'text-green-500' };
  };

  if (loading) return <div>Cargando Pagos...</div>;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.5 }} className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2"><HandCoins className="h-8 w-8"/>Gestión de Pagos</h1>
        <div className="flex gap-2">
           <Button onClick={() => setSummaryOpen(true)}><FileText className="mr-2 h-4 w-4"/>Resumen PDF</Button>
          <Button onClick={() => handleCreatePayment(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nuevo Pago</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader><CardTitle>Total Pendiente de Pago</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-500">{formatCurrency(totalPending)}</p></CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader><CardTitle>Total Pagado (Histórico)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-500">{formatCurrency(totalPaid)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pagos Pendientes</TabsTrigger>
          <TabsTrigger value="history">Historial de Pagos</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <PendingPaymentsTable
            pendingPayments={pendingPayments}
            suppliers={suppliers}
            handleCreatePayment={handleCreatePayment}
            daysToDueStatus={daysToDueStatus}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <PaymentsHistoryTable
            paymentsHistory={paymentsHistory}
            purchases={purchases}
            suppliers={suppliers}
            treasuryAccounts={treasury_accounts}
            onEdit={handleEditPayment}
          />
        </TabsContent>
      </Tabs>
      
      <PaymentFormDialog 
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSavePayment}
        payment={currentPayment}
        pendingPurchase={pendingPurchase}
        purchases={purchases}
        suppliers={suppliers}
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
        customers={suppliers} // Pass suppliers as customers for reuse
        sales={purchases} // Pass purchases as sales
        isSupplierVersion={true}
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
                    <DialogTitle>Seleccionar Cuenta de Origen</DialogTitle>
                    <DialogDescription>Múltiples cuentas encontradas para este medio de pago. Por favor, selecciona la cuenta desde donde se realizó el pago.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="account-select">Cuenta</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger id="account-select">
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
                    <Button onClick={handleConfirm} disabled={!selectedAccount}>Confirmar Pago</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default PaymentsPage;
