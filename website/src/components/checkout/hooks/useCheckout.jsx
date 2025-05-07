// src/components/checkout/hooks/useCheckout.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/api";
import { useAuth } from "../../../contexts/AuthContext";
// Import CartUtils to fetch cart data consistently
import { fetchCurrentCartData } from "../../utility/CartUtils"; // <--- IMPORT CartUtils

const useCheckout = () => {
	const [isCreatingOrder, setIsCreatingOrder] = useState(false);
	const [cartItems, setCartItems] = useState([]);
	const [totalPrice, setTotalPrice] = useState(0); // This might be redundant if using calculated total
	const [step, setStep] = useState(1); // 1: Review Cart, 2: Payment & Pickup
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	// Use authChecked to wait until auth status is confirmed
	const { isAuthenticated, user, authChecked } = useAuth(); // <--- Add authChecked
	const [pendingOrderId, setPendingOrderId] = useState(null);

	// Initialize form based on auth status
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		email: "",
		phone: "",
		delivery_method: "pickup", // Fixed to pickup
		payment_method: "cash", // Default to cash
		notes: "",
	});
	// Format price helper
	const formatPrice = (price) => {
		if (price === null || price === undefined) {
			return "0.00";
		}
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		if (isNaN(numericPrice)) {
			return "0.00";
		}
		return numericPrice.toFixed(2);
	};

	// Calculate price components
	const subtotal = cartItems.reduce(
		(sum, item) => sum + item.item_price * item.quantity,
		0
	);
	const tax = subtotal * 0.1; // 8% tax
	const total = subtotal + tax; // No delivery fee

	// Create order for card payment
	const createOrderForCardPayment = async () => {
		if (isCreatingOrder || pendingOrderId) return;

		console.log("Creating order for card payment...");
		setIsCreatingOrder(true);
		setIsSubmitting(true);
		setError(null);

		// Determine endpoint based on auth status
		const endpoint = isAuthenticated
			? "website/checkout/"
			: "website/guest-checkout/"; // <--- Use guest endpoint

		try {
			const response = await axiosInstance.post(endpoint, {
				...formData,
				delivery_method: "pickup", // Always pickup
				payment_method: "card",
				notes: formData.notes,
			});

			console.log("Order creation response:", response.data);
			// Assuming backend returns 'id' for guest order and 'order_id'/'id' for auth order
			const orderId = response.data.id || response.data.order_id;

			if (!orderId) {
				console.error("No order ID found in the response:", response.data);
				setError("Failed to create order. Please try again.");
				return; // Return early if no orderId
			}

			console.log("Order created successfully with ID:", orderId);
			setPendingOrderId(orderId);
		} catch (error) {
			console.error("Failed to create order:", error);
			const errorMsg =
				error.response?.data?.error ||
				"Failed to create your order. Please check your information and try again.";
			setError(errorMsg);
			window.scrollTo(0, 0);
		} finally {
			setIsCreatingOrder(false);
			setIsSubmitting(false); // Keep submitting true until payment attempt for card
		}
	};

	// Handle form field changes
	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Handle radio button changes
	const handleRadioChange = async (name, value) => {
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));

		if (name === "payment_method" && value === "card") {
			if (step === 2 && !pendingOrderId && !isCreatingOrder) {
				console.log(
					"Card payment selected, checking if we need to create order..."
				);
				await createOrderForCardPayment(); // Await this
			}
		}
	};

	// Navigate between steps
	const nextStep = () => setStep((prev) => Math.min(prev + 1, 2)); // Now only 2 steps
	const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

	// Handle checkout submission
	const handleSubmit = async (e) => {
		if (e && e.preventDefault) {
			e.preventDefault();
		}
		// If card payment, the order is already created or being created, rely on PaymentForm
		if (formData.payment_method === "card") {
			console.log("Card payment selected, PaymentForm handles submission.");
			// Potentially trigger Stripe form submission here if needed, but likely handled within PaymentForm
			return;
		}

		console.log(
			"handleSubmit called for CASH payment with formData:",
			formData
		);
		setIsSubmitting(true);
		setError(null);

		// Determine endpoint based on auth status
		const endpoint = isAuthenticated
			? "website/checkout/"
			: "website/guest-checkout/"; // <--- Use guest endpoint

		try {
			console.log(`Submitting cash order to ${endpoint}...`);
			const response = await axiosInstance.post(endpoint, {
				...formData,
				delivery_method: "pickup", // Always pickup
				payment_method: "cash", // Explicitly cash
				notes: formData.notes,
			});

			console.log("Cash Checkout response:", response.data);
			// Assuming backend returns 'id' for guest order and 'order_id'/'id' for auth order
			const orderId = response.data.id || response.data.order_id;

			if (!orderId) {
				console.error("No order ID found in the response:", response.data);
				setError(
					"Order was created but no order ID was returned. Please contact support."
				);
				setIsSubmitting(false);
				return;
			}

			console.log("Cash Order created successfully with ID:", orderId);
			// Navigate to confirmation for cash orders
			const navigationState = {
				orderId: orderId,
				isGuest: !isAuthenticated,
			};
			if (!isAuthenticated) {
				navigationState.guestEmail = formData.email; // Add guest email
			}
			navigate("/confirmation", { state: navigationState });
		} catch (error) {
			console.error("Cash Checkout failed:", error);
			const errorMsg =
				error.response?.data?.error ||
				"Failed to process your order. Please check your information and try again.";
			setError(errorMsg);
			window.scrollTo(0, 0);
			setIsSubmitting(false);
		}
		// No finally setIsSubmitting(false) here, navigation happens on success
	};

	// Handle successful payment (from Stripe)
	const handlePaymentSuccess = (paymentResult) => {
		console.log("Payment successful:", paymentResult);
		if (pendingOrderId) {
			// --- MODIFICATION START ---
			// Pass necessary details to confirmation page state
			const navigationState = {
				orderId: pendingOrderId,
				isGuest: !isAuthenticated,
			};
			if (!isAuthenticated) {
				navigationState.guestEmail = formData.email; // Add guest email
			}
			navigate("/confirmation", { state: navigationState });
			// --- MODIFICATION END ---
		} else {
			console.error("Payment success called but no pending order ID found!");
			setError("Payment succeeded but we couldn't find your order details.");
		}
	};

	// Redirect if not authenticated
	// useEffect(() => {
	// 	if (!isAuthenticated && !isLoading) {
	// 		navigate("/login", { state: { from: "/checkout" } });
	// 	}
	// }, [isAuthenticated, isLoading, navigate]);

	useEffect(() => {
		// Only run fetch when auth status is known
		if (!authChecked) {
			return;
		}

		const fetchCart = async () => {
			setIsLoading(true);
			setError(null);
			try {
				// Use the utility function which handles guest/auth automatically
				const cartData = await fetchCurrentCartData();

				if (!cartData || !cartData.items || cartData.items.length === 0) {
					console.log("Cart is empty or not found, redirecting to menu.");
					navigate("/menu");
					return;
				}

				console.log("Fetched Cart Data:", cartData);
				setCartItems(cartData.items || []); // Ensure items is an array

				// Recalculate totals based on fetched cart items
				const fetchedSubtotal = (cartData.items || []).reduce(
					(sum, item) => sum + (item.item_price || 0) * (item.quantity || 0),
					0
				);
				const fetchedTax = fetchedSubtotal * 0.1;
				setTotalPrice(fetchedSubtotal + fetchedTax); // Update total based on fetched cart
			} catch (error) {
				console.error("Failed to fetch cart items:", error);
				setError(
					"Unable to load your cart. Please refresh the page or try again."
				);
				// Optional: Redirect on critical error?
				// navigate('/menu');
			} finally {
				setIsLoading(false);
			}
		};

		fetchCart();
	}, [navigate, authChecked]);

	// Initialize form data based on user authentication status
	useEffect(() => {
		// Only run when auth status is known and user data might be available
		if (authChecked) {
			if (isAuthenticated && user) {
				console.log("User is authenticated, pre-filling form.");
				setFormData((prev) => ({
					...prev,
					first_name: user.first_name || "",
					last_name: user.last_name || "",
					email: user.email || "",
					phone: user.phone_number || "", // Adjust field name if necessary
				}));
			} else {
				console.log("User is guest, clearing personal info fields.");
				// Ensure fields are cleared for guests or if user data isn't loaded
				setFormData((prev) => ({
					...prev,
					first_name: "",
					last_name: "",
					email: "",
					phone: "",
				}));
			}
		}
	}, [user, isAuthenticated, authChecked]);

	// Auto-create order when card payment is selected (Guest or Auth)
	useEffect(() => {
		if (
			step === 2 &&
			formData.payment_method === "card" &&
			!pendingOrderId &&
			!isCreatingOrder &&
			cartItems.length > 0 // Only create if cart has items
		) {
			console.log(
				"User at payment step with card selected but no order yet, creating order..."
			);
			createOrderForCardPayment();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		step,
		formData.payment_method,
		pendingOrderId,
		isCreatingOrder,
		cartItems,
	]); // Add cartItems dependency

	return {
		cartItems,
		formData,
		step,
		isLoading,
		isSubmitting, // Use this for disabling buttons
		error,
		pendingOrderId,
		isCreatingOrder, // Use this for showing loading states for order creation
		subtotal,
		tax,
		total, // Use this calculated total
		formatPrice,
		handleChange,
		handleRadioChange,
		nextStep,
		prevStep,
		handleSubmit, // Primarily for cash now
		handlePaymentSuccess,
		setError,
		isAuthenticated, // Pass down for conditional rendering
	};
};

export default useCheckout;
