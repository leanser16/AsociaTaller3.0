
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

export const useTreasuryLogic = () => {
  const { addData, updateData, data } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCashMovement = async (movement) => {
    try {
      const {
        account_id,
        destination_account_id,
        type,
        amount,
        concept,
        payment_method, // Kept for auto-movements
        related_document_id,
        related_document_type,
        is_manual = false,
      } = movement;

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error("El monto debe ser un número positivo.");
      }
      
      const { treasury_accounts } = data;
      const originAccount = treasury_accounts.find(a => a.id === account_id);
      if (!originAccount) throw new Error("La cuenta de origen no existe.");

      // 1. Create movement record
      const movementData = {
        account_id,
        destination_account_id,
        type,
        amount: numericAmount,
        concept,
        payment_method: payment_method || originAccount.payment_method, // Use origin account's method if not provided
        related_document_id,
        related_document_type,
        is_manual,
        user_email: user.email,
        movement_date: new Date().toISOString(),
      };
      
      await addData("cash_movements", movementData);

      // 2. Update account balances
      if (type === "Ingreso") {
        const newBalance = parseFloat(originAccount.balance) + numericAmount;
        await updateData("treasury_accounts", account_id, { balance: newBalance });
      } else if (type === "Egreso") {
        const newBalance = parseFloat(originAccount.balance) - numericAmount;
        await updateData("treasury_accounts", account_id, { balance: newBalance });
      } else if (type === "Transferencia") {
        if (!destination_account_id) throw new Error("Se requiere una cuenta de destino para transferencias.");
        
        const destAccount = treasury_accounts.find(a => a.id === destination_account_id);
        if (!destAccount) throw new Error("La cuenta de destino no existe.");

        const newOriginBalance = parseFloat(originAccount.balance) - numericAmount;
        await updateData("treasury_accounts", account_id, { balance: newOriginBalance });

        const newDestBalance = parseFloat(destAccount.balance) + numericAmount;
        await updateData("treasury_accounts", destination_account_id, { balance: newDestBalance });
      }
      
      toast({
        title: "Movimiento Registrado",
        description: `El ${type.toLowerCase()} de ${formatCurrency(numericAmount)} ha sido registrado exitosamente.`,
      });

    } catch (error) {
      console.error("Error handling cash movement:", error);
      toast({
        title: "Error en Movimiento",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return { handleCashMovement };
};
