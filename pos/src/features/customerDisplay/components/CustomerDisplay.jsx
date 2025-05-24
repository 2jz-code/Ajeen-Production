import { useEffect, useState } from "react";
import WelcomePage from "./WelcomePage";
import CartView from "./cart/CartView";
import CustomerFlowView from "./flow/CustomerFlowView";
import { calculateCartTotals } from "../../cart/utils/cartCalculations";
import { useCartStore } from "../../../store/cartStore";

const CustomerDisplay = () => {
	const [displayData, setDisplayData] = useState(null);
	const [displayMode, setDisplayMode] = useState("welcome");
	const [cartData, setCartData] = useState(null);

	// Load cart data from localStorage
	useEffect(() => {
		const loadCartFromStorage = () => {
			try {
				const storedCartData = localStorage.getItem("cart-storage");
				if (storedCartData) {
					const parsedData = JSON.parse(storedCartData);
					if (parsedData && parsedData.state) {
						setCartData(parsedData.state);
					}
				}
			} catch (error) {
				console.error("Error loading cart from localStorage:", error);
			}
		};

		loadCartFromStorage();

		const handleStorageChange = (event) => {
			if (event.key === "cart-storage") {
				loadCartFromStorage();
			}
		};

		window.addEventListener("storage", handleStorageChange);

		return () => {
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	useEffect(() => {
		const handleMessage = (event) => {
			if (event.source === window.opener) {
				if (event.data.type === "CUSTOMER_DISPLAY_UPDATE") {
					setDisplayData(event.data.content);
					setDisplayMode(event.data.content.displayMode || "custom");
				} else if (event.data.type === "SHOW_CART") {
					setDisplayMode("flow");
					setDisplayData({
						...displayData,
						currentStep: "cart",
					});
				} else if (event.data.type === "SHOW_WELCOME") {
					setDisplayMode("welcome");
				} else if (event.data.type === "START_CUSTOMER_FLOW") {
					const orderId =
						event.data.content.orderId ||
						cartData?.orderId ||
						useCartStore.getState().orderId;

					const flowContent = {
						...event.data.content,
						cartData: {
							...(cartData || {}),
							...event.data.content.cartData,
							orderId: orderId,
						},
						orderId: orderId,
					};

					setDisplayData(flowContent);
					setDisplayMode("flow");
				} else if (event.data.type === "UPDATE_CUSTOMER_FLOW") {
					const updatedContent = {
						...event.data.content,
						cartData: {
							...(displayData?.cartData || {}),
							...(event.data.content.cartData || {}),
						},
						orderId: event.data.content.orderId || displayData?.orderId,
					};
					setDisplayData(updatedContent);
				} else if (event.data.type === "DIRECT_CASH_UPDATE") {
					setDisplayData((prevData) => ({
						...prevData,
						...event.data.content,
					}));
				}
			}
		};

		window.addEventListener("message", handleMessage);

		if (window.opener) {
			window.opener.postMessage("CUSTOMER_DISPLAY_READY", "*");
		}

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [displayData, cartData]);

	const processedCartData = () => {
		const cartItems =
			cartData?.cart || (displayData?.cart ? displayData.cart : []);
		const orderDiscount = cartData?.orderDiscount || displayData?.orderDiscount;

		if (!Array.isArray(cartItems) || cartItems.length === 0) {
			return {
				items: [],
				subtotal: 0,
				taxAmount: 0,
				total: 0,
				discountAmount: 0,
				orderDiscount: null,
				orderId: displayData?.orderId || null,
			};
		}

		const { subtotal, taxAmount, total, discountAmount } = calculateCartTotals(
			cartItems,
			orderDiscount
		);

		return {
			items: cartItems,
			subtotal,
			taxAmount,
			total,
			discountAmount,
			orderDiscount,
			orderId: displayData?.orderId || cartData?.orderId || null,
		};
	};

	const handleFlowStepComplete = (step, stepData) => {
		const effectiveOrderId =
			displayData?.orderId ||
			processedCartData().orderId ||
			useCartStore.getState().orderId;

		if (window.opener) {
			window.opener.postMessage(
				{
					type: "CUSTOMER_FLOW_STEP_COMPLETE",
					content: {
						step,
						data: {
							...stepData,
							orderId: effectiveOrderId,
						},
					},
				},
				"*"
			);
		}
	};

	const renderDisplay = () => {
		const processedData = processedCartData();

		switch (displayMode) {
			case "welcome":
				return <WelcomePage />;
			case "cart":
				return <CartView cartData={processedData} />;
			case "flow":
				return (
					<CustomerFlowView
						flowData={{
							...displayData,
							cartData: processedData,
							orderId: displayData?.orderId || processedData.orderId,
						}}
						onStepComplete={handleFlowStepComplete}
					/>
				);
			case "custom":
			default:
				return (
					<div className="customer-data p-6 bg-gray-50">
						<pre className="bg-white p-4 rounded-lg shadow-sm overflow-auto text-xs font-mono">
							{JSON.stringify(displayData, null, 2)}
						</pre>
					</div>
				);
		}
	};

	return (
		<div className="customer-display-container h-screen w-screen">
			{renderDisplay()}
		</div>
	);
};

export default CustomerDisplay;
