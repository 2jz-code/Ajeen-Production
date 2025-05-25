"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { Plus, Trash2, InfoIcon, Calculator } from "lucide-react";
import MainLayout from "../layout/MainLayout";

const ProductCogsDefinitionFormPage = ({ mode = "default" }) => {
	const { definitionId, productId: productIdFromParams } = useParams();
	const navigate = useNavigate();
	const location = useLocation();

	const isEditMode = !!definitionId;
	const productIdForForm = mode === "product" ? productIdFromParams : null;

	const [formData, setFormData] = useState({
		product_id: productIdForForm || "",
		notes: "",
		waste_factor_percentage: "5.0",
	});

	const [components, setComponents] = useState([
		{ inventory_item_id: "", quantity: "", unit_id: "" },
	]);

	const [products, setProducts] = useState([]);
	const [inventoryItems, setInventoryItems] = useState([]);
	const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState(null);
	const [calculatedCost, setCalculatedCost] = useState(0);

	// Mock data for now - replace with actual API calls
	useEffect(() => {
		// Simulate API calls
		setTimeout(() => {
			setProducts([
				{ id: 1, name: "Artisan Bread Loaf", sku: "BREAD-001" },
				{ id: 2, name: "Margherita Pizza", sku: "PIZZA-MAR" },
				{ id: 3, name: "Chocolate Croissant", sku: "CROIS-CHOC" },
			]);

			setInventoryItems([
				{ id: 1, name: "Flour", item_type: "RAW_MATERIAL", cost_per_unit: 2.5 },
				{
					id: 2,
					name: "Plastic Bag",
					item_type: "PACKAGING",
					cost_per_unit: 0.15,
				},
				{
					id: 3,
					name: "Bread Dough",
					item_type: "PREPARED_GOOD",
					cost_per_unit: 3.75,
				},
				{
					id: 4,
					name: "Pizza Sauce",
					item_type: "PREPARED_GOOD",
					cost_per_unit: 3.5,
				},
			]);

			setUnitsOfMeasure([
				{ id: 1, name: "Kilogram", abbreviation: "kg" },
				{ id: 2, name: "Gram", abbreviation: "g" },
				{ id: 3, name: "Piece", abbreviation: "pc" },
				{ id: 4, name: "Liter", abbreviation: "L" },
			]);
		}, 500);
	}, []);

	// Calculate total cost when components change
	useEffect(() => {
		const totalCost = components.reduce((sum, component) => {
			if (component.inventory_item_id && component.quantity) {
				const item = inventoryItems.find(
					(item) => item.id.toString() === component.inventory_item_id
				);
				if (item) {
					const quantity = Number.parseFloat(component.quantity) || 0;
					return sum + item.cost_per_unit * quantity;
				}
			}
			return sum;
		}, 0);

		const wasteAdjustedCost =
			totalCost *
			(1 + (Number.parseFloat(formData.waste_factor_percentage) || 0) / 100);
		setCalculatedCost(wasteAdjustedCost);
	}, [components, formData.waste_factor_percentage, inventoryItems]);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSelectChange = (name, value) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleComponentChange = (index, field, value) => {
		const newComponents = [...components];
		newComponents[index][field] = value;
		setComponents(newComponents);
	};

	const addComponent = () => {
		setComponents([
			...components,
			{ inventory_item_id: "", quantity: "", unit_id: "" },
		]);
	};

	const removeComponent = (index) => {
		if (components.length > 1) {
			setComponents(components.filter((_, i) => i !== index));
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setSubmitError(null);

		const dataToSubmit = {
			...formData,
			components: components.filter(
				(comp) => comp.inventory_item_id && comp.quantity && comp.unit_id
			),
		};

		try {
			// Replace with actual API call
			console.log("Submitting product COGS definition:", dataToSubmit);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			navigate("/cogs/product-definitions");
		} catch (err) {
			setSubmitError(err.message || "Failed to save product COGS definition.");
		} finally {
			setLoading(false);
		}
	};

	const getItemTypeLabel = (type) => {
		const types = {
			RAW_MATERIAL: "Raw Material",
			PACKAGING: "Packaging",
			PREPARED_GOOD: "Prepared Good",
			OTHER_DIRECT_COST: "Other Direct Cost",
		};
		return types[type] || type;
	};

	return (
		<MainLayout
			title={
				isEditMode
					? "Edit Product COGS Definition"
					: productIdForForm
					? "Define Product COGS"
					: "Add New Product COGS Definition"
			}
			backTo="/cogs/product-definitions"
		>
			<div className="max-w-4xl mx-auto space-y-6">
				<Alert>
					<InfoIcon className="h-4 w-4" />
					<AlertDescription>
						Define all components that make up the cost of a single unit of a
						sellable product. Components can be Inventory Items (raw materials,
						packaging, or prepared goods from recipes).
					</AlertDescription>
				</Alert>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle>
									{isEditMode ? "Edit" : "Create"} Product COGS Definition
									{productIdForForm && (
										<span className="text-lg text-muted-foreground ml-2">
											(for Product ID: {productIdForForm})
										</span>
									)}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<form
									onSubmit={handleSubmit}
									className="space-y-6"
								>
									<div className="space-y-4">
										{!productIdForForm && (
											<div>
												<Label htmlFor="product_id">Product *</Label>
												<Select
													name="product_id"
													value={formData.product_id}
													onValueChange={(value) =>
														handleSelectChange("product_id", value)
													}
													required
												>
													<SelectTrigger>
														<SelectValue placeholder="Select product" />
													</SelectTrigger>
													<SelectContent>
														{products.map((product) => (
															<SelectItem
																key={product.id}
																value={product.id.toString()}
															>
																{product.name} ({product.sku})
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										)}

										<div>
											<Label htmlFor="notes">Notes</Label>
											<Textarea
												id="notes"
												name="notes"
												value={formData.notes}
												onChange={handleInputChange}
												placeholder="Optional notes about this COGS definition"
												rows={3}
											/>
										</div>

										<div>
											<Label htmlFor="waste_factor_percentage">
												Waste Factor Percentage
											</Label>
											<Input
												id="waste_factor_percentage"
												name="waste_factor_percentage"
												type="number"
												step="0.1"
												value={formData.waste_factor_percentage}
												onChange={handleInputChange}
												placeholder="5.0"
											/>
											<p className="text-sm text-muted-foreground mt-1">
												Percentage to account for waste, spillage, or other
												losses
											</p>
										</div>
									</div>

									<Separator />

									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<h3 className="text-lg font-semibold">
												Product Components
											</h3>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={addComponent}
												className="flex items-center space-x-2"
											>
												<Plus className="h-4 w-4" />
												<span>Add Component</span>
											</Button>
										</div>

										<Card>
											<CardContent className="pt-6">
												{components.length === 0 ? (
													<div className="text-center py-8">
														<p className="text-muted-foreground">
															No components added yet.
														</p>
														<Button
															type="button"
															variant="outline"
															onClick={addComponent}
															className="mt-4"
														>
															Add First Component
														</Button>
													</div>
												) : (
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead>Inventory Item</TableHead>
																<TableHead>Type</TableHead>
																<TableHead>Quantity</TableHead>
																<TableHead>Unit</TableHead>
																<TableHead>Cost</TableHead>
																<TableHead className="text-right">
																	Actions
																</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{components.map((component, index) => {
																const selectedItem = inventoryItems.find(
																	(item) =>
																		item.id.toString() ===
																		component.inventory_item_id
																);
																const componentCost =
																	selectedItem && component.quantity
																		? selectedItem.cost_per_unit *
																		  Number.parseFloat(component.quantity)
																		: 0;

																return (
																	<TableRow key={index}>
																		<TableCell>
																			<Select
																				value={component.inventory_item_id}
																				onValueChange={(value) =>
																					handleComponentChange(
																						index,
																						"inventory_item_id",
																						value
																					)
																				}
																			>
																				<SelectTrigger>
																					<SelectValue placeholder="Select item" />
																				</SelectTrigger>
																				<SelectContent>
																					{inventoryItems.map((item) => (
																						<SelectItem
																							key={item.id}
																							value={item.id.toString()}
																						>
																							{item.name}
																						</SelectItem>
																					))}
																				</SelectContent>
																			</Select>
																		</TableCell>
																		<TableCell>
																			{selectedItem && (
																				<span className="text-sm text-muted-foreground">
																					{getItemTypeLabel(
																						selectedItem.item_type
																					)}
																				</span>
																			)}
																		</TableCell>
																		<TableCell>
																			<Input
																				type="number"
																				step="0.001"
																				value={component.quantity}
																				onChange={(e) =>
																					handleComponentChange(
																						index,
																						"quantity",
																						e.target.value
																					)
																				}
																				placeholder="0.000"
																				className="w-24"
																			/>
																		</TableCell>
																		<TableCell>
																			<Select
																				value={component.unit_id}
																				onValueChange={(value) =>
																					handleComponentChange(
																						index,
																						"unit_id",
																						value
																					)
																				}
																			>
																				<SelectTrigger className="w-20">
																					<SelectValue placeholder="Unit" />
																				</SelectTrigger>
																				<SelectContent>
																					{unitsOfMeasure.map((unit) => (
																						<SelectItem
																							key={unit.id}
																							value={unit.id.toString()}
																						>
																							{unit.abbreviation}
																						</SelectItem>
																					))}
																				</SelectContent>
																			</Select>
																		</TableCell>
																		<TableCell>
																			<span className="text-sm">
																				${componentCost.toFixed(4)}
																			</span>
																		</TableCell>
																		<TableCell className="text-right">
																			<Button
																				type="button"
																				variant="destructive"
																				size="sm"
																				onClick={() => removeComponent(index)}
																				disabled={components.length === 1}
																			>
																				<Trash2 className="h-4 w-4" />
																			</Button>
																		</TableCell>
																	</TableRow>
																);
															})}
														</TableBody>
													</Table>
												)}
											</CardContent>
										</Card>
									</div>

									{submitError && (
										<Alert variant="destructive">
											<AlertDescription>Error: {submitError}</AlertDescription>
										</Alert>
									)}

									<div className="flex justify-end space-x-2 pt-4">
										<Button
											type="button"
											variant="outline"
											onClick={() => navigate("/cogs/product-definitions")}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											disabled={loading}
										>
											{loading
												? "Saving..."
												: isEditMode
												? "Save Changes"
												: "Create Definition"}
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					</div>

					<div>
						<Card className="sticky top-6">
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Calculator className="h-5 w-5" />
									<span>Cost Summary</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Base Cost:</span>
										<span>
											$
											{(
												calculatedCost /
												(1 +
													(Number.parseFloat(
														formData.waste_factor_percentage
													) || 0) /
														100)
											).toFixed(4)}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span>
											Waste Factor ({formData.waste_factor_percentage}%):
										</span>
										<span>
											$
											{(
												calculatedCost -
												calculatedCost /
													(1 +
														(Number.parseFloat(
															formData.waste_factor_percentage
														) || 0) /
															100)
											).toFixed(4)}
										</span>
									</div>
									<Separator />
									<div className="flex justify-between font-semibold">
										<span>Total Cost:</span>
										<span>${calculatedCost.toFixed(4)}</span>
									</div>
								</div>

								<Alert>
									<InfoIcon className="h-4 w-4" />
									<AlertDescription className="text-sm">
										This cost represents the total COGS for one unit of the
										selected product.
									</AlertDescription>
								</Alert>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default ProductCogsDefinitionFormPage;
