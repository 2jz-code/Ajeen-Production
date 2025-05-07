// src/components/confirmation/hooks/useOrderDetails.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../../api/api";
// Removed useAuth import here, as isAuthenticated is passed as an argument

const useOrderDetails = (isAuthenticated) => {
	// Receive isAuthenticated as an argument
	const [orderDetails, setOrderDetails] = useState(null);
	const [estimatedTime, setEstimatedTime] = useState(null);
	const [liveStatus, setLiveStatus] = useState("pending");
	const [isLoading, setIsLoading] = useState(true); // Start loading true for auth check
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();
	const { orderId: orderIdFromState } = location.state || {}; // Get orderId directly
	const socketRef = useRef(null);

	// --- Helper Functions (Formatters) ---
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
		console.log("Attempting to connect WebSocket to:", wsUrl); // For debugging
		// +++ MODIFICATION END +++

		socketRef.current = new WebSocket(wsUrl); // Use the constructed URL

		socketRef.current.onopen = () => {
			console.log("WebSocket connected for order:", orderId);
		};

		socketRef.current.onmessage = (event) => {
			console.log("WebSocket message received:", event.data);
			try {
				const data = JSON.parse(event.data);
				console.log("Parsed WebSocket data:", data);

				if (data.type === "order_status_update") {
					setLiveStatus(data.status);
					if (data.estimated_preparation_time !== undefined) {
						console.log(
							"Updating estimated time to:",
							data.estimated_preparation_time
						);
						setEstimatedTime(data.estimated_preparation_time);
					}
				} else if (data.type === "prep_time_update") {
					console.log(
						"Received prep time update:",
						data.estimated_preparation_time
					);
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
			console.log(
				"WebSocket connection closed, code:",
				event.code,
				"reason:",
				event.reason
			);
		};
	};
	// --- End WebSocket Setup ---

	// --- Fetch Order Details (Conditional based on Authentication) ---
	useEffect(() => {
		if (!isAuthenticated) {
			console.log("Guest user detected in useOrderDetails, skipping fetch.");
			setIsLoading(false);
			setOrderDetails(null);
			return;
		}

		console.log("Location state in useOrderDetails:", location.state);
		const currentOrderId = orderIdFromState;
		console.log("Order ID from location state:", currentOrderId);

		if (!currentOrderId) {
			setError("No order ID found. Please check your order history.");
			setIsLoading(false);
			return;
		}

		const fetchOrderDetails = async () => {
			try {
				setIsLoading(true);
				setError(null);
				console.log(
					`Fetching order details for authenticated user, Order ID: ${currentOrderId}`
				);
				// Ensure the API endpoint for fetching order details is correct
				// The path should be relative to the baseURL configured in axiosInstance
				const response = await axiosInstance.get(
					`website/orders/${currentOrderId}/` // Example: 'api/website/orders/...' if baseURL is 'http://localhost:8000/'
					// Or '/website/orders/...' if baseURL is 'http://localhost:8000/api/'
				);
				console.log("Order details response:", response.data);

				setOrderDetails(response.data);
				setLiveStatus(response.data.status || "pending");
				setupWebSocketConnection(currentOrderId);
			} catch (error) {
				console.error("Failed to fetch order details:", error);
				setError(
					error.response?.data?.error ||
						`Unable to load order details (ID: ${currentOrderId}). Please try refreshing.`
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchOrderDetails();

		return () => {
			if (socketRef.current) {
				socketRef.current.close();
				console.log("WebSocket connection closed on unmount/dependency change");
				socketRef.current = null;
			}
		};
	}, [orderIdFromState, isAuthenticated, location.state]); // Added location.state as it contains orderIdFromState

	return {
		orderDetails,
		estimatedTime,
		liveStatus,
		isLoading,
		error,
		navigate,
		orderId: orderIdFromState,
		formatPrice,
		formatDate,
		renderEstimatedTime,
	};
};

export default useOrderDetails;
