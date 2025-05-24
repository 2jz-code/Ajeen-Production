import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils";
import { ShoppingCart, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card"; // Retained for individual item cards
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/**
 * CartView Component
 * Displays the customer's current cart items and totals on the customer display.
 */
const CartView = ({ cartData }) => {
	const {
		items = [],
		subtotal = 0,
		taxAmount = 0,
		total = 0,
		discountAmount = 0,
		orderDiscount = null,
	} = cartData || {};

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.05, delayChildren: 0.1 },
		},
		exit: { opacity: 0 },
	};

	const itemVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: {
			opacity: 1,
			x: 0,
			transition: { type: "spring", stiffness: 300, damping: 25 },
		},
		exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
	};

	const summaryVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.4, ease: "easeOut", delay: 0.2 },
		},
		exit: { opacity: 0 },
	};

	return (
		<motion.div
			key="cart-view"
			className="flex h-full w-full flex-col bg-gradient-to-br from-slate-50 to-slate-100" // Main page background
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			{/* Header - no separate background, just border and padding */}
			<div className="flex-shrink-0 border-b border-slate-200/50 p-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
						<ShoppingCart className="h-6 w-6 text-blue-600" />
						Your Order
					</h1>
				</div>
			</div>

			{/* Cart Items List - padding applied here for content spacing */}
			<div className="flex-1 overflow-y-auto p-6">
				<AnimatePresence initial={false}>
					{items.length === 0 ? (
						<motion.div
							key="empty-cart"
							className="flex h-full flex-col items-center justify-center text-slate-400"
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.3 }}
						>
							<div className="text-center">
								<ShoppingCart
									className="mx-auto h-24 w-24 text-slate-300 mb-4"
									strokeWidth={1}
								/>
								<p className="text-xl text-slate-500">Your order is empty</p>
								<p className="text-sm text-slate-400 mt-2">
									Items will appear here as they&apos;re added
								</p>
							</div>
						</motion.div>
					) : (
						<motion.div
							className="space-y-3"
							variants={containerVariants} // Re-using containerVariants for stagger if needed for items
						>
							{items.map((item, index) => (
								<motion.div
									key={item.id || `item-${index}`}
									layout
									variants={itemVariants} // Individual item animation
									exit="exit"
								>
									{/* Individual item cards are retained but with adjusted styling for less heavy appearance */}
									<Card className="border-slate-200/70 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
										<CardContent className="p-4">
											<div className="flex items-center justify-between gap-4">
												<div className="flex min-w-0 items-center gap-3">
													<Badge
														variant="secondary"
														className="flex-shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-100"
													>
														{item.quantity}x
													</Badge>
													<span
														className="truncate font-medium text-base text-slate-800"
														title={item.name}
													>
														{item.name}
													</span>
													{item.discount > 0 && (
														<Badge
															variant="outline"
															className="ml-1 flex-shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200"
														>
															-{item.discount}%
														</Badge>
													)}
												</div>
												<span className="flex-shrink-0 font-semibold text-base text-slate-900">
													{formatPrice(
														(item.price || 0) *
															(item.quantity || 1) *
															(1 - (item.discount || 0) / 100)
													)}
												</span>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Order Summary Footer - no separate background, just border and padding */}
			{items.length > 0 && (
				<motion.div
					layout
					variants={summaryVariants}
					className="flex-shrink-0 border-t border-slate-200/50 p-6" // Adjusted: removed distinct bg/shadow
				>
					<div className="space-y-3 text-base">
						<div className="flex justify-between text-slate-600">
							<span>Subtotal</span>
							<span className="font-medium text-slate-800">
								{formatPrice(subtotal)}
							</span>
						</div>

						{discountAmount > 0 && (
							<div className="flex justify-between text-emerald-600">
								<span className="flex items-center gap-2">
									<Tag className="h-4 w-4" />
									Discount {orderDiscount ? `(${orderDiscount.name})` : ""}
								</span>
								<span className="font-medium">
									-{formatPrice(discountAmount)}
								</span>
							</div>
						)}

						<div className="flex justify-between text-slate-600">
							<span>Tax</span>
							<span className="font-medium text-slate-800">
								{formatPrice(taxAmount)}
							</span>
						</div>
					</div>

					<Separator className="my-4 border-slate-200/50" />

					<div className="flex items-baseline justify-between">
						<span className="text-xl font-bold text-slate-900">Total</span>
						<span className="text-3xl font-bold text-blue-600">
							{formatPrice(total)}
						</span>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
};

CartView.propTypes = {
	cartData: PropTypes.shape({
		items: PropTypes.arrayOf(
			PropTypes.shape({
				id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
					.isRequired,
				name: PropTypes.string.isRequired,
				price: PropTypes.number,
				quantity: PropTypes.number.isRequired,
				discount: PropTypes.number,
			})
		),
		subtotal: PropTypes.number,
		taxAmount: PropTypes.number,
		total: PropTypes.number,
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.shape({
			id: PropTypes.number,
			name: PropTypes.string,
		}),
	}),
};

export default CartView;
