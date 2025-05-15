// File: combined/website/src/components/confirmation/hooks/useOrderDetails.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../../api/api";

const useOrderDetails = (isAuthenticated) => {
	const [orderDetails, setOrderDetails] = useState(null); // Full details from API
	// State to store customer details passed via navigation
	const [customerDetailsFromState, setCustomerDetailsFromState] =
		useState(null);
	const [estimatedTime, setEstimatedTime] = useState(null);
	const [liveStatus, setLiveStatus] = useState("pending");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();

	// Extract orderId and customerDetails from location.state
	const {
		orderId: orderIdFromRouterState,
		customerDetails: navCustomerDetails,
		isGuest: isGuestFromRouterState,
	} = location.state || {};
	const socketRef = useRef(null);

	useEffect(() => {
		if (navCustomerDetails) {
			// console.log(
			// 	"useOrderDetails: Received customerDetails from navigation state:",
			// 	navCustomerDetails
			// );
			setCustomerDetailsFromState(navCustomerDetails);
		}
	}, [navCustomerDetails]);

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

	const formatDate = (dateString) => {
		if (!dateString) return "";
		const options = {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		};
		return new Date(dateString).toLocaleDateString(undefined, options);
	};

	const renderEstimatedTime = () => {
		if (liveStatus === "completed") {
			return "Your order is ready!";
		} else if (liveStatus === "cancelled") {
			return "Order cancelled";
		} else if (estimatedTime) {
			return `${estimatedTime} minutes`;
		} else {
			return "Calculating...";
		}
	};
	// --- End Helper Functions ---

	// --- WebSocket Setup (Only for Authenticated Users) ---
	const setupWebSocketConnection = (orderId) => {
		if (!isAuthenticated) {
			console.log("Guest user, skipping WebSocket connection.");
			return;
		}

		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			console.log("WebSocket connection already open.");
			return;
		}

		// +++ MODIFICATION START: Use environment variable for WebSocket URL +++
		const baseWsUrl = process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws"; // Default for local dev
		const wsUrl = `${baseWsUrl}/website/orders/${orderId}/`;
		// console.log("Attempting to connect WebSocket to:", wsUrl); // For debugging
		// +++ MODIFICATION END +++

		socketRef.current = new WebSocket(wsUrl); // Use the constructed URL

		socketRef.current.onopen = () => {
			console.log("WebSocket connected for order:", orderId);
		};

		socketRef.current.onmessage = (event) => {
			// console.log("WebSocket message received:", event.data);
			try {
				const data = JSON.parse(event.data);
				// console.log("Parsed WebSocket data:", data);

				if (data.type === "order_status_update") {
					setLiveStatus(data.status);
					if (data.estimated_preparation_time !== undefined) {
						// console.log(
						// "Updating estimated time to:",
						// data.estimated_preparation_time
						// );
						setEstimatedTime(data.estimated_preparation_time);
					}
				} else if (data.type === "prep_time_update") {
					// console.log(
					// "Received prep time update:",
					// data.estimated_preparation_time
					// );
					setEstimatedTime(data.estimated_preparation_time);
				}
			} catch (error) {
				console.error("Error parsing WebSocket message:", error);
			}
		};

		socketRef.current.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		socketRef.current.onclose = (event) => {
			// console.log(
			// "WebSocket connection closed, code:",
			// event.code,
			// "reason:",
			// event.reason
			// );
		};
	};
	// --- End WebSocket Setup ---

	useEffect(() => {
		const currentOrderId = orderIdFromRouterState;

		if (!currentOrderId) {
			setError("Order ID not found. Unable to display confirmation.");
			setIsLoading(false);
			return;
		}

		// If it's a guest and we have details from navigation, we can use them immediately.
		// We might still want to fetch from backend to confirm and get latest status,
		// but this allows showing some info quicker.
		if (isGuestFromRouterState && customerDetailsFromState) {
			// Populate a basic orderDetails structure for guests immediately
			setOrderDetails({
				id: currentOrderId,
				guest_first_name: customerDetailsFromState.firstName,
				guest_last_name: customerDetailsFromState.lastName,
				guest_email: customerDetailsFromState.email,
				// guest_phone: customerDetailsFromState.phone, // Key addition
				status: "pending", // Initial assumption for guest before any fetch
				payment_status: "pending", // Assume pending until confirmed otherwise
			});
			setLiveStatus("pending"); // Set initial live status
			// For guests, we might not fetch full details again if the above is sufficient,
			// or we can still proceed to fetch to get the *actual* latest status and items.
			// The current logic below will still attempt to fetch if isAuthenticated is true.
			// If you want guests to *also* fetch full order details, remove/adjust the !isAuthenticated check.
		}

		const fetchOrder = async () => {
			// Only fetch full details if authenticated OR if you decide guests should also re-fetch
			// Your current code already has: if (!isAuthenticated) { setIsLoading(false); setOrderDetails(null); return; }
			// We will modify this slightly.
			if (!isAuthenticated) {
				// For guests, we've already set basic details from customerDetailsFromState.
				// If you *don't* want to hit the backend API again for guest confirmation page,
				// you can simply set loading to false here.
				// However, to get items and accurate current status, a fetch might still be desired,
				// but it would need a secure guest order lookup endpoint.
				// Your current code skips backend fetch for guests in this hook. We'll honor that.
				// console.log(
				// "Guest user detected in useOrderDetails. Using passed data primarily."
				// );
				setIsLoading(false);
				// Note: WebSocket is also skipped for guests in your `setupWebSocketConnection`.
				return;
			}

			// Proceed to fetch for authenticated users
			setIsLoading(true);
			setError(null);
			try {
				const response = await axiosInstance.get(
					`website/orders/${currentOrderId}/`
				);
				// console.log("Fetched order details (authenticated):", response.data);
				setOrderDetails(response.data); // This should include guest_phone if backend serializer is correct
				setLiveStatus(response.data.status || "pending");
				// If customerDetailsFromState exists, it's good, but API is source of truth for auth users
				// No need to merge here if API provides all (first_name, email, phone etc.)
				setupWebSocketConnection(currentOrderId);
			} catch (err) {
				console.error("Failed to fetch order details (authenticated):", err);
				setError(
					err.response?.data?.error ||
						`Unable to load order details (ID: ${currentOrderId}).`
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchOrder();

		return () => {
			if (socketRef.current) {
				socketRef.current.close();
				socketRef.current = null;
			}
		};
	}, [
		orderIdFromRouterState,
		isAuthenticated,
		customerDetailsFromState,
		isGuestFromRouterState,
	]); // Added dependencies

	return {
		orderDetails, // From API for auth, or constructed from navState for guest
		customerDetailsFromState, // Always has the data passed from checkout
		estimatedTime,
		liveStatus,
		isLoading,
		error,
		navigate,
		orderId: orderIdFromRouterState,
		isGuest: isGuestFromRouterState,
		formatPrice,
		formatDate,
		renderEstimatedTime,
	};
};

export default useOrderDetails;
