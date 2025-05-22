// frontend-pos/features/payment/views/CashPaymentView.jsx

import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
const { pageVariants, pageTransition } = paymentAnimations;
import { useReceiptPrinter } from "../../../hooks/useReceiptPrinter";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";
import { useCartStore } from "../../../store/cartStore";
import { formatPrice } from "../../../utils/numberUtils";
import { XCircleIcon } from "@heroicons/react/24/solid";
import { Decimal } from "decimal.js";
import { toast } from "react-toastify";
import { openDrawerWithAgent } from "../../../api/services/localHardwareService";

const commonMotionProps = {
  variants: pageVariants,
  initial: "enter",
  animate: "center",
  exit: "exit",
  transition: pageTransition,
};

export const CashPaymentView = ({
  state,
  remainingAmount: remainingAmountProp,
  handlePayment,
  setState: setParentState,
  completePaymentFlow,
  handleNavigation,
  totalAmount,
  isPaymentComplete, // <<< --- ADD THIS PROP TO DESTRUCTURING
}) => {
  const {
    isProcessing: isPrinterProcessing,
    error: printerError,
    isConnected: isPrinterConnected,
  } = useReceiptPrinter();

  const [error, setError] = useState(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const displayError = printerError || error;
  const [hasBeenMounted, setHasBeenMounted] = useState(false);
  const isMountedRef = useRef(false);
  const epsilon = 0.01;

  // REMOVE any local definition of isPaymentCompleteInternal if it exists.
  // We will use the `isPaymentComplete` prop from `usePaymentFlow`.

  const currentPaymentAmount = useMemo(() => {
    if (
      state.splitMode &&
      state.currentStepAmount !== null &&
      state.currentStepAmount !== undefined &&
      state.currentStepAmount >= 0
    ) {
      return parseFloat(state.currentStepAmount.toFixed(2));
    }
    if (!state.splitMode) {
      const overallRemaining = Math.max(0, remainingAmountProp);
      return parseFloat(overallRemaining.toFixed(2));
    }
    console.warn(
      "CashPaymentView: currentStepAmount not set in split mode, falling back to overall remaining amount."
    );
    const fallbackRemaining = Math.max(0, remainingAmountProp);
    return parseFloat(fallbackRemaining.toFixed(2));
  }, [state.splitMode, state.currentStepAmount, remainingAmountProp]);

  useEffect(() => {
    isMountedRef.current = true;
    setHasBeenMounted(true);
    return () => {
      isMountedRef.current = false;
      if (hasBeenMounted) {
        try {
          if (typeof customerDisplayManager.showWelcome === "function") {
            const cart = useCartStore.getState().cart;
            if (cart && cart.length > 0) {
              customerDisplayManager.showCart();
            } else {
              customerDisplayManager.showWelcome();
            }
          } else {
            console.warn(
              "customerDisplayManager methods not found on unmount."
            );
          }
        } catch (err) {
          console.error("Error resetting customer display on unmount:", err);
        }
      }
    };
  }, [hasBeenMounted]); // Keep hasBeenMounted if its logic for unmount is intended

  useEffect(() => {
    // Effect for logging (optional)
  }, [
    isPrinterProcessing,
    paymentInProgress,
    isPrinterConnected,
    currentPaymentAmount,
  ]);

  useEffect(() => {
    if (currentPaymentAmount === undefined) {
      console.warn(
        "Initial currentPaymentAmount not ready, delaying display update slightly."
      );
    }
    const initialCashData = {
      cashTendered: 0,
      change: 0,
      amountPaid: state.amountPaid || 0,
      remainingAmount: currentPaymentAmount,
      isFullyPaid: currentPaymentAmount < epsilon,
      isSplitPayment: state.splitMode,
    };
    const initialOrderData = {
      subtotal: null,
      tax: null,
      total: currentPaymentAmount,
      discountAmount: null,
      isSplitPayment: state.splitMode,
      originalTotal: state.splitMode ? totalAmount : currentPaymentAmount,
    };
    const initialMessageContent = {
      currentStep: "payment",
      paymentMethod: "cash",
      cashData: initialCashData,
      orderData: initialOrderData,
      displayMode: "flow",
      isSplitPayment: state.splitMode,
      splitDetails: state.splitDetails,
      orderId: state.orderId,
    };
    try {
      customerDisplayManager.sendDirectCashUpdateMessage(initialMessageContent);
    } catch (err) {
      console.error("Error sending initial cash state:", err);
    }
  }, []); // Runs only once on mount

  useEffect(() => {
    if (state.splitMode) {
      const amountForThisStep = currentPaymentAmount;
      if (amountForThisStep === undefined || amountForThisStep < 0) {
        console.error(
          "Cannot start customer flow, invalid amount for step:",
          amountForThisStep
        );
        return;
      }
      const cashDataForFlow = {
        cashTendered: 0,
        change: 0,
        amountPaid: state.amountPaid || 0,
        remainingAmount: amountForThisStep,
        isFullyPaid: amountForThisStep < epsilon,
        isSplitPayment: true,
      };
      const orderDataForFlow = {
        total: amountForThisStep,
        isSplitPayment: true,
        originalTotal: totalAmount,
      };
      customerDisplayManager.startCustomerFlow({
        orderId: state.orderId,
        initialStep: "payment",
        paymentMethod: "cash",
        amountDue: amountForThisStep,
        isSplitPayment: true,
        splitDetails: state.splitDetails,
        payload: {
          cashData: cashDataForFlow,
          orderData: orderDataForFlow,
        },
      });
    }
  }, [
    state.splitMode,
    state.orderId,
    state.splitDetails,
    state.amountPaid,
    currentPaymentAmount,
    totalAmount,
  ]);

  const getLatestTransaction = useCallback(() => {
    if (!state.transactions || state.transactions.length === 0) return null;
    return state.transactions[state.transactions.length - 1];
  }, [state.transactions]);

  const getLatestCashDetails = useCallback(() => {
    const latestTransaction = getLatestTransaction();
    return {
      cashTendered:
        latestTransaction?.method === "cash"
          ? latestTransaction?.cashTendered || 0
          : 0,
      change:
        latestTransaction?.method === "cash"
          ? latestTransaction?.change || 0
          : 0,
    };
  }, [getLatestTransaction]);

  const shouldShowChangeCalculation = useCallback(() => {
    const latestTransaction = getLatestTransaction();
    return (
      latestTransaction &&
      latestTransaction.method === "cash" &&
      typeof latestTransaction.cashTendered === "number" &&
      latestTransaction.cashTendered > 0
    );
  }, [getLatestTransaction]);

  const handlePresetAmount = async (amountTendered) => {
    setError(null);
    setPaymentInProgress(true);
    const requiredAmount = currentPaymentAmount;
    try {
      const amountToApply = Math.min(amountTendered, requiredAmount);
      const changeDue = Math.max(
        0,
        new Decimal(amountTendered).minus(new Decimal(amountToApply)).toNumber()
      );
      const paymentResult = await handlePayment(amountToApply, {
        method: "cash",
        cashTendered: amountTendered,
        change: changeDue,
      });
      if (!paymentResult || !paymentResult.success) {
        throw new Error(paymentResult?.error || "Payment processing failed");
      }
      const updatedAmountPaidOverall = paymentResult.newAmountPaid;
      const stepRemainingAfterPayment = Math.max(
        0,
        new Decimal(requiredAmount).minus(amountToApply).toNumber()
      );
      const cashDataForDisplay = {
        cashTendered: amountTendered,
        change: changeDue,
        amountPaid: updatedAmountPaidOverall,
        remainingAmount:
          stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
        isFullyPaid: paymentResult.isNowComplete,
        isSplitPayment: state.splitMode,
      };
      const orderDataForDisplay = {
        total: stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
        isSplitPayment: state.splitMode,
        originalTotal: state.splitMode ? totalAmount : requiredAmount,
      };
      const messageContent = {
        currentStep: "payment",
        paymentMethod: "cash",
        displayMode: "flow",
        cashData: cashDataForDisplay,
        orderData: orderDataForDisplay,
        isSplitPayment: state.splitMode,
        splitDetails: state.splitDetails,
        orderId: state.orderId,
      };
      customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
    } catch (err) {
      setError(err.message || "Failed to process preset amount");
      console.error("Preset amount payment error:", err);
    } finally {
      if (isMountedRef.current) setPaymentInProgress(false);
    }
  };

  const handleCustomAmount = async () => {
    const amountTendered = parseFloat(state.customAmount);
    const requiredAmount = currentPaymentAmount;
    if (!amountTendered || isNaN(amountTendered) || amountTendered <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (
      new Decimal(amountTendered).lessThan(
        new Decimal(requiredAmount).minus(epsilon)
      )
    ) {
      setError(`Amount must be at least ${formatPrice(requiredAmount)}`);
      return;
    }
    setError(null);
    setPaymentInProgress(true);
    try {
      const amountToApply = Math.min(amountTendered, requiredAmount);
      const changeDue = Math.max(
        0,
        new Decimal(amountTendered).minus(new Decimal(amountToApply)).toNumber()
      );
      const paymentResult = await handlePayment(amountToApply, {
        method: "cash",
        cashTendered: amountTendered,
        change: changeDue,
      });
      if (!paymentResult || !paymentResult.success) {
        throw new Error(paymentResult?.error || "Payment processing failed");
      }
      if (setParentState)
        setParentState((prev) => ({ ...prev, customAmount: "" }));
      const updatedAmountPaidOverall = paymentResult.newAmountPaid;
      const stepRemainingAfterPayment = Math.max(
        0,
        new Decimal(requiredAmount).minus(amountToApply).toNumber()
      );
      const cashDataForDisplay = {
        cashTendered: amountTendered,
        change: changeDue,
        amountPaid: updatedAmountPaidOverall,
        remainingAmount:
          stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
        isFullyPaid: paymentResult.isNowComplete,
        isSplitPayment: state.splitMode,
      };
      const orderDataForDisplay = {
        total: stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
        isSplitPayment: state.splitMode,
        originalTotal: state.splitMode ? totalAmount : requiredAmount,
      };
      const messageContent = {
        currentStep: "payment",
        paymentMethod: "cash",
        displayMode: "flow",
        cashData: cashDataForDisplay,
        orderData: orderDataForDisplay,
        isSplitPayment: state.splitMode,
        splitDetails: state.splitDetails,
        orderId: state.orderId,
      };
      customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
    } catch (err) {
      setError(err.message || "Failed to process custom amount");
      console.error("Custom amount payment error:", err);
    } finally {
      if (isMountedRef.current) setPaymentInProgress(false);
    }
  };

  const canCompleteCurrentStep = useCallback(() => {
    const latestTransaction = getLatestTransaction();
    const hasValidTenderInfo =
      latestTransaction?.method === "cash" &&
      typeof latestTransaction.cashTendered === "number";
    if (!hasValidTenderInfo) return false;
    const requiredAmountForThisStep = currentPaymentAmount;
    const tenderedInLastTx = latestTransaction.cashTendered;
    const tenderedMetRequirement = new Decimal(
      tenderedInLastTx
    ).greaterThanOrEqualTo(
      new Decimal(requiredAmountForThisStep).minus(epsilon)
    );
    return tenderedMetRequirement && !isPrinterProcessing && !paymentInProgress;
  }, [
    state.transactions, // state.transactions is already listed in CashPaymentView's deps, this implies getLatestTransaction is also covered.
    currentPaymentAmount,
    isPrinterProcessing,
    paymentInProgress,
    epsilon,
    getLatestTransaction,
  ]);

  const handlePaymentCompletionAndPrint = async () => {
    setError(null);
    if (!canCompleteCurrentStep()) {
      console.warn(
        "CashPaymentView: Complete button clicked but canCompleteCurrentStep is false."
      );
      setError(
        "Button should be disabled. Please ensure payment step is fully processed."
      );
      return;
    }
    setPaymentInProgress(true);

    try {
      const currentTransactions = state.transactions || [];
      // This now correctly sums the (pre-tax, pre-surcharge) base amounts from transactions.
      const recalculatedAmountPaidOverall = currentTransactions.reduce(
        (sum, tx) => {
          const basePaid =
            typeof tx.baseAmountPaid === "number" && !isNaN(tx.baseAmountPaid)
              ? tx.baseAmountPaid
              : 0;
          return new Decimal(sum).plus(new Decimal(basePaid)).toNumber();
        },
        0
      );

      // *** USE THE isPaymentComplete PROP FROM usePaymentFlow ***
      // This prop function correctly compares base amounts.
      if (typeof isPaymentComplete !== "function") {
        console.error(
          "CashPaymentView Error: isPaymentComplete prop is not a function!",
          isPaymentComplete
        );
        setError("Internal error: Payment completion check unavailable.");
        setPaymentInProgress(false);
        return;
      }
      const isOrderFullyPaid = isPaymentComplete(recalculatedAmountPaidOverall);

      // console.log("CashPaymentView: Completion Check (using prop isPaymentComplete):", {
      //   recalculatedAmountPaidOverall, // This is sum of baseAmountPaid (subtotal portions)
      //   isOrderFullyPaid, // Should be TRUE if base amounts cover order base
      //   stateAmountPaidDirect: state.amountPaid, // This is sum of amountAppliedToOrderTotal (grand total portions)
      //   totalOrderAmountPropForView: totalAmount, // Grand total for order
      // });

      if (state.splitMode && !isOrderFullyPaid) {
        customerDisplayManager.showCart();
        setTimeout(() => {
          if (isMountedRef.current) handleNavigation("Split", -1);
        }, 50);
      } else if (isOrderFullyPaid) {
        try {
          await openDrawerWithAgent();
        } catch (drawerError) {
          console.error(
            "CashPaymentView: Error opening cash drawer:",
            drawerError
          );
          toast.error(
            drawerError.message ||
              "Failed to open cash drawer. Please check agent."
          );
        }

        const completedOrderData = await completePaymentFlow(
          currentTransactions
        );

        if (completedOrderData) {
          const receiptPayload = completedOrderData.receipt_payload || null;
          handleNavigation("Completion", 1, { receiptPayload });
        } else {
          setError(
            "Failed to finalize order with backend. Please review and try again or contact support."
          );
        }
      } else {
        console.warn(
          "CashPaymentView (Warn): Complete button pressed but order not fully paid (checked with hook's logic) and not intermediate split.",
          {
            recalculatedAmountPaid: recalculatedAmountPaidOverall, // sum of base (subtotal) amounts
            totalOrderAmountPropForView: totalAmount, // grand total
            stateAmountPaidFromHook: state.amountPaid, // sum of amountAppliedToOrderTotal (grand total payments)
          }
        );
        setError(
          "Cannot complete: Payment (base amount) is not sufficient for the order's base amount."
        );
      }
    } catch (err) {
      console.error(
        "CashPaymentView: Error during payment completion/continuation:",
        err
      );
      setError(err.message || "Failed processing completion/continuation");
      toast.error(`Error: ${err.message || "Completion failed"}`);
    } finally {
      if (isMountedRef.current) setPaymentInProgress(false);
    }
  };

  const isCustomAmountValid = () => {
    const amount = parseFloat(state.customAmount);
    return (
      !isNaN(amount) &&
      amount > 0 &&
      new Decimal(amount).greaterThanOrEqualTo(
        new Decimal(currentPaymentAmount).minus(epsilon)
      )
    );
  };

  const latestCashDisplay = getLatestCashDetails();

  return (
    <motion.div
      key="cash-payment-ui"
      className="absolute inset-0 p-4 flex flex-col bg-slate-50"
      custom={state.direction}
      {...commonMotionProps}
    >
      <ScrollableViewWrapper className="space-y-4">
        <div className="text-xs text-slate-500 mb-2">
          Printer Status:{" "}
          <span
            className={`font-medium ${
              isPrinterConnected ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPrinterConnected
              ? isPrinterProcessing
                ? "Busy..."
                : "Connected"
              : "Disconnected"}
          </span>
        </div>

        {displayError && (
          <motion.div
            className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-start gap-2 text-sm shadow-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </motion.div>
        )}

        <div className="p-4 bg-blue-50 text-blue-700 rounded-lg shadow">
          <div className="font-medium mb-1 text-blue-800">
            Amount Due This Step
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {formatPrice(currentPaymentAmount)}
          </div>
          {state.splitMode &&
            Math.abs(remainingAmountProp - currentPaymentAmount) > epsilon && (
              <div className="text-xs mt-1 text-blue-600">
                Total Order Remaining: {formatPrice(remainingAmountProp)}
              </div>
            )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600">Quick Amounts</h4>
          <div className="grid grid-cols-3 gap-3">
            <PaymentButton
              label={formatPrice(currentPaymentAmount)}
              onClick={() => handlePresetAmount(currentPaymentAmount)}
              disabled={paymentInProgress || currentPaymentAmount < epsilon}
              className={`bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {[5, 10, 20, 50, 100].map((amount) => (
              <PaymentButton
                key={amount}
                label={`$${amount}`}
                onClick={() => handlePresetAmount(amount)}
                disabled={paymentInProgress || currentPaymentAmount < epsilon}
                variant="default"
                className={"disabled:opacity-50 disabled:cursor-not-allowed"}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600">Custom Amount</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                $
              </span>
              <input
                type="number"
                className="w-full pl-7 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-right disabled:opacity-50 disabled:bg-slate-100"
                placeholder="Enter amount"
                min={
                  currentPaymentAmount > epsilon
                    ? currentPaymentAmount.toFixed(2)
                    : "0.01"
                }
                step="0.01"
                value={state.customAmount}
                onChange={(e) =>
                  setParentState((prev) => ({
                    ...prev,
                    customAmount: e.target.value,
                  }))
                }
                disabled={paymentInProgress || currentPaymentAmount < epsilon}
                onKeyPress={(e) => {
                  if (
                    e.key === "Enter" &&
                    !paymentInProgress &&
                    isCustomAmountValid()
                  ) {
                    handleCustomAmount();
                  }
                }}
              />
            </div>
            <PaymentButton
              label={paymentInProgress ? "Processing..." : "Pay"}
              variant="primary"
              onClick={handleCustomAmount}
              disabled={
                paymentInProgress ||
                !state.customAmount ||
                !isCustomAmountValid() ||
                currentPaymentAmount < epsilon
              }
              className="py-3"
            />
          </div>
          {state.customAmount &&
            !isCustomAmountValid() &&
            parseFloat(state.customAmount) >= 0 && (
              <div className="text-xs text-red-500 pl-1">
                Amount must be at least {formatPrice(currentPaymentAmount)}
              </div>
            )}
        </div>

        {shouldShowChangeCalculation() && (
          <motion.div
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg space-y-2 shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Cash Tendered (Last):</span>
              <span className="font-semibold">
                {formatPrice(latestCashDisplay.cashTendered)}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Change Due (Last):</span>
              <span>{formatPrice(latestCashDisplay.change)}</span>
            </div>
            {remainingAmountProp > epsilon && (
              <div className="flex justify-between items-center text-xs text-emerald-700 pt-1 border-t border-emerald-100 mt-2">
                <span>Remaining Order Balance:</span>
                <span>{formatPrice(remainingAmountProp)}</span>
              </div>
            )}
          </motion.div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-200 space-y-3 flex-shrink-0">
          <PaymentButton
            label={
              state.splitMode && !isPaymentComplete(state.amountPaid) // Use prop here
                ? "Continue Split"
                : "Complete Payment"
            }
            variant="primary"
            onClick={handlePaymentCompletionAndPrint}
            disabled={!canCompleteCurrentStep()}
            className={`w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </div>
      </ScrollableViewWrapper>
    </motion.div>
  );
};

CashPaymentView.propTypes = {
  state: PropTypes.shape({
    direction: PropTypes.number.isRequired,
    paymentMethod: PropTypes.string,
    splitMode: PropTypes.bool.isRequired,
    amountPaid: PropTypes.number.isRequired,
    orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    transactions: PropTypes.array.isRequired,
    customAmount: PropTypes.string.isRequired,
    splitDetails: PropTypes.object,
    nextSplitAmount: PropTypes.number,
    currentStepAmount: PropTypes.number,
    currentSplitMethod: PropTypes.string,
    totalTipAmount: PropTypes.number,
    // Added from user's usePaymentFlow state:
    totalSurchargeAmount: PropTypes.number,
    totalTaxAmount: PropTypes.number,
    surchargePercentageForCurrentStep: PropTypes.number,
    currentBaseForTipCalc: PropTypes.number,
    completionResultData: PropTypes.object,
  }).isRequired,
  remainingAmount: PropTypes.number.isRequired,
  totalAmount: PropTypes.number.isRequired,
  handlePayment: PropTypes.func.isRequired,
  setState: PropTypes.func.isRequired, // Renamed to setParentState in destructuring
  completePaymentFlow: PropTypes.func.isRequired,
  handleNavigation: PropTypes.func.isRequired,
  isPaymentComplete: PropTypes.func.isRequired, // <<< --- ADD THIS TO PROPTYPES
};

export default CashPaymentView;
