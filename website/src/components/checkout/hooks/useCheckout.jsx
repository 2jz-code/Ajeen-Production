// File: combined/website/src/components/checkout/hooks/useCheckout.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../../api/api";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchCurrentCartData } from "../../utility/CartUtils";

const SURCHARGE_RATE_WEBSITE = 0.035;
const TAX_RATE = 0.08125;

const LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY = "checkoutFormData";
const LOCAL_STORAGE_PENDING_ORDER_ID_KEY = "pendingOrderId";

const useCheckout = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated, user, authChecked } = useAuth();

	const [cartItems, setCartItems] = useState([]);
	const [formData, setFormData] = useState(() => {
		const storedFormData = localStorage.getItem(
			LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY
		);
		const defaultFormData = {
			first_name: "",
			// Corrected: lastName to last_name to match formData structure and backend expectations
			last_name: "",
			email: "",
			phone: "",
			delivery_method: "pickup",
			payment_method: "card",
			notes: "",
		};
		try {
			const parsed = storedFormData ? JSON.parse(storedFormData) : {};
			return { ...defaultFormData, ...parsed }; // Merge to ensure all keys exist
		} catch (e) {
			return defaultFormData;
		}
	});

	const [pendingOrderId, setPendingOrderId] = useState(
		() => localStorage.getItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY) || null
	);

	const [step, setStep] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [isProcessingOrder, setIsProcessingOrder] = useState(false);
	const [error, setError] = useState(null);
	const prevUserRef = useRef(user);

	useEffect(() => {
		localStorage.setItem(
			LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY,
			JSON.stringify(formData)
		);
	}, [formData]);

	useEffect(() => {
		if (pendingOrderId) {
			localStorage.setItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY, pendingOrderId);
		} else {
			localStorage.removeItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY);
		}
	}, [pendingOrderId]);

	const formatPrice = (price) => {
		const numericPrice =
			typeof price === "string" ? parseFloat(price) : Number(price);
		return isNaN(numericPrice) ? "0.00" : numericPrice.toFixed(2);
	};

	const subtotal = cartItems.reduce(
		(sum, item) => sum + (Number(item.item_price) || 0) * (item.quantity || 0),
		0
	);
	const surchargeAmount = parseFloat(
		(subtotal * SURCHARGE_RATE_WEBSITE).toFixed(2)
	);
	const subtotalAfterSurcharge = subtotal + surchargeAmount;
	const tax = parseFloat((subtotalAfterSurcharge * TAX_RATE).toFixed(2));
	const tipAmount = 0.0;
	const discountAmount = 0.0;
	const total = parseFloat(
		(subtotalAfterSurcharge + tax + tipAmount - discountAmount).toFixed(2)
	);
	const surchargePercentageDisplay = `${(SURCHARGE_RATE_WEBSITE * 100).toFixed(
		1
	)}%`;
	const taxDisplay = `${(TAX_RATE * 100).toFixed(3)}%`;

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
	const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

	const prepareOrderForPayment = useCallback(async () => {
		// Check if already processing *inside* the function to prevent concurrent calls
		// This check is important if the function is called from multiple places or rapidly.
		if (isProcessingOrder) {
			console.log(
				"prepareOrderForPayment: Already processing, returning current pendingOrderId or null."
			);
			return pendingOrderId || null;
		}

		const { first_name, last_name, email, phone } = formData;
		let missingFieldNames = [];
		if (!isAuthenticated) {
			if (!first_name) missingFieldNames.push("First Name");
			if (!last_name) missingFieldNames.push("Last Name"); // Corrected key
			if (!email) missingFieldNames.push("Email");
		}
		if (!phone) missingFieldNames.push("Phone Number");

		if (missingFieldNames.length > 0) {
			setError(
				`Please fill in all required fields: ${missingFieldNames.join(", ")}.`
			);
			window.scrollTo(0, 0);
			return null; // Return null to indicate failure/stop
		}

		setIsProcessingOrder(true); // Set processing to true
		setError(null);
		const financialPayload = {
			subtotal: parseFloat(subtotal.toFixed(2)),
			tax_amount: parseFloat(tax.toFixed(2)),
			surcharge_amount: parseFloat(surchargeAmount.toFixed(2)),
			surcharge_percentage: SURCHARGE_RATE_WEBSITE,
			tip_amount: parseFloat(tipAmount.toFixed(2)),
			discount_amount: parseFloat(discountAmount.toFixed(2)),
			total_amount: parseFloat(total.toFixed(2)),
		};

		let orderDataPayload = { ...formData, ...financialPayload };
		let response;
		let orderIdToReturn = null;

		try {
			if (pendingOrderId) {
				orderDataPayload.order_id = pendingOrderId;
				console.log(
					"Frontend: Calling backend to UPDATE order record. Payload:",
					JSON.stringify(orderDataPayload, null, 2)
				);
				response = await axiosInstance.put(
					"website/checkout/",
					orderDataPayload
				);
			} else {
				console.log(
					"Frontend: Calling backend to CREATE order record. Payload:",
					JSON.stringify(orderDataPayload, null, 2)
				);
				response = await axiosInstance.post(
					"website/checkout/",
					orderDataPayload
				);
			}

			const orderIdFromServer = response.data.id || response.data.order_id;
			if (!orderIdFromServer) {
				setError(
					"Failed to prepare order for payment (no ID returned). Please try again."
				);
				orderIdToReturn = null;
			} else {
				if (!pendingOrderId || pendingOrderId !== orderIdFromServer) {
					setPendingOrderId(orderIdFromServer);
				}
				orderIdToReturn = orderIdFromServer;
			}
		} catch (err) {
			const errorMsg =
				err.response?.data?.error || "Failed to prepare your order.";
			setError(errorMsg);
			window.scrollTo(0, 0);
			orderIdToReturn = null;
		} finally {
			setIsProcessingOrder(false); // Set processing to false in finally block
		}
		return orderIdToReturn; // Return the orderId or null
	}, [
		formData,
		isAuthenticated,
		pendingOrderId, // isProcessingOrder removed from here
		subtotal,
		tax,
		surchargeAmount,
		total,
		tipAmount,
		discountAmount,
		// setPendingOrderId, setError, setIsProcessingOrder are stable setters
	]);

	const handlePaymentSuccess = (paymentResult) => {
		if (pendingOrderId) {
			localStorage.removeItem(LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY);
			localStorage.removeItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY);
			setPendingOrderId(null);

			const navigationState = {
				orderId: pendingOrderId,
				isGuest: !isAuthenticated,
				customerDetails: { ...formData },
				paymentIntentId: paymentResult?.paymentIntent?.id,
			};
			navigate("/confirmation", { state: navigationState });
		} else {
			setError("Payment succeeded but order finalization issue occurred.");
		}
	};

	useEffect(() => {
		if (!authChecked) return;
		setIsLoading(true);
		fetchCurrentCartData()
			.then((backendCartData) => {
				if (backendCartData?.items && backendCartData.items.length > 0) {
					setCartItems(backendCartData.items);
				} else {
					const storedFormDataExists = !!localStorage.getItem(
						LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY
					);
					if (
						!storedFormDataExists &&
						(!backendCartData || backendCartData.items.length === 0)
					) {
						navigate("/menu");
						return;
					}
				}

				const C_PREV_USER = prevUserRef.current;
				const lastSavedFormData = JSON.parse(
					localStorage.getItem(LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY) || "{}"
				);

				if (isAuthenticated && user) {
					setFormData((currentFormState) => {
						const getFieldVal = (
							profileVal,
							currentValInForm,
							prevProfileVal,
							lsVal
						) => {
							if (
								profileVal &&
								(!currentValInForm ||
									currentValInForm === prevProfileVal ||
									currentValInForm === lsVal)
							)
								return profileVal;
							return currentValInForm || lsVal || ""; // Ensure fallback to empty string
						};
						return {
							// ...lastSavedFormData, // Start with LS data
							first_name: getFieldVal(
								user.first_name,
								currentFormState.first_name,
								C_PREV_USER?.first_name,
								lastSavedFormData.first_name
							),
							last_name: getFieldVal(
								user.last_name,
								currentFormState.last_name,
								C_PREV_USER?.last_name,
								lastSavedFormData.last_name
							),
							email: getFieldVal(
								user.email,
								currentFormState.email,
								C_PREV_USER?.email,
								lastSavedFormData.email
							),
							phone: getFieldVal(
								user.phone_number,
								currentFormState.phone,
								C_PREV_USER?.phone_number,
								lastSavedFormData.phone
							),
							notes: currentFormState.notes || lastSavedFormData.notes || "",
							delivery_method: lastSavedFormData.delivery_method || "pickup",
							payment_method: lastSavedFormData.payment_method || "card",
						};
					});
				} else if (!isAuthenticated && authChecked) {
					if (C_PREV_USER) {
						// User just logged out
						setFormData({
							first_name: "",
							last_name: "",
							email: "",
							phone: "",
							delivery_method: lastSavedFormData.delivery_method || "pickup",
							payment_method: lastSavedFormData.payment_method || "card",
							notes: lastSavedFormData.notes || "",
						});
					} else {
						// Guest from start, formData already initialized from localStorage or default
						setFormData((prev) => ({
							...prev,
							...lastSavedFormData,
							payment_method: "card",
							delivery_method: "pickup",
						}));
					}
				}
				prevUserRef.current = user;
			})
			.catch((err) => {
				setError("Unable to load your cart. Please try refreshing.");
			})
			.finally(() => setIsLoading(false));
	}, [authChecked, isAuthenticated, user, navigate]);

	// Effect to call prepareOrderForPayment when moving to step 2 OR if cartItems/formData changes on step 2
	useEffect(() => {
		if (step === 2 && cartItems.length > 0 && authChecked) {
			// Check isProcessingOrder *inside* to prevent starting a new call if one is in progress
			if (!isProcessingOrder) {
				const { first_name, last_name, email, phone } = formData;
				let canProceed = true;
				if (!isAuthenticated) {
					if (!first_name || !last_name || !email) canProceed = false;
				}
				if (!phone) canProceed = false;

				if (canProceed) {
					console.log(
						"useEffect [step, cartItems...]: Triggering prepareOrderForPayment. Current pendingOrderId:",
						pendingOrderId
					);
					prepareOrderForPayment();
				} else {
					// Don't set error if already processing, error will be set by prepareOrderForPayment if needed
					console.log(
						"useEffect [step, cartItems...]: Contact info incomplete, not calling prepareOrderForPayment."
					);
					setError("Please complete your contact information to proceed.");
				}
			} else {
				console.log(
					"useEffect [step, cartItems...]: Skipped prepareOrderForPayment because isProcessingOrder is true."
				);
			}
		}
	}, [
		step,
		cartItems, // If cart items change (e.g. quantity update in another tab, then totals change), re-prepare.
		formData, // If form data changes (e.g. user edits phone number), re-validate and re-prepare.
		authChecked,
		isAuthenticated,
		prepareOrderForPayment, // This is a dependency as it's called.
		// isProcessingOrder is NOT a dependency here to break the loop.
		// pendingOrderId is implicitly handled by prepareOrderForPayment logic.
	]);

	useEffect(() => {
		const isCheckoutPage = location.pathname.includes("/checkout");
		if (cartItems.length === 0 && !isLoading && authChecked && isCheckoutPage) {
			if (
				pendingOrderId ||
				localStorage.getItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY)
			) {
				console.log(
					"Cart is empty while on checkout, clearing pending order ID and form data."
				);
				localStorage.removeItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY);
				localStorage.removeItem(LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY);
				setPendingOrderId(null);
				setFormData({
					first_name: "",
					last_name: "",
					email: "",
					phone: "",
					delivery_method: "pickup",
					payment_method: "card",
					notes: "",
				});
				if (step === 2) setStep(1);
			}
		}
	}, [
		cartItems.length,
		isLoading,
		authChecked,
		pendingOrderId,
		location.pathname,
		step,
		navigate,
	]); // Added navigate

	return {
		cartItems,
		formData,
		step,
		isLoading,
		isProcessingOrder,
		error,
		pendingOrderId,
		subtotal,
		surchargeAmount,
		surchargePercentageDisplay,
		taxDisplay,
		tax,
		total,
		formatPrice,
		handleChange,
		nextStep,
		prevStep,
		prepareOrderForPayment,
		handlePaymentSuccess,
		setError,
		isAuthenticated,
	};
};

export default useCheckout;
