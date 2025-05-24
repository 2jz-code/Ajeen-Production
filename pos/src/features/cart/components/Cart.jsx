"use client";

import { useState } from "react";
import { useCart } from "../hooks/useCart";
import { useCartActions } from "../hooks/useCartActions";
import { CartHeader } from "./CartHeader";
import CartItemList from "./CartItemList";
import CartSummary from "./CartSummary";
import { useOrderValidation } from "../../../utils/useOrderValidation";
import PaymentFlow from "../../payment/components/PaymentFlow";
import { calculateCartTotals } from "../utils/cartCalculations";
import axiosInstance from "../../../api/config/axiosConfig";
import DiscountSelector from "../../../components/discounts/DiscountSelector";
import { useCartStore } from "../../../store/cartStore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export const Cart = () => {
	const { cart, orderId, showOverlay, orderDiscount } = useCart();
	const { updateItemQuantity, removeFromCart } = useCartActions();
	const cartActions = useCartActions();
	const [isPaymentFlow, setIsPaymentFlow] = useState(false);
	const [showDiscountSelector, setShowDiscountSelector] = useState(false);
	const { canHoldOrder } = useOrderValidation(cart, orderId);

	const setOrderDiscount = useCartStore((state) => state.setOrderDiscount);
	const removeOrderDiscount = useCartStore(
		(state) => state.removeOrderDiscount
	);

	const handlePaymentComplete = async (paymentDetails) => {
		try {
			const success = await cartActions.completeOrder(orderId, paymentDetails);
			if (success) {
				return true;
			}
			return false;
		} catch (error) {
			console.error("Payment completion error:", error);
			return false;
		}
	};

	const handleApplyDiscount = (discount) => {
		setOrderDiscount(discount);
	};

	const cartTotals = calculateCartTotals(cart, orderDiscount);

	return (
		<div className="relative w-full bg-white flex flex-col h-full shadow-lg">
			<CartHeader
				activeOrderId={orderId}
				setActiveOrderId={cartActions.setOrderId}
				clearCart={cartActions.clearCart}
				setShowOverlay={cartActions.setShowOverlay}
				startNewOrder={cartActions.startOrder}
				axiosInstance={axiosInstance}
			/>

			{showOverlay ? (
				<div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 z-10 flex items-center justify-center">
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.3 }}
						className="text-center"
					>
						<div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
							<Plus className="h-10 w-10 text-white" />
						</div>
						<h3 className="text-xl font-semibold text-slate-800 mb-2">
							Ready for New Order
						</h3>
						<p className="text-muted-foreground mb-6">
							Start adding items to begin a new order
						</p>
						<Button
							size="lg"
							onClick={cartActions.startOrder}
							className="gap-2"
						>
							<Plus className="h-5 w-5" />
							Start New Order
						</Button>
					</motion.div>
				</div>
			) : (
				<>
					<CartItemList
						items={cart}
						onUpdateItem={updateItemQuantity}
						onRemoveItem={removeFromCart}
					/>
					<CartSummary
						cart={cart}
						onHoldOrder={() => cartActions.holdOrder(orderId, cart)}
						onCharge={() => setIsPaymentFlow(true)}
						canHoldOrder={canHoldOrder}
						orderDiscount={orderDiscount}
						onShowDiscounts={() => setShowDiscountSelector(true)}
						onRemoveDiscount={removeOrderDiscount}
					/>
				</>
			)}

			{isPaymentFlow && (
				<div className="absolute inset-0 bg-white z-20">
					<PaymentFlow
						totalAmount={cartTotals.total}
						onBack={() => setIsPaymentFlow(false)}
						onComplete={handlePaymentComplete}
					/>
				</div>
			)}

			{showDiscountSelector && (
				<DiscountSelector
					isOpen={showDiscountSelector}
					onClose={() => setShowDiscountSelector(false)}
					onSelectDiscount={handleApplyDiscount}
					orderId={orderId}
				/>
			)}
		</div>
	);
};

export default Cart;
