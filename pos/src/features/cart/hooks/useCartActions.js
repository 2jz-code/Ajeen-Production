// src/features/cart/hooks/useCartActions.js
import { useCallback } from "react";
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { toast } from "react-toastify";
// import { calculateCartTotals } from "../utils/cartCalculations"; // Make sure this import exists

export const useCartActions = () => {
	// Add item to cart (assuming this exists in your store)
	const addToCart = useCallback((item) => {
		useCartStore.getState().addToCart(item);
	}, []);

	const clearCart = useCallback(() => {
		useCartStore.getState().clearItems();
	}, []);

	// Remove item from cart
	const removeFromCart = useCallback((itemId) => {
		// <-- ADD THIS FUNCTION
		useCartStore.getState().removeFromCart(itemId);
	}, []);

	// Update item quantity or discount
	const updateItemQuantity = useCallback((itemId, updates) => {
		if (typeof updates === "object") {
			useCartStore.getState().updateItem(itemId, updates);
		} else {
			useCartStore.getState().updateItemQuantity(itemId, updates);
		}
	}, []);

	// Start a new order
	const startOrder = useCallback(async () => {
		try {
			const response = await axiosInstance.post("orders/start/");
			const newOrderId = response.data.id;
			useCartStore.setState({
				orderId: newOrderId,
				cart: [],
				orderDiscount: null,
				rewardsProfile: null,
			});
			useCartStore.getState().setShowOverlay(false);
			return newOrderId;
		} catch (error) {
			console.error("Failed to start order:", error);
			toast.error("Failed to start new order");
			return null;
		}
	}, []);

	// Hold the current order
	const holdOrder = useCallback(async (orderId, cart) => {
		if (!orderId || !cart || cart.length === 0) {
			toast.warn("Cannot hold an empty order.");
			return;
		}
		try {
			await axiosInstance.patch(`orders/${orderId}/`, {
				status: "saved",
				items: cart,
			});
			useCartStore.getState().clearCart();
			useCartStore.getState().setOrderId(null);
			useCartStore.getState().setShowOverlay(true);
			toast.success("Order held successfully!");
		} catch (error) {
			console.error("Failed to hold order:", error);
			toast.error("Failed to hold order");
		}
	}, []);

	const completeOrder = useCallback(async (orderId, paymentInfo) => {
		try {
			const storeState = useCartStore.getState();
			const currentOrderId = orderId || storeState.orderId;

			if (!currentOrderId) {
				throw new Error("Order ID is missing for completing order.");
			}
			if (!paymentInfo || typeof paymentInfo !== "object") {
				throw new Error("Payment information is missing or invalid.");
			}
			if (!Array.isArray(paymentInfo.transactions)) {
				console.warn(
					"completeOrder received paymentInfo without a valid transactions array:",
					paymentInfo
				);
			}

			// console.log(`CART ACTIONS: Starting completion for Order ID: ${currentOrderId}`);
			// console.log("CART ACTIONS: Received paymentInfo for backend payload:", JSON.stringify(paymentInfo, null, 2));

			// Construct the payload for the backend directly from paymentInfo
			// The names here should match what the backend /complete/ endpoint expects
			const payload = {
				// Financials - these should now be directly from paymentInfo
				subtotal: paymentInfo.subtotal, // Maps to subtotal_from_frontend
				tax_amount: paymentInfo.tax_amount, // Maps to tax_amount_from_frontend
				discount_id: paymentInfo.discount_id, // FK for discount
				discount_amount: paymentInfo.discount_amount, // Actual amount discounted
				surcharge_amount: paymentInfo.surcharge_amount,
				surcharge_percentage: paymentInfo.surcharge_percentage,
				tip_amount: paymentInfo.tip_amount,
				total_amount: paymentInfo.total_amount, // This is the GRAND TOTAL

				// Payment Details wrapper (as expected by your backend view)
				payment_details: {
					paymentMethod: paymentInfo.payment_method, // e.g., 'cash', 'credit', 'split'
					transactions: paymentInfo.transactions || [],
					totalPaid: paymentInfo.totalPaid,
					baseAmountPaid: paymentInfo.baseAmountPaid,
					totalTipAmount: paymentInfo.totalTipAmount,
					splitPayment: paymentInfo.splitPayment || false,
					splitDetails: paymentInfo.splitDetails || null,
					completed_at: paymentInfo.completed_at || new Date().toISOString(),
				},
				rewards_profile_id: storeState.rewardsProfile?.id || null,
			};

			// console.log("CART ACTIONS: Sending final payload to backend /complete/ endpoint:", JSON.stringify(payload, null, 2));

			const response = await axiosInstance.post(
				`orders/${currentOrderId}/complete/`,
				payload
			);

			// console.log("CART ACTIONS: Backend /complete/ response:", response.data);

			if (
				response.status === 200 &&
				response.data?.status === "success" &&
				response.data?.order
			) {
				// console.log("CART ACTIONS: Order completed successfully in backend.");
				// Clear relevant store state AFTER successful backend confirmation
				storeState.clearCart(); // This also clears orderId and resets overlay
				storeState.clearLocalOrderDiscountState();
				storeState.setRewardsProfile(null);
				return response.data.order; // Return the full order data from backend
			} else {
				const backendError =
					response.data?.message ||
					response.data?.error ||
					JSON.stringify(response.data);
				toast.error(`Order completion issue: ${backendError}`);
				console.warn(
					"CART ACTIONS: Backend success=false or status mismatch:",
					response.data
				);
				return null;
			}
		} catch (error) {
			// ... (existing error handling) ...
			const errorResponseData = error?.response?.data;
			const errorStatus = error?.response?.status;
			const errorMessage =
				typeof errorResponseData === "string"
					? errorResponseData
					: errorResponseData?.message ||
					  errorResponseData?.error ||
					  error?.message ||
					  "An unknown error occurred";
			console.error(
				`CART ACTIONS: Failed to complete order (Status: ${errorStatus}). Error: ${errorMessage}`,
				error
			);
			if (errorResponseData)
				console.error("Backend Error Details:", errorResponseData);
			toast.error(
				`Failed to complete order: ${errorMessage.substring(0, 100)}`
			);
			return null;
		}
	}, []); // No new dependencies, relies on parameters

	// Return all the actions
	return {
		startOrder,
		holdOrder,
		completeOrder,
		addToCart, // Assuming addToCart exists in store
		removeFromCart, // Added back
		updateItemQuantity,
		clearCart,
		// Expose store state/actions directly IF NEEDED, otherwise prefer specific actions.
		// Example: Use useCartStore directly in components for state like 'cart', 'orderId' etc.
		// clearCart: useCartStore.getState().clearCart, // If needed directly
		// setShowOverlay: useCartStore.getState().setShowOverlay, // If needed directly
		// setOrderId: useCartStore.getState().setOrderId, // If needed directly
	};
};
