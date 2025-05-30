// src/components/checkout/hooks/useCheckout.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../../api/api";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchCurrentCartData } from "../../utility/CartUtils";

// Debounce utility function
const debounce = (func, delay) => {
	let timeoutId;
	const debouncedFunc = (...args) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			func.apply(this, args);
		}, delay);
	};
	debouncedFunc.cancel = () => {
		clearTimeout(timeoutId);
	};
	return debouncedFunc;
};

// Phone formatting utility function
const formatPhoneNumber = (value) => {
	if (!value) return value;
	const phoneNumber = value.replace(/[^\d]/g, ""); // Remove all non-digits
	const phoneNumberLength = phoneNumber.length;

	if (phoneNumberLength < 4) return `(${phoneNumber}`;
	if (phoneNumberLength < 7) {
		return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
	}
	return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
		3,
		6
	)}-${phoneNumber.slice(6, 10)}`;
};

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
			last_name: "",
			email: "",
			phone: "",
			delivery_method: "pickup",
			payment_method: "card",
			notes: "",
		};
		try {
			const parsed = storedFormData ? JSON.parse(storedFormData) : {};
			return { ...defaultFormData, ...parsed };
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
	const isProcessingOrderRef = useRef(false);

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
		if (name === "phone") {
			const formattedPhone = formatPhoneNumber(value);
			setFormData((prev) => ({ ...prev, [name]: formattedPhone }));
		} else {
			setFormData((prev) => ({ ...prev, [name]: value }));
		}
		setError(null);
	};

	const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
	const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

	const prepareOrderLogic = useCallback(async () => {
		if (isProcessingOrderRef.current) {
			console.log(
				"prepareOrderLogic: Already processing an order creation/update. Aborting."
			);
			return;
		}

		const { first_name, last_name, email, phone } = formData;
		let missingFieldNames = [];
		if (!isAuthenticated) {
			if (!first_name) missingFieldNames.push("First Name");
			if (!last_name) missingFieldNames.push("Last Name");
			if (!email) missingFieldNames.push("Email");
		}
		const rawPhone = phone.replace(/[^\d]/g, ""); // Get raw digits for validation
		if (!rawPhone || rawPhone.length < 10) {
			// Basic validation for 10 digits
			missingFieldNames.push("Valid Phone Number (10 digits)");
		}

		if (missingFieldNames.length > 0) {
			setError(
				`Please fill in all required fields: ${missingFieldNames.join(", ")}.`
			);
			window.scrollTo(0, 0);
			return;
		}

		isProcessingOrderRef.current = true;
		setIsProcessingOrder(true);
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

		// Send the raw digits for the phone number to the backend
		const orderDataForApi = { ...formData, phone: rawPhone };
		let orderDataPayload = { ...orderDataForApi, ...financialPayload };
		let response;
		let orderIdToReturn = null;

		try {
			const currentPendingOrderIdFromStorage = localStorage.getItem(
				LOCAL_STORAGE_PENDING_ORDER_ID_KEY
			);
			if (currentPendingOrderIdFromStorage) {
				orderDataPayload.order_id = currentPendingOrderIdFromStorage;
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

			orderIdToReturn = response.data.id || response.data.order_id;
			if (!orderIdToReturn) {
				setError(
					"Failed to prepare order (no ID returned by backend). Please try again."
				);
			} else {
				if (pendingOrderId !== orderIdToReturn) {
					setPendingOrderId(orderIdToReturn);
				}
			}
		} catch (err) {
			const errorMsg =
				err.response?.data?.error ||
				"An error occurred while preparing your order.";
			setError(errorMsg);
			window.scrollTo(0, 0);
		} finally {
			isProcessingOrderRef.current = false;
			setIsProcessingOrder(false);
		}
	}, [
		formData,
		isAuthenticated,
		subtotal,
		tax,
		surchargeAmount,
		total,
		tipAmount,
		discountAmount,
		setError,
		setIsProcessingOrder,
		setPendingOrderId,
		pendingOrderId,
	]);

	const debouncedPrepareOrder = useCallback(
		debounce(() => {
			console.log("Debounced prepare order called");
			prepareOrderLogic();
		}, 750),
		[prepareOrderLogic]
	);

	useEffect(() => {
		if (step === 2 && cartItems.length > 0 && authChecked) {
			debouncedPrepareOrder();
		}
		return () => {
			debouncedPrepareOrder.cancel();
		};
	}, [step, cartItems, authChecked, formData, debouncedPrepareOrder]); // formData added to re-trigger debounce setup on its change

	const handlePaymentSuccess = (paymentResult) => {
		const currentPendingOrderId = localStorage.getItem(
			LOCAL_STORAGE_PENDING_ORDER_ID_KEY
		);

		if (currentPendingOrderId) {
			localStorage.removeItem(LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY);
			localStorage.removeItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY);
			setPendingOrderId(null);

			const navigationState = {
				orderId: currentPendingOrderId,
				isGuest: !isAuthenticated,
				customerDetails: { ...formData },
				paymentIntentId: paymentResult?.paymentIntent?.id,
			};
			navigate("/confirmation", { state: navigationState });
		} else {
			setError(
				"Payment succeeded but there was an issue finalizing your order (Order ID missing). Please contact support."
			);
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
					if (
						!localStorage.getItem(LOCAL_STORAGE_CHECKOUT_FORM_DATA_KEY) &&
						!localStorage.getItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY)
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
							return currentValInForm || lsVal || "";
						};
						return {
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
							// Format phone from user profile or LS if it exists
							phone: formatPhoneNumber(
								getFieldVal(
									user.phone_number,
									currentFormState.phone,
									C_PREV_USER?.phone_number,
									lastSavedFormData.phone
								)
							),
							notes: currentFormState.notes || lastSavedFormData.notes || "",
							delivery_method:
								currentFormState.delivery_method ||
								lastSavedFormData.delivery_method ||
								"pickup",
							payment_method:
								currentFormState.payment_method ||
								lastSavedFormData.payment_method ||
								"card",
						};
					});
				} else if (!isAuthenticated && authChecked) {
					if (C_PREV_USER) {
						setFormData({
							first_name: "",
							last_name: "",
							email: "",
							phone: formatPhoneNumber(lastSavedFormData.phone || ""), // Format phone from LS
							delivery_method: lastSavedFormData.delivery_method || "pickup",
							payment_method: lastSavedFormData.payment_method || "card",
							notes: lastSavedFormData.notes || "",
						});
					} else {
						setFormData((prev) => ({
							...prev,
							...lastSavedFormData,
							phone: formatPhoneNumber(
								lastSavedFormData.phone || prev.phone || ""
							), // Format phone from LS or existing prev state
						}));
					}
				}
				prevUserRef.current = user;
			})
			.catch((err) => {
				setError(
					"Unable to load your cart details. Please refresh the page or try again later."
				);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [authChecked, isAuthenticated, user, navigate]);

	useEffect(() => {
		const isCheckoutPage = location.pathname.includes("/checkout");
		if (cartItems.length === 0 && !isLoading && authChecked && isCheckoutPage) {
			if (localStorage.getItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY)) {
				console.log(
					"Cart is empty while on checkout page with a pending order. Clearing pending order."
				);
				localStorage.removeItem(LOCAL_STORAGE_PENDING_ORDER_ID_KEY);
				setPendingOrderId(null);
				if (step === 2) setStep(1);
			}
		}
	}, [
		cartItems.length,
		isLoading,
		authChecked,
		location.pathname,
		step,
		navigate,
	]);

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
		handlePaymentSuccess,
		setError,
		isAuthenticated,
	};
};

export default useCheckout;
