"use client";

import { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ensureNumber, formatPrice } from "../../../utils/numberUtils";
import { useKeypad } from "../../../hooks/useKeypad";
import { Keypad } from "../../../components/keypad/Keypad"; // Assuming Keypad is styled appropriately
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // Using Card for structure
import { Badge } from "@/components/ui/badge";
import { ChevronRight, X, Percent, Hash } from "lucide-react";

export const CartItem = memo(
	({ item, isExpanded, onExpand, onUpdate, onRemove }) => {
		const { isKeypadOpen, keypadProps, openKeypad } = useKeypad();

		// Local discount state remains the same
		const [localDiscount, setLocalDiscount] = useState(
			item.discount !== undefined ? item.discount.toString() : ""
		);

		useEffect(() => {
			if (item.discount !== undefined) {
				setLocalDiscount(item.discount.toString());
			}
		}, [item.discount]);

		const calculateItemTotal = () => {
			const price = ensureNumber(item.price);
			const quantity = ensureNumber(item.quantity);
			const discountPercent = ensureNumber(item.discount);
			const basePrice = price * quantity;
			const discount = basePrice * (discountPercent / 100);
			return formatPrice(basePrice - discount);
		};

		const getFormattedDiscount = () => {
			if (localDiscount === "") return "";
			const numericDiscount = Number.parseInt(localDiscount, 10);
			return Number.isFinite(numericDiscount) ? numericDiscount : 0;
		};

		const handleQuantityClick = (e) => {
			e.stopPropagation();
			openKeypad({
				value: String(item.quantity), // Pass current quantity
				onChange: (newValue) => {
					const updatedQuantity = Number.parseInt(newValue, 10);
					if (Number.isFinite(updatedQuantity) && updatedQuantity > 0) {
						onUpdate(item.id, { quantity: updatedQuantity }); // Pass as object
					} else if (newValue === "" || updatedQuantity <= 0) {
						onUpdate(item.id, { quantity: 1 });
					}
				},
				title: `Quantity for ${item.name}`,
				maxLength: 3,
				decimal: false,
			});
		};

		const handleDiscountClick = (e) => {
			e.stopPropagation();
			openKeypad({
				value: String(ensureNumber(item.discount)), // Pass current discount
				onChange: (newValue) => {
					let numericValue = 0;
					if (newValue !== "") {
						numericValue = Math.min(
							100,
							Math.max(0, Number.parseInt(newValue) || 0)
						);
					}
					onUpdate(item.id, { discount: numericValue });
				},
				title: `Discount (%) for ${item.name}`,
				maxLength: 3,
				decimal: false,
			});
		};

		const handleRemoveClick = (e) => {
			e.stopPropagation();
			onRemove(item.id);
		};

		return (
			<>
				<Card className="transition-all duration-150 hover:shadow-md shadow-sm">
					{" "}
					{/* Added shadow-sm for base */}
					<CardContent className="p-0">
						{/* Main item row: Reduced padding from p-4 to p-2.5 */}
						<div
							className="p-2.5 flex items-center justify-between cursor-pointer"
							onClick={onExpand}
						>
							{/* Reduced gap from gap-3 to gap-2 */}
							<div className="flex items-center gap-2 flex-1 min-w-0">
								<ChevronRight
									className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
										isExpanded ? "rotate-90" : ""
									}`}
								/>
								{/* Quantity Badge: Already small (py-0.5) */}
								<Badge
									variant="secondary"
									className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors text-xs px-1.5 py-0.5" // Made slightly smaller
									onClick={handleQuantityClick}
								>
									{item.quantity}
								</Badge>
								<span
									className="font-medium text-sm truncate" // text-sm is default, ensure it's not overridden larger
									title={item.name}
								>
									{item.name}
								</span>
							</div>

							<div className="flex items-center gap-2">
								{" "}
								{/* Reduced gap */}
								{/* Total Price: Reduced font size from text-lg to text-base */}
								<span className="font-semibold text-base">
									{calculateItemTotal()}
								</span>
								<Button
									variant="ghost"
									size="icon" // Use icon size for Button
									onClick={handleRemoveClick}
									className="h-7 w-7 text-muted-foreground hover:text-destructive" // Made button smaller
								>
									<X className="h-3.5 w-3.5" />{" "}
									{/* Icon size slightly smaller */}
									<span className="sr-only">Remove item</span>
								</Button>
							</div>
						</div>

						{/* Expanded section: Reduced padding, gap, and button height */}
						{isExpanded && (
							<div className="px-3 pt-2 pb-3 border-t bg-slate-50/70 dark:bg-slate-800/30">
								{" "}
								{/* Reduced padding */}
								<div className="grid grid-cols-2 gap-3">
									{" "}
									{/* Reduced gap */}
									<div className="space-y-1">
										{" "}
										{/* Reduced space-y */}
										<label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
											<Hash className="h-3 w-3" />
											Quantity
										</label>
										<Button
											variant="outline"
											onClick={handleQuantityClick}
											className="w-full justify-center h-9 text-sm" // Reduced height from h-10 to h-9 (default Button size)
										>
											{item.quantity}
										</Button>
									</div>
									<div className="space-y-1">
										{" "}
										{/* Reduced space-y */}
										<label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
											<Percent className="h-3 w-3" />
											Discount
										</label>
										<Button
											variant="outline"
											onClick={handleDiscountClick}
											className="w-full justify-center h-9 text-sm" // Reduced height
										>
											{ensureNumber(item.discount)}%
										</Button>
									</div>
								</div>
								{ensureNumber(item.discount) > 0 && (
									<div className="mt-2 p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md">
										{" "}
										{/* Reduced margin and padding */}
										<p className="text-xs text-green-700 dark:text-green-400">
											Discount Applied: {getFormattedDiscount()}% off
										</p>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
				{isKeypadOpen && <Keypad {...keypadProps} />}
			</>
		);
	}
);

CartItem.propTypes = {
	item: PropTypes.shape({
		id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, // id can be string or number
		name: PropTypes.string.isRequired,
		price: PropTypes.number.isRequired,
		quantity: PropTypes.number.isRequired,
		discount: PropTypes.number,
	}).isRequired,
	isExpanded: PropTypes.bool.isRequired,
	onExpand: PropTypes.func.isRequired,
	onUpdate: PropTypes.func.isRequired,
	onRemove: PropTypes.func.isRequired,
};

CartItem.displayName = "CartItem";

export default CartItem; // Default export if this is the main export of the file
