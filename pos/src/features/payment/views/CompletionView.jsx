// src/features/payment/views/CompletionView.jsx
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  PrinterIcon,
  XMarkIcon,
  BanknotesIcon,
} from "@heroicons/react/24/solid";
import { useEffect, useState, useCallback } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";
import {
  printReceiptWithAgent,
  openDrawerWithAgent,
} from "../../../api/services/localHardwareService";
import { toast } from "react-toastify";
import { formatPrice } from "../../../utils/numberUtils";

const { pageVariants, pageTransition } = paymentAnimations;

export const CompletionView = ({
  onStartNewOrder,
  paymentResult, // This prop IS NOW the content of receipt_payload
  state,
}) => {
  // ** MODIFIED: The paymentResult prop IS the receiptPayload content **
  const actualReceiptPayload = paymentResult;
  // Log to confirm what's received
  // useEffect(() => {
  //     console.log("CompletionView received paymentResult (actualReceiptPayload):", JSON.stringify(actualReceiptPayload, null, 2));
  // }, [actualReceiptPayload]);

  // Determine if cash was involved from the top-level state or paymentResult structure if it still holds that info.
  // For simplicity, let's assume 'involvedCash' might come from a different part of 'paymentResult' if needed,
  // or passed separately if `paymentResult` is purely the receipt structure.
  // The `paymentResult` passed in the console log seems to be the *original order object* from backend after all,
  // which contains the receipt_payload.
  // The previous console log was: `CompletionView received paymentResult: { id: 11, timestamp: ..., items: ..., subtotal: "6.00", tax: "0.60", ...}`
  // This structure IS the receipt_payload content, not the order object.
  // Let's proceed assuming paymentResult prop IS the receipt_payload content.

  const isCashTransactionInPayload =
    actualReceiptPayload?.payment?.transactions?.some(
      (tx) => tx.method === "cash"
    );
  const cashDetailsFromPayload =
    actualReceiptPayload?.payment?.transactions?.find(
      (tx) => tx.method === "cash"
    )?.metadata;

  const involvedCash =
    paymentResult?.involvedCash ?? isCashTransactionInPayload ?? false; // Fallback if not directly on paymentResult
  const totalCashTendered =
    paymentResult?.totalCashTendered ??
    cashDetailsFromPayload?.cashTendered ??
    0;
  const totalChangeGiven =
    paymentResult?.totalChangeGiven ?? cashDetailsFromPayload?.change ?? 0;

  const [decisionMade, setDecisionMade] = useState(true); // Default to decision made
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (actualReceiptPayload && Object.keys(actualReceiptPayload).length > 0) {
      // Check if it's a non-empty object
      setDecisionMade(false);
    } else {
      setDecisionMade(true);
    }
  }, [actualReceiptPayload]);

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      try {
        if (
          customerDisplayManager.displayWindow &&
          !customerDisplayManager.displayWindow.closed
        ) {
          customerDisplayManager.showWelcome();
        } else {
          console.warn(
            "POS CompletionView: Customer display window not accessible for reset."
          );
        }
      } catch (err) {
        console.error(
          "POS CompletionView: Error resetting customer display:",
          err
        );
      }
    }, 4000);

    return () => {
      clearTimeout(resetTimer);
    };
  }, []);

  useEffect(() => {
    if (involvedCash) {
      openDrawerWithAgent().catch((err) => {
        console.error("CompletionView: Error from openDrawerWithAgent:", err);
      });
    }
  }, [involvedCash]);

  const handlePrint = useCallback(async () => {
    if (!actualReceiptPayload || isPrinting) return;
    setIsPrinting(true);
    try {
      // The `actualReceiptPayload` is what `printReceiptWithAgent` expects.
      // Determine if drawer should open based on overall payment state if available, or default.
      const openDrawerForPrint =
        state?.paymentMethod === "cash" ||
        (state?.splitMode &&
          state.transactions?.some((tx) => tx.method === "cash"));

      const printResult = await printReceiptWithAgent(
        actualReceiptPayload,
        openDrawerForPrint // Or pass `involvedCash` if that's the more reliable indicator
      );
      if (!printResult.success) {
        console.warn(
          "CompletionView: Print command failed:",
          printResult.message
        );
      }
      setDecisionMade(true);
    } catch (err) {
      console.error("CompletionView: Error during printing:", err);
      toast.error("An error occurred while trying to print.");
      setDecisionMade(true);
    } finally {
      setIsPrinting(false);
    }
  }, [
    actualReceiptPayload,
    isPrinting,
    state?.paymentMethod,
    state?.splitMode,
    state?.transactions,
    involvedCash,
  ]);

  const handleSkip = useCallback(() => {
    if (isPrinting) return;
    setDecisionMade(true);
  }, [isPrinting]);

  const handleStartNew = async () => {
    try {
      if (
        customerDisplayManager.displayWindow &&
        !customerDisplayManager.displayWindow.closed
      ) {
        customerDisplayManager.showWelcome();
      }
    } catch (err) {
      console.error("Error sending welcome command:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    await onStartNewOrder();
  };

  return (
    <motion.div
      key="completion"
      className="absolute inset-0 p-4"
      variants={pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={pageTransition}
    >
      <ScrollableViewWrapper>
        <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-md">
            <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Payment Complete!
          </h2>
          <p className="text-slate-600 max-w-md">
            The transaction has been processed successfully.
          </p>
          {involvedCash && totalChangeGiven >= 0 && (
            <motion.div
              key="cash-details"
              className="w-full max-w-sm p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-sm shadow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex justify-between items-center font-medium text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <BanknotesIcon className="h-4 w-4" />
                  Cash Tendered:
                </span>
                <span>{formatPrice(totalCashTendered)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-emerald-900 text-base">
                <span>Change Due:</span>
                <span>{formatPrice(totalChangeGiven)}</span>
              </div>
            </motion.div>
          )}

          {/* MODIFIED CONDITION: Check actualReceiptPayload */}
          {!decisionMade &&
            actualReceiptPayload &&
            Object.keys(actualReceiptPayload).length > 0 && (
              <motion.div
                key="print-options"
                className="w-full max-w-md space-y-3 pt-4 border-t border-slate-200 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-slate-700 font-medium">Print Receipt?</p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <PaymentButton
                    label={isPrinting ? "Printing..." : "Print Receipt"}
                    variant="primary"
                    icon={PrinterIcon}
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className="w-full sm:w-auto px-5 py-2.5"
                  />
                  <PaymentButton
                    label="Skip"
                    variant="default"
                    icon={XMarkIcon}
                    onClick={handleSkip}
                    disabled={isPrinting}
                    className="w-full sm:w-auto px-5 py-2.5"
                  />
                </div>
              </motion.div>
            )}

          {decisionMade && (
            <motion.div
              key="start-new"
              className="w-full max-w-md pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <PaymentButton
                label="Start New Order"
                variant="primary"
                onClick={handleStartNew}
                className="w-full py-3 text-lg"
              />
            </motion.div>
          )}
        </div>
      </ScrollableViewWrapper>
    </motion.div>
  );
};

CompletionView.propTypes = {
  onStartNewOrder: PropTypes.func.isRequired,
  paymentResult: PropTypes.object, // This prop is now understood to be the receipt_payload content itself or an object containing it.
  // If it's the direct payload, its internal structure (id, timestamp, items etc.) is expected.
  // If it's an outer object, then `receipt_payload` key should be on it.
  // Based on the current console log, this component might be receiving the backend's `order` object.
  state: PropTypes.object,
};

export default CompletionView;
