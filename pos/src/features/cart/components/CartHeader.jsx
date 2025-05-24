"use client";

import PropTypes from "prop-types";
import OrderCancellation from "../../../components/OrderCancellation";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";

/**
 * CartHeader Component
 *
 * Displays the cart title and action buttons with modern UI.
 * All original logic is preserved.
 */
export const CartHeader = ({
	activeOrderId,
	setActiveOrderId,
	clearCart,
	setShowOverlay,
	startNewOrder,
	axiosInstance,
}) => {
	return (
		<div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
			<div className="flex items-center justify-between">
				{/* Title with Icon */}
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
						<ShoppingCart className="h-5 w-5 text-white" />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-slate-800">
							Order Summary
						</h2>
						{activeOrderId && (
							<p className="text-xs text-muted-foreground">
								Order #{activeOrderId}
							</p>
						)}
					</div>
				</div>

				{/* Action Buttons */}
				{activeOrderId && (
					<div className="flex items-center gap-2">
						<OrderCancellation
							activeOrderId={activeOrderId}
							setActiveOrderId={setActiveOrderId}
							clearCart={clearCart}
							setShowOverlay={setShowOverlay}
							axiosInstance={axiosInstance}
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={clearCart}
							className="gap-2"
						>
							<Trash2 className="h-4 w-4" />
							Clear
						</Button>
						<Button
							size="sm"
							onClick={startNewOrder}
							className="gap-2"
						>
							<Plus className="h-4 w-4" />
							New Order
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};

CartHeader.propTypes = {
	activeOrderId: PropTypes.number,
	setActiveOrderId: PropTypes.func,
	clearCart: PropTypes.func,
	setShowOverlay: PropTypes.func,
	startNewOrder: PropTypes.func.isRequired,
	axiosInstance: PropTypes.func.isRequired,
};

export default CartHeader;
