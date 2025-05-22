// src/features/payment/components/PaymentFlow.jsx
import { AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useCallback, useMemo } from "react"; // Added useMemo
import { PaymentHeader } from "./PaymentHeader";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentStatus } from "./PaymentStatus";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { PaymentViews } from "../views";
import { useCartActions } from "../../cart/hooks/useCartActions";
import { useCartStore } from "../../../store/cartStore";
import { Decimal } from "decimal.js";

const TAX_RATE = 0.1; // Ensure this is consistent with usePaymentFlow's TAX_RATE

export const PaymentFlow = ({ totalAmount, onBack }) => {
  const cartActions = useCartActions();

  const handleBackendComplete = useCallback(
    async (orderId, paymentPayload) => {
      try {
        if (!orderId || !paymentPayload) {
          console.error(
            "PAYMENT FLOW: Missing orderId or paymentPayload for completion!"
          );
          return null;
        }
        const result = await cartActions.completeOrder(orderId, paymentPayload);
        return result;
      } catch (error) {
        console.error(
          "PAYMENT FLOW: Error calling cartActions.completeOrder:",
          error
        );
        return null;
      }
    },
    [cartActions]
  );

  const handleNewOrderRequest = useCallback(async () => {
    try {
      useCartStore.getState().clearCart(); // This also resets orderId and shows overlay
      onBack(); // Close the payment modal
    } catch (error) {
      console.error(
        "Error handling new order request from PaymentFlow:",
        error
      );
    }
  }, [cartActions, onBack]); // cartActions was missing, added for consistency if startOrder was used from it

  const {
    state,
    setState,
    error,
    isCompleting,
    handleNavigation,
    handleBack,
    processPayment,
    completePaymentFlow,
    isPaymentComplete,
    handleStartNewOrder,
    getDisplayTotals, // Function from usePaymentFlow to get UI display values
  } = usePaymentFlow({
    totalAmount, // This is the order's initial cash price (subtotal - discount + tax)
    onComplete: handleBackendComplete,
    onNewOrder: handleNewOrderRequest,
  });
  // console.log("[PaymentFlow] Hook state in PaymentFlow component:", state);
  // console.log("[PaymentFlow] totalAmount prop (tax-inclusive, pre-surcharge):", totalAmount);

  const handleBackNavigation = () => {
    const handledByHook = handleBack();
    if (!handledByHook) {
      onBack();
    }
  };

  const displayTotalsObject = getDisplayTotals();
  // console.log("[PaymentFlow] Object received from getDisplayTotals():", displayTotalsObject);

  const CurrentView = PaymentViews[state.currentView];

  // Calculate the pre-tax, pre-surcharge base of the entire order
  const orderBasePreTaxPreSurchargeTotal = useMemo(() => {
    return new Decimal(totalAmount || 0)
      .div(new Decimal(1).plus(TAX_RATE))
      .toNumber();
  }, [totalAmount]);

  // Calculate the remaining pre-tax, pre-surcharge base of the order
  const remainingBaseForSplitView = useMemo(() => {
    return Math.max(
      0,
      orderBasePreTaxPreSurchargeTotal - (state.amountPaid || 0)
    );
  }, [orderBasePreTaxPreSurchargeTotal, state.amountPaid]);
  // console.log("[PaymentFlow] remainingBaseForSplitView to pass to SplitPaymentView:", remainingBaseForSplitView);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      <PaymentHeader
        onBack={handleBackNavigation}
        title={`Payment - Order #${state.orderId || "..."}`}
      />
      <div className="flex-1 relative overflow-hidden p-4">
        <AnimatePresence initial={false} custom={state.direction} mode="wait">
          <CurrentView
            key={state.currentView}
            state={state}
            setState={setState}
            remainingAmount={displayTotalsObject.displayRemainingOverall} // For general display in payment views
            orderBaseRemainingPreTaxPreSurcharge={remainingBaseForSplitView} // Specifically for SplitPaymentView logic
            handleNavigation={handleNavigation}
            handlePayment={processPayment}
            isPaymentComplete={isPaymentComplete}
            completePaymentFlow={completePaymentFlow}
            onStartNewOrder={handleStartNewOrder}
            totalAmount={totalAmount} // Original tax-inclusive, pre-surcharge total for context
            isCompleting={isCompleting}
            paymentResult={
              state.currentView === "Completion"
                ? state.completionResultData
                : undefined
            }
          />
        </AnimatePresence>
        <PaymentStatus error={error} isProcessing={isCompleting} />
      </div>
      {state.currentView !== "Completion" && (
        <PaymentSummary
          subtotal={displayTotalsObject.displayCartSubtotal}
          taxAmount={displayTotalsObject.displayTaxAmount}
          discountAmount={displayTotalsObject.displayCartDiscountAmount}
          surchargeAmount={displayTotalsObject.displaySurchargeAmount}
          tipAmount={displayTotalsObject.displayTipAmount}
          grandTotal={displayTotalsObject.displayGrandTotal}
          amountPaid={displayTotalsObject.displayAmountPaidToBaseOrder}
          remainingAfterPayments={displayTotalsObject.displayRemainingOverall}
        />
      )}
    </div>
  );
};

PaymentFlow.propTypes = {
  totalAmount: PropTypes.number.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default PaymentFlow;
