// src/features/customerDisplay/hooks/useCustomerFlow.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import customerDisplayManager from "../utils/windowManager";
import { CUSTOMER_FLOW_STEPS } from "../../payment/constants/paymentFlowSteps";

export function useCustomerFlow() {
	const [currentStep, setCurrentStep] = useState(null);
	const [flowActive, setFlowActive] = useState(false);
	const [stepData, setStepData] = useState({});
	const stepDataRef = useRef(stepData);

	useEffect(() => {
		stepDataRef.current = stepData;
	}, [stepData]);

	const startFlow = useCallback((startFlowArgs = {}) => {
		const {
			orderId: inputOrderId,
			initialStep: inputInitialStep,
			paymentMethod = "credit",
			amountDue = 0, // This is (base_for_step + surcharge_for_step + tax_for_step)
			baseForTipCalculation = 0, // This is (base_for_step + surcharge_for_step + tax_for_step)
			isSplitPayment = false,
			splitDetails = null,
			payload = {},
		} = startFlowArgs;

		const effectiveOrderId = inputOrderId || useCartStore.getState().orderId;
		if (!effectiveOrderId) {
			console.error("useCustomerFlow: No orderId!");
			return;
		}

		setFlowActive(true);
		const initialStep =
			inputInitialStep || (paymentMethod === "cash" ? "payment" : "tip");
		setCurrentStep(initialStep);

		const initialData = {
			orderId: effectiveOrderId,
			paymentMethod,
			isSplitPayment,
			splitDetails,
			currentPaymentAmount: amountDue, // Amount due for this step (incl. tax, surcharge)
			baseForTipCalculation: baseForTipCalculation, // Amount tip percentages are based on
			totalAmount: payload?.orderData?.originalTotal || amountDue,
			activePaymentIntentId: null,
			clientSecret: null,
			tip: null,
			payment: null,
			receiptComplete: null,
			paymentError: null,
			...payload,
		};
		setStepData(initialData);
		// console.log(`useCustomerFlow: Flow started. Initial Step: ${initialStep}. Initial Data:`, initialData);

		customerDisplayManager.startCustomerFlow({
			orderId: effectiveOrderId,
			initialStep: initialStep,
			paymentMethod: paymentMethod,
			amountDue: amountDue,
			baseForTipCalculation: baseForTipCalculation, // Pass this to window manager
			isSplitPayment: isSplitPayment,
			splitDetails: splitDetails,
			payload: payload,
		});
	}, []);

	// Advance to the next step
	const nextStep = useCallback(() => {
		const currentIndex = CUSTOMER_FLOW_STEPS.findIndex(
			(step) => step.id === currentStep
		);
		if (currentIndex < CUSTOMER_FLOW_STEPS.length - 1) {
			const nextStepId = CUSTOMER_FLOW_STEPS[currentIndex + 1].id;
			setCurrentStep(nextStepId);
			customerDisplayManager.updateCustomerFlowStep(
				nextStepId,
				stepDataRef.current
			);
			return true;
		}
		return false;
	}, [currentStep]);

	// Go to a specific step
	const goToStep = useCallback(
		(stepId, additionalData = {}) => {
			if (CUSTOMER_FLOW_STEPS.some((step) => step.id === stepId)) {
				// Only update if we're changing to a different step
				if (currentStep !== stepId) {
					setCurrentStep(stepId);
					const newStepData = { ...stepDataRef.current, ...additionalData };
					setStepData(newStepData);
					customerDisplayManager.updateCustomerFlowStep(stepId, newStepData);
					return true;
				}
				return true; // Return true but don't update if already on this step
			}
			return false;
		},
		[currentStep]
	);

	// Complete the flow
	const completeFlow = useCallback(() => {
		setFlowActive(false);
		setCurrentStep(null);
		setStepData({});
		customerDisplayManager.showWelcome();
	}, []);

	useEffect(() => {
		if (!flowActive) return () => {};

		const handleStepCompletion = (step, data) => {
			// console.log(`useCustomerFlow: Received step completion for '${step}'`, data);
			setStepData((prev) => {
				const updated = { ...prev, [step]: data };
				// console.log(`useCustomerFlow: Updated stepData for step '${step}':`, updated);

				let nextStepId = null;
				const currentPaymentMethod = prev.paymentMethod || data.paymentMethod; // Ensure we have paymentMethod

				if (currentPaymentMethod === "cash") {
					if (step === "payment" && data.status === "success") {
						// Assuming cash step returns success
						nextStepId = "receipt";
					} else if (step === "receipt" && data.status === "complete") {
						setTimeout(completeFlow, 500);
						return updated;
					}
				} else {
					// Credit/Other
					if (step === "rewards") {
						nextStepId = "tip";
					} else if (step === "tip" && data.tipAmount !== undefined) {
						updated.tipAmount = data.tipAmount; // Store tip amount from tip selection
						updated.tipPercentage = data.tipPercentage;
						nextStepId = "payment";
					} else if (step === "payment" && data.status === "success") {
						updated.payment = data;
						nextStepId = "receipt";
					} else if (step === "receipt" && data.status === "complete") {
						updated.receiptComplete = true;
						nextStepId = null; // Stop automatic progression for credit
					} else {
						const currentIndex = CUSTOMER_FLOW_STEPS.findIndex(
							(s) => s.id === step
						);
						if (
							currentIndex !== -1 &&
							currentIndex < CUSTOMER_FLOW_STEPS.length - 1
						) {
							nextStepId = CUSTOMER_FLOW_STEPS[currentIndex + 1].id;
						}
					}
				}

				if (nextStepId) {
					setTimeout(() => {
						setCurrentStep(nextStepId);
						customerDisplayManager.updateCustomerFlowStep(nextStepId, {
							...stepDataRef.current,
							[step]: data,
						});
					}, 0);
				}
				return updated;
			});
		};

		const cleanup =
			customerDisplayManager.listenForCustomerFlowStepCompletion(
				handleStepCompletion
			);
		return () => {
			cleanup();
		};
	}, [flowActive, completeFlow]);

	const updateFlowData = useCallback(
		(newData) => {
			// console.log("useCustomerFlow.updateFlowData called with:", newData);

			setStepData((prev) => {
				const updated = { ...prev, ...newData };
				// console.log("Updated step data:", updated);

				// Update the customer display with the new data
				if (currentStep) {
					// console.log(
					// 	"Calling customerDisplayManager.updateCustomerFlowStep with:",
					// 	currentStep,
					// 	updated
					// );
					customerDisplayManager.updateCustomerFlowStep(currentStep, updated);
				}

				return updated;
			});
		},
		[currentStep]
	);

	const resetFlowForSplitContinuation = useCallback(
		(paymentInfo = {}) => {
			// Reset flow state but maintain split payment information
			const currentSplitDetails = stepData.splitDetails;
			const originalTotal = stepData.splitOrderData?.originalTotal;

			// Get payment amounts from the passed info or use defaults
			const amountPaid = paymentInfo.amountPaid || stepData.amountPaid || 0;
			const currentPaymentAmount = paymentInfo.currentPaymentAmount || 0;
			const calculatedRemainingAmount =
				paymentInfo.remainingAmount ||
				(originalTotal ? Math.max(0, originalTotal - amountPaid) : 0);

			// console.log("FLOW RESET: Resetting flow for split continuation:", {
			// 	originalTotal,
			// 	amountPaid,
			// 	currentPaymentAmount,
			// 	calculatedRemainingAmount,
			// });

			// Ensure we're not completing a payment that's already done
			const epsilon = 0.01;
			if (Math.abs(calculatedRemainingAmount) < epsilon) {
				// console.log(
				// 	"FLOW RESET: No remaining amount, payment should be complete"
				// );
				return;
			}

			// Reset flow state
			setFlowActive(false);
			setCurrentStep(null);

			// Keep only the necessary split information
			setStepData({
				splitDetails: {
					...currentSplitDetails,
					// Update the current split index
					currentSplitIndex: (currentSplitDetails?.currentSplitIndex || 0) + 1,
					// Update the remaining amount
					remainingAmount: calculatedRemainingAmount,
				},
				splitOrderData: {
					originalTotal: originalTotal,
					remainingAmount: calculatedRemainingAmount,
				},
				amountPaid: amountPaid,
				// Add a flag to indicate this is a continuation
				isSplitContinuation: true,
				// Store the last payment amount
				lastPaymentAmount: currentPaymentAmount,
			});

			// console.log("FLOW RESET: Customer flow reset for split continuation");
		},
		[stepData]
	);

	return {
		currentStep,
		flowActive,
		stepData,
		startFlow,
		nextStep,
		goToStep,
		completeFlow,
		updateFlowData,
		resetFlowForSplitContinuation,
		isLastStep:
			currentStep === CUSTOMER_FLOW_STEPS[CUSTOMER_FLOW_STEPS.length - 1].id,
		getFlowData: () => stepData,
		resetFlow: () => {
			setFlowActive(false);
			setCurrentStep(null);
			setStepData({});
		},
	};
}
