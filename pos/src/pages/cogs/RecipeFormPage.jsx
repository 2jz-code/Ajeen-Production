"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Plus, Trash2, InfoIcon } from "lucide-react";
import MainLayout from "../layout/MainLayout";

const RecipeFormPage = () => {
	const { recipeId } = useParams();
	const navigate = useNavigate();
	const isEditMode = !!recipeId;

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		produces_item_id: "",
		yield_quantity: "1.0",
		yield_unit_id: "",
	});

	const [components, setComponents] = useState([
		{ inventory_item_id: "", quantity: "", unit_id: "" },
	]);

	const [inventoryItems, setInventoryItems] = useState([]);
	const [preparedGoods, setPreparedGoods] = useState([]);
	const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
	const [loading, setLoading] = useState(false);
	const [submitError, setSubmitError] = useState(null);

	// Mock data for now - replace with actual API calls
	useEffect(() => {
		// Simulate API calls
		setTimeout(() => {
			setInventoryItems([
				{ id: 1, name: "Flour", item_type: "RAW_MATERIAL" },
				{ id: 2, name: "Water", item_type: "RAW_MATERIAL" },
				{ id: 5, name: "Salt", item_type: "RAW_MATERIAL" },
				{ id: 6, name: "Yeast", item_type: "RAW_MATERIAL" },
			]);

			setPreparedGoods([
				{ id: 3, name: "Bread Dough", item_type: "PREPARED_GOOD" },
				{ id: 4, name: "Pizza Sauce", item_type: "PREPARED_GOOD" },
			]);

			setUnitsOfMeasure([
				{ id: 1, name: "Kilogram", abbreviation: "kg" },
				{ id: 2, name: "Gram", abbreviation: "g" },
				{ id: 3, name: "Liter", abbreviation: "L" },
				{ id: 4, name: "Milliliter", abbreviation: "mL" },
			]);
		}, 500);
	}, []);

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
			console.log("Submitting recipe:", dataToSubmit);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			navigate("/cogs/recipes");
		} catch (err) {
			setSubmitError(err.message || "Failed to save recipe.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<MainLayout
			title={isEditMode ? "Edit Recipe" : "Add New Recipe"}
			backTo="/cogs/recipes"
		>
			<div className="max-w-4xl mx-auto space-y-6">
				<Alert>
					<InfoIcon className="h-4 w-4" />
					<AlertDescription>
						Define a recipe for a prepared good. This recipe will calculate the
						cost of the item it produces. The &quot;Produces Item&quot; must be
						an Inventory Item of type &quot;Prepared Good&quot;.
					</AlertDescription>
				</Alert>

				<Card>
					<CardHeader>
						<CardTitle>{isEditMode ? "Edit" : "Create"} Recipe</CardTitle>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={handleSubmit}
							className="space-y-6"
						>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<div>
										<Label htmlFor="name">Recipe Name *</Label>
										<Input
											id="name"
											name="name"
											value={formData.name}
											onChange={handleInputChange}
											required
											placeholder="Enter recipe name"
										/>
									</div>

									<div>
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											name="description"
											value={formData.description}
											onChange={handleInputChange}
											placeholder="Optional description"
											rows={3}
										/>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<Label htmlFor="produces_item_id">Produces Item *</Label>
										<Select
											name="produces_item_id"
											value={formData.produces_item_id}
											onValueChange={(value) =>
												handleSelectChange("produces_item_id", value)
											}
											required
										>
											<SelectTrigger>
												<SelectValue placeholder="Select prepared good" />
											</SelectTrigger>
											<SelectContent>
												{preparedGoods.map((item) => (
													<SelectItem
														key={item.id}
														value={item.id.toString()}
													>
														{item.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label htmlFor="yield_quantity">Yield Quantity *</Label>
											<Input
												id="yield_quantity"
												name="yield_quantity"
												type="number"
												step="0.001"
												value={formData.yield_quantity}
												onChange={handleInputChange}
												required
												placeholder="1.0"
											/>
										</div>

										<div>
											<Label htmlFor="yield_unit_id">Yield Unit *</Label>
											<Select
												name="yield_unit_id"
												value={formData.yield_unit_id}
												onValueChange={(value) =>
													handleSelectChange("yield_unit_id", value)
												}
												required
											>
												<SelectTrigger>
													<SelectValue placeholder="Select unit" />
												</SelectTrigger>
												<SelectContent>
													{unitsOfMeasure.map((unit) => (
														<SelectItem
															key={unit.id}
															value={unit.id.toString()}
														>
															{unit.name} ({unit.abbreviation})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold">Recipe Components</h3>
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
														<TableHead>Quantity</TableHead>
														<TableHead>Unit</TableHead>
														<TableHead className="text-right">
															Actions
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{components.map((component, index) => (
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
																	<SelectTrigger>
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
													))}
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
									onClick={() => navigate("/cogs/recipes")}
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
										: "Create Recipe"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</MainLayout>
	);
};

export default RecipeFormPage;
