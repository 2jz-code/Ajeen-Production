"use client";

import { useState } from "react";
import { CartItem } from "./CartItem";
import PropTypes from "prop-types";
import { normalizeCartItems } from "../utils/cartDataNormalizer";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";

/**
 * CartItemList Component
 *
 * Renders the list of items currently in the cart with modern UI.
 * All original logic is preserved.
 */
export const CartItemList = ({ items, onUpdateItem, onRemoveItem }) => {
	// --- ORIGINAL LOGIC (UNCHANGED) ---
	const [expandedItemId, setExpandedItemId] = useState(null);

	const handleExpand = (itemId) => {
		setExpandedItemId(expandedItemId === itemId ? null : itemId);
	};

	const safeItems = Array.isArray(items) ? items : [];
	const normalizedItems = normalizeCartItems(safeItems);
	// --- END OF ORIGINAL LOGIC ---

	const itemVariants = {
		initial: { opacity: 0, y: 10 },
		animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
		exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
	};

	const layoutTransition = {
		duration: 0.25,
		ease: "easeOut",
	};

	return (
		// Reduced padding from p-3 to p-2
		// Reduced space-y from space-y-1.5 to space-y-1
		<div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
			{normalizedItems.length === 0 ? (
				// Reduced py-10 to py-8 for the empty cart message
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
						<ShoppingCart className="h-8 w-8 text-slate-400 dark:text-slate-500" />
					</div>
					<h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
						Cart is Empty
					</h3>
					<p className="text-sm text-muted-foreground">
						Add items to get started
					</p>
				</div>
			) : (
				<AnimatePresence initial={false}>
					{normalizedItems.map((item) => (
						<motion.div
							key={item.id}
							layout
							variants={itemVariants}
							initial="initial"
							animate="animate"
							exit="exit"
							transition={layoutTransition}
						>
							<CartItem
								item={item}
								isExpanded={expandedItemId === item.id}
								onExpand={() => handleExpand(item.id)}
								onUpdate={onUpdateItem}
								onRemove={onRemoveItem}
							/>
						</motion.div>
					))}
				</AnimatePresence>
			)}
		</div>
	);
};

CartItemList.propTypes = {
	items: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
			name: PropTypes.string.isRequired,
			price: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
				.isRequired,
			quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
				.isRequired,
			discount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		})
	).isRequired,
	onUpdateItem: PropTypes.func.isRequired,
	onRemoveItem: PropTypes.func.isRequired,
};

CartItemList.displayName = "CartItemList";

// Default export if this is the main export
export default CartItemList;
