// src/features/cart/hooks/useCart.js
import { useEffect, useRef } from "react"; // Added useRef
import { useCartStore } from "../../../store/cartStore";
import axiosInstance from "../../../api/config/axiosConfig";
import { checkOrderStatus } from "../../../utils/cartUtils";

export const useCart = () => {
	const {
		cart,
		orderId,
		showOverlay,
		setShowOverlay,
		setCart,
		orderDiscount,
		setOrderDiscount,
	} = useCartStore();

	// Ref to track the orderId currently being initialized/fetched
	const initializingOrderIdRef = useRef(null);
	// Ref to track if the component is mounted (optional but good for async safety)
	const isMountedRef = useRef(false);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		const initializeCart = async () => {
			console.log(
				`[useCart] initializeCart called. Current orderId: ${orderId}, initializingRef: ${initializingOrderIdRef.current}`
			);

			if (orderId) {
				// If an initialization for THIS orderId is already in progress, skip.
				if (initializingOrderIdRef.current === orderId) {
					console.log(
						`[useCart] Initialization for order ${orderId} already in progress. Skipping.`
					);
					return;
				}
				// Mark that we are now initializing this orderId
				initializingOrderIdRef.current = orderId;

				try {
					const {
						isValid,
						data,
						error: checkStatusError,
					} = await checkOrderStatus(orderId, axiosInstance);

					// Ensure component is still mounted before updating state
					if (!isMountedRef.current) {
						console.log(
							"[useCart] Component unmounted during initializeCart. Aborting state updates."
						);
						initializingOrderIdRef.current = null; // Reset ref on abort
						return;
					}

					if (!isValid) {
						console.log(
							`[useCart] Order ${orderId} is not valid (status error: ${
								checkStatusError?.message || "unknown reason"
							}). Resetting cart state.`
						);
						// Only reset if the current orderId in store is the one that failed validation
						if (useCartStore.getState().orderId === orderId) {
							useCartStore.setState({
								orderId: null,
								cart: [],
								orderDiscount: null,
								showOverlay: true, // Ensure overlay is shown
							});
						}
					} else {
						console.log(
							`[useCart] Order ${orderId} is valid. Setting cart and overlay.`
						);
						setShowOverlay(false);
						setCart(data.items); // This will trigger saveCartToBackend in cartStore

						if (data.discount) {
							try {
								const discountResponse = await axiosInstance.get(
									`discounts/${data.discount}/`
								);
								if (isMountedRef.current) {
									setOrderDiscount(discountResponse.data);
								}
							} catch (error) {
								console.error(
									"[useCart] Failed to load discount details:",
									error
								);
							}
						} else {
							// If no discount in data, ensure it's cleared locally if it was for this orderId
							if (
								isMountedRef.current &&
								useCartStore.getState().orderId === orderId
							) {
								setOrderDiscount(null);
							}
						}
					}
				} catch (e) {
					// Catch any unexpected error during the async process
					console.error("[useCart] Unexpected error in initializeCart:", e);
					if (
						isMountedRef.current &&
						useCartStore.getState().orderId === orderId
					) {
						// Potentially reset cart if a critical error occurred
						useCartStore.setState({
							orderId: null,
							cart: [],
							orderDiscount: null,
							showOverlay: true,
						});
					}
				} finally {
					// Only reset the initializingOrderIdRef if it's still the same orderId
					// This prevents a later-completing call for an old orderId from resetting the ref
					// if a new orderId initialization has already begun.
					if (
						isMountedRef.current &&
						initializingOrderIdRef.current === orderId
					) {
						console.log(
							`[useCart] Finished initialization attempt for order ${orderId}. Resetting ref.`
						);
						initializingOrderIdRef.current = null;
					}
				}
			} else {
				// No orderId
				console.log("[useCart] No orderId present. Ensuring overlay is shown.");
				setShowOverlay(true);
				// If there was a previous orderId being initialized, clear its ref
				if (initializingOrderIdRef.current !== null) {
					console.log(
						`[useCart] No orderId, clearing initializingOrderIdRef (was ${initializingOrderIdRef.current}).`
					);
					initializingOrderIdRef.current = null;
				}
			}
		};

		initializeCart();
	}, [orderId, setShowOverlay, setCart, setOrderDiscount]); // Dependencies

	return {
		cart,
		orderId,
		showOverlay,
		orderDiscount,
	};
};
