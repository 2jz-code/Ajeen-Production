// src/contexts/WebSocketContext.js
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	useCallback,
} from "react";
import PropTypes from "prop-types";
// +++ Import your local hardware service function +++
import { printGenericTicketWithAgent } from "../api/services/localHardwareService";

// Define initial WebSocket endpoints by category
const WS_ENDPOINTS = {
	// HARDWARE: {
	//  // CASH_DRAWER: "hardware/cash-drawer",
	//  // CARD_PAYMENT: "hardware/card-payment",
	//  RECEIPT_PRINTER: "hardware/receipt-printer",
	// },
	BUSINESS: {
		KITCHEN: "kitchen/orders", // For kitchen display updates
		POS: "pos_updates", // For POS specific updates, including print jobs
	},
};

// Create context
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
	// Initialize connection states for all endpoints
	const initialConnectionStates = Object.entries(WS_ENDPOINTS).reduce(
		(categories, [category, endpoints]) => {
			categories[category] = Object.keys(endpoints).reduce(
				(endpointStates, name) => {
					endpointStates[name] = { isConnected: false, error: null };
					return endpointStates;
				},
				{}
			);
			return categories;
		},
		{}
	);

	const [connections, setConnections] = useState(initialConnectionStates);
	const wsRefs = useRef({});

	useEffect(() => {
		Object.entries(WS_ENDPOINTS).forEach(([category, endpoints]) => {
			Object.keys(endpoints).forEach((name) => {
				if (!wsRefs.current[`${category}.${name}`]) {
					wsRefs.current[`${category}.${name}`] = null;
				}
			});
		});
	}, []);

	const reconnectAttempts = useRef({});

	const calculateReconnectDelay = useCallback((endpointKey) => {
		if (!reconnectAttempts.current[endpointKey]) {
			reconnectAttempts.current[endpointKey] = 0;
		}
		reconnectAttempts.current[endpointKey]++;
		if (reconnectAttempts.current[endpointKey] > 10) {
			reconnectAttempts.current[endpointKey] = 1;
		}
		const delay = Math.min(
			1000 * Math.pow(1.5, reconnectAttempts.current[endpointKey] - 1),
			30000
		);
		return delay + Math.random() * 1000;
	}, []);

	const getWebSocketUrl = useCallback((category, endpointName) => {
		const path = WS_ENDPOINTS[category]?.[endpointName];
		if (!path) {
			throw new Error(
				`Unknown WebSocket path for: ${category}.${endpointName}`
			);
		}
		const baseWsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8001/ws";
		const cleanBase = baseWsUrl.endsWith("/")
			? baseWsUrl.slice(0, -1)
			: baseWsUrl;
		const cleanPath = path.startsWith("/") ? path.slice(1) : path;

		// For POS updates, if your backend routing includes a location_id placeholder,
		// you might need to inject it here.
		// For now, assuming /ws/pos_updates/ as per your routing.py for the global POS connection.
		// If location specific: e.g. `${cleanBase}/${cleanPath}/${locationId}/`
		return `${cleanBase}/${cleanPath}/`;
	}, []);

	const connect = useCallback(
		(category, endpointName) => {
			const endpointKey = `${category}.${endpointName}`;

			try {
				if (wsRefs.current[endpointKey]?.readyState === WebSocket.OPEN) {
					// console.log(`${endpointKey} WebSocket already connected`);
					return;
				}
				if (wsRefs.current[endpointKey]) {
					wsRefs.current[endpointKey].close();
				}

				const wsUrl = getWebSocketUrl(category, endpointName);
				// console.log(`Connecting to ${wsUrl} for ${endpointKey}`);

				const ws = new WebSocket(wsUrl);
				wsRefs.current[endpointKey] = ws;

				ws.onopen = () => {
					// console.log(`${endpointKey} WebSocket Connected`);
					setConnections((prev) => ({
						...prev,
						[category]: {
							...prev[category],
							[endpointName]: { isConnected: true, error: null },
						},
					}));
					reconnectAttempts.current[endpointKey] = 0; // Reset on successful connect
				};

				ws.onmessage = (e) => {
					try {
						const data = JSON.parse(e.data);
						// console.log(`${endpointKey} WebSocket received:`, data);

						// +++ Specific handler for print jobs from the POS endpoint +++
						if (category === "BUSINESS" && endpointName === "POS") {
							if (data.type === "new_website_order_for_printing") {
								// console.log(
								// 	`Received print jobs for order ${data.order_id}:`,
								// 	data.print_jobs
								// );
								if (data.print_jobs && Array.isArray(data.print_jobs)) {
									data.print_jobs.forEach((job) => {
										// console.log(
										// 	`Attempting to print job via agent for printer: ${job.printer_id}`,
										// 	job
										// );
										printGenericTicketWithAgent(job) // Assuming printJob structure matches agent's expectation
											.then((response) => {
												if (response.success) {
													// console.log(
													// 	`Successfully sent print job for ${job.printer_id} (Order: ${data.order_id})`
													// );
													// Optionally, dispatch a success notification to UI
												} else {
													console.error(
														`Failed to send print job for ${job.printer_id} (Order: ${data.order_id}): ${response.message}`
													);
													// Optionally, dispatch an error notification to UI
												}
											})
											.catch((err) => {
												console.error(
													`Critical error calling printGenericTicketWithAgent for ${job.printer_id} (Order: ${data.order_id}):`,
													err
												);
												// Optionally, dispatch an error notification to UI
											});
									});
								} else {
									console.warn(
										"Received 'new_website_order_for_printing' but 'print_jobs' was missing or not an array."
									);
								}
								return; // Handled this message type specifically
							}
							// Potentially other 'POS' specific message types here
						}

						// Fallback to generic window event dispatch for other messages or other endpoints
						const event = new CustomEvent("websocket-message", {
							detail: {
								...data,
								_source: { category, endpoint: endpointName },
							},
						});
						window.dispatchEvent(event);
					} catch (err) {
						console.error(`Error processing message from ${endpointKey}:`, err);
					}
				};

				ws.onclose = (event) => {
					// console.log(
					// 	`${endpointKey} WebSocket Disconnected:`,
					// 	event.code,
					// 	event.reason
					// );
					setConnections((prev) => ({
						...prev,
						[category]: {
							...prev[category],
							[endpointName]: {
								...prev[category]?.[endpointName], // Keep potential error message
								isConnected: false,
							},
						},
					}));
					if (!event.wasClean) {
						// Only attempt reconnect if not a clean closure
						const delay = calculateReconnectDelay(endpointKey);
						// console.log(
						// 	`Will attempt to reconnect ${endpointKey} in ${delay}ms`
						// );
						setTimeout(() => {
							if (document.visibilityState !== "hidden") {
								connect(category, endpointName);
							}
						}, delay);
					}
				};

				ws.onerror = (err) => {
					console.error(`${endpointKey} WebSocket Error:`, err);
					setConnections((prev) => ({
						...prev,
						[category]: {
							...prev[category],
							[endpointName]: {
								isConnected: false, // Ensure isConnected is false on error
								error: "WebSocket connection error",
							},
						},
					}));
					// onclose will handle the reconnection logic
				};
			} catch (err) {
				console.error(`${endpointKey} Connection setup error:`, err);
				setConnections((prev) => ({
					...prev,
					[category]: {
						...prev[category],
						[endpointName]: {
							isConnected: false,
							error: err.message,
						},
					},
				}));
			}
		},
		[calculateReconnectDelay, getWebSocketUrl]
	);

	// Send a message to a specific endpoint (if needed by POS frontend to send to this consumer)
	const sendMessage = useCallback(
		(category, endpointName, message) => {
			const endpointKey = `${category}.${endpointName}`;
			if (wsRefs.current[endpointKey]?.readyState !== WebSocket.OPEN) {
				console.error(
					`${endpointKey} WebSocket is not connected. Attempting to reconnect.`
				);
				connect(category, endpointName); // Try to reconnect before failing
				// It might be better to queue message or return a promise that resolves after connection
				return false;
			}
			const formattedMessage = {
				...message,
				// id: Date.now().toString(), // Backend might not need these for messages from client
				// timestamp: new Date().toISOString(),
			};
			// console.log(`Sending message to ${endpointKey}:`, formattedMessage);
			wsRefs.current[endpointKey].send(JSON.stringify(formattedMessage));
			return true;
		},
		[connect]
	);

	const reconnect = useCallback(
		(category, endpointName) => {
			const endpointKey = `${category}.${endpointName}`;
			if (!WS_ENDPOINTS[category] || !WS_ENDPOINTS[category][endpointName]) {
				console.error(`Cannot reconnect - unknown endpoint: ${endpointKey}`);
				return false;
			}
			reconnectAttempts.current[endpointKey] = 0;
			connect(category, endpointName);
			return true;
		},
		[connect]
	);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				// console.log("Tab is now visible, checking connections...");
				Object.entries(WS_ENDPOINTS).forEach(([category, endpoints]) => {
					Object.keys(endpoints).forEach((endpointName) => {
						const endpointKey = `${category}.${endpointName}`;
						if (
							wsRefs.current[endpointKey]?.readyState !== WebSocket.OPEN &&
							wsRefs.current[endpointKey]?.readyState !== WebSocket.CONNECTING
						) {
							// Also check for CONNECTING
							// console.log(
							// 	`Reconnecting to ${endpointKey} after visibility change`
							// );
							connect(category, endpointName);
						}
					});
				});
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		Object.entries(WS_ENDPOINTS).forEach(([category, endpoints]) => {
			Object.keys(endpoints).forEach((endpointName) => {
				connect(category, endpointName);
			});
		});

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			Object.values(wsRefs.current).forEach((wsInstance) => {
				if (wsInstance) {
					wsInstance.close(1000, "Component unmounting"); // Use code 1000 for normal closure
				}
			});
		};
	}, [connect]); // `connect` is memoized with useCallback

	const contextValue = {
		connections,
		sendMessage, // Expose sendMessage if POS needs to send messages to POSUpdatesConsumer
		endpoints: WS_ENDPOINTS,
		reconnect,
	};

	return (
		<WebSocketContext.Provider value={contextValue}>
			{children}
		</WebSocketContext.Provider>
	);
};

WebSocketProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export const useWebSocketContext = () => {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error(
			"useWebSocketContext must be used within a WebSocketProvider"
		);
	}
	return context;
};
