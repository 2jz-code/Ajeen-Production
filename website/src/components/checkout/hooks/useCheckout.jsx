// File: combined/website/src/components/checkout/hooks/useCheckout.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/api"; // Your API instance
import { useAuth } from "../../../contexts/AuthContext";
import { fetchCurrentCartData } from "../../utility/CartUtils"; // Ensure this path is correct

const useCheckout = () => {
	const [cartItems, setCartItems] = useState([]);
	const [step, setStep] = useState(1);
	const [isLoading, setIsLoading] = useState(true); // For initial cart load
	const [isCreatingOrder, setIsCreatingOrder] = useState(false); // When POSTing order to backend
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	const { isAuthenticated, user, authChecked } = useAuth();
	const [pendingOrderId, setPendingOrderId] = useState(null);

	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		email: "",
		phone: "", // Ensure phone is part of the initial state
		delivery_method: "pickup", // Fixed to pickup
		payment_method: "card", // Default and only option now
		notes: "",
	});

	const formatPrice = (price) => {
		if (price === null || price === undefined) return "0.00";
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		return isNaN(numericPrice) ? "0.00" : numericPrice.toFixed(2);
	};

	const subtotal = cartItems.reduce(
		(sum, item) => sum + (item.item_price || 0) * (item.quantity || 0),
		0
	);
	const tax = subtotal * 0.1; // Assuming 10% tax
	const total = subtotal + tax;

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	// handleRadioChange is no longer needed for payment_method if it's fixed.
	// If you used it for delivery_method (though it's fixed to pickup), keep it.
	// const handleRadioChange = (name, value) => { /* ... */ };

	const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
	const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

	// This function creates the order on the backend before Stripe interaction
	const createOrderBeforePayment = useCallback(async () => {
		if (pendingOrderId || isCreatingOrder) return null;

		const { first_name, last_name, email, phone } = formData;
		let requiredFieldsComplete = true;
		let missingFieldNames = [];

		if (!isAuthenticated) {
			// For guests, these are essential from the form
			if (!first_name) {
				missingFieldNames.push("First Name");
				requiredFieldsComplete = false;
			}
			if (!last_name) {
				missingFieldNames.push("Last Name");
				requiredFieldsComplete = false;
			}
			if (!email) {
				missingFieldNames.push("Email");
				requiredFieldsComplete = false;
			}
		}
		// Phone is always required now
		if (!phone) {
			missingFieldNames.push("Phone Number");
			requiredFieldsComplete = false;
		}

		if (!requiredFieldsComplete) {
			setError(
				`Please fill in all required fields: ${missingFieldNames.join(", ")}.`
			);
			window.scrollTo(0, 0);
			return null;
		}

		setIsCreatingOrder(true);
		setError(null);

		// Backend expects 'payment_method' in payload even if it's always 'card'
		const payload = {
			...formData, // Includes first_name, last_name, email, phone, notes
			delivery_method: "pickup", // Fixed
			payment_method: "card", // Fixed
			// If your backend GuestCheckoutView or WebsiteCheckoutView expects items in payload:
			// items: cartItems.map(item => ({ product_id: item.product_id || item.id, quantity: item.quantity })),
		};
		// Remove redundant/fixed fields if the backend doesn't need them explicitly for card orders
		// delete payload.delivery_method;
		// delete payload.payment_method; // Or send it as 'card'

		const endpoint = isAuthenticated
			? "website/checkout/"
			: "website/guest-checkout/";
		// console.log(`Creating order with payload to ${endpoint}:`, payload);

		try {
			const response = await axiosInstance.post(endpoint, payload);
			const orderId = response.data.id || response.data.order_id;

			if (!orderId) {
				console.error(
					"No order ID in createOrderBeforePayment response:",
					response.data
				);
				setError("Failed to prepare order for payment. Please try again.");
				setIsCreatingOrder(false);
				return null;
			}
			// console.log("Order record created successfully with ID:", orderId);
			setPendingOrderId(orderId);
			setIsCreatingOrder(false);
			return orderId; // Crucial for PaymentForm
		} catch (error) {
			console.error(
				"Failed to create order record:",
				error.response?.data || error.message
			);
			const errorMsg =
				error.response?.data?.error ||
				"Failed to prepare your order. Please check your information and try again.";
			setError(errorMsg);
			window.scrollTo(0, 0);
			setIsCreatingOrder(false);
			return null;
		}
	}, [formData, isAuthenticated, pendingOrderId, isCreatingOrder, cartItems]); // cartItems if sending them

	const handlePaymentSuccess = (paymentResult) => {
		// Called by PaymentForm
		// console.log(
		// 	"Stripe Payment successful from Stripe, client-side result:",
		// 	paymentResult
		// );
		if (pendingOrderId) {
			const navigationState = {
				orderId: pendingOrderId,
				isGuest: !isAuthenticated,
				// Pass all customer details that were used to create the order, for display on confirmation
				customerDetails: {
					firstName: formData.first_name,
					lastName: formData.last_name,
					email: formData.email,
					phone: formData.phone, // Ensure phone is passed
				},
				// You can also pass paymentIntentId if needed on confirmation, e.g. from paymentResult
				paymentIntentId: paymentResult?.paymentIntent?.id,
			};
			navigate("/confirmation", { state: navigationState });
		} else {
			console.error(
				"Stripe payment success reported, but no pendingOrderId was found in useCheckout state!"
			);
			setError(
				"Payment succeeded but we encountered an issue finalizing your order details. Please contact support."
			);
		}
	};

	useEffect(() => {
		// Fetch cart and prefill form
		if (!authChecked) return;
		setIsLoading(true);
		fetchCurrentCartData()
			.then((cartData) => {
				if (!cartData || !cartData.items || cartData.items.length === 0) {
					navigate("/menu");
					return;
				}
				setCartItems(cartData.items || []);
				if (isAuthenticated && user) {
					setFormData((prev) => ({
						...prev,
						first_name: user.first_name || "",
						last_name: user.last_name || "",
						email: user.email || "",
						phone: user.phone_number || prev.phone || "", // Use profile phone, allow override if prev.phone has value
						payment_method: "card", // Ensure default
					}));
				} else {
					// Guest or user data not yet loaded
					setFormData((prev) => ({
						...prev, // Keep any typed data
						payment_method: "card", // Ensure default
					}));
				}
			})
			.catch((err) => {
				console.error("Failed to fetch cart items:", err);
				setError("Unable to load your cart.");
			})
			.finally(() => setIsLoading(false));
	}, [navigate, authChecked, isAuthenticated, user]);

	// Auto-create order when user reaches payment step (step 2)
	useEffect(() => {
		if (
			step === 2 &&
			!pendingOrderId &&
			!isCreatingOrder &&
			cartItems.length > 0 &&
			authChecked // Ensure we know if user is auth or guest
		) {
			// Validation before auto-creating order
			let canCreate = true;
			const { first_name, last_name, email, phone } = formData;
			if (!isAuthenticated) {
				// Guest validation
				if (!first_name || !last_name || !email || !phone) {
					canCreate = false;
					// console.log(
					// "Guest form not complete, delaying auto order creation for card."
					// );
				}
			} else if (isAuthenticated && !phone) {
				// Authenticated user must also have phone
				canCreate = false;
				// console.log(
				// "Authenticated user phone not provided, delaying auto order creation for card."
				// );
			}

			if (canCreate) {
				// console.log(
				// // "Auto-creating order record for card payment (step 2 reached)."
				// );
				createOrderBeforePayment();
			}
		}
	}, [
		step,
		pendingOrderId,
		isCreatingOrder,
		cartItems.length,
		authChecked,
		formData,
		isAuthenticated,
		createOrderBeforePayment,
	]);

	return {
		cartItems,
		formData,
		step,
		isLoading,
		isCreatingOrder,
		error,
		pendingOrderId,
		subtotal,
		tax,
		total,
		formatPrice,
		handleChange,
		nextStep,
		prevStep,
		createOrderBeforePayment, // Expose this if a button needs to manually trigger it
		handlePaymentSuccess,
		setError,
		isAuthenticated,
	};
};

export default useCheckout;
