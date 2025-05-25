"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
	Plus,
	Trash2,
	InfoIcon,
	ChefHat,
	ArrowLeft,
	Save,
	AlertTriangle,
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import * as cogsService from "../../api/services/cogsService"; // Ensure this path is correct
import { toast } from "react-toastify"; // Or your preferred toast library
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Ensure this path is correct
import { useDocumentTitle } from "../../hooks/useDocumentTitle"; // Ensure this path is correct

const RecipeFormPage = () => {
	const { recipeId } = useParams();
	const navigate = useNavigate();
	const isEditMode = !!recipeId;

	const pageAction = isEditMode ? "Edit" : "Add New";
	useDocumentTitle(`COGS | ${pageAction} Recipe`);

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		produces_item_id: "", // Stores ID of InventoryItem (type: PREPARED_GOOD)
		yield_quantity: "1.0",
		yield_unit_id: "", // Stores ID of UnitOfMeasure for the yield
	});

	const [components, setComponents] = useState([
		{ inventory_item_id: "", quantity: "1", unit_id: "" }, // unit_id will be mapped to quantity_unit_id
	]);

	const [allInventoryItems, setAllInventoryItems] = useState([]);
	const [preparedGoodItems, setPreparedGoodItems] = useState([]);
	const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
	const [pageLoading, setPageLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [pageError, setPageError] = useState(null);
	const [submitError, setSubmitError] = useState(null); // Can be string (general) or object (field errors)

	const fetchDropdownData = useCallback(async () => {
		const [itemsData, unitsData] = await Promise.all([
			cogsService.getInventoryItems(),
			cogsService.getUnitsOfMeasure(),
		]);

		const allItems = Array.isArray(itemsData) ? itemsData : [];
		setAllInventoryItems(allItems);
		setPreparedGoodItems(
			allItems.filter((item) => item.item_type === "PREPARED_GOOD")
		);
		setUnitsOfMeasure(Array.isArray(unitsData) ? unitsData : []);
		return { allItems, unitsData: Array.isArray(unitsData) ? unitsData : [] };
	}, []);

	const fetchRecipeData = useCallback(async (recipeIdToFetch) => {
		const recipeData = await cogsService.getRecipeById(recipeIdToFetch); //
		setFormData({
			name: recipeData.name || "", //
			description: recipeData.description || "", //
			produces_item_id:
				(
					recipeData.produces_item_details?.id || recipeData.produces_item
				)?.toString() || "",
			yield_quantity: recipeData.yield_quantity?.toString() || "1.0", //
			yield_unit_id:
				(
					recipeData.implicit_yield_unit_details?.id ||
					recipeData.implicit_yield_unit_id
				)?.toString() || "",
		});

		if (recipeData.components && recipeData.components.length > 0) {
			//
			const populatedComponents = recipeData.components.map((comp) => {
				return {
					inventory_item_id:
						(
							comp.inventory_item_details?.id || comp.inventory_item
						)?.toString() || "",
					quantity: comp.quantity?.toString() || "1", //
					unit_id:
						(
							comp.quantity_unit_details?.id || comp.quantity_unit
						)?.toString() || "",
				};
			});
			setComponents(populatedComponents); //
		} else {
			setComponents([{ inventory_item_id: "", quantity: "1", unit_id: "" }]); //
		}
	}, []); // Dependencies are fine as it only uses its argument

	const fetchPageData = useCallback(async () => {
		setPageLoading(true); //
		setPageError(null); //
		try {
			await fetchDropdownData(); // // unitsData is now set in state by fetchDropdownData
			if (isEditMode && recipeId) {
				//
				await fetchRecipeData(recipeId); // Corrected: Removed unused unitsData argument
			}
		} catch (err) {
			console.error("Error fetching page data:", err); //
			const errorMsg =
				err.response?.data?.detail ||
				err.message ||
				"Failed to load page data."; //
			setPageError(errorMsg); //
			toast.error(errorMsg); //
			setAllInventoryItems([]); //
			setPreparedGoodItems([]); //
			setUnitsOfMeasure([]); //
		} finally {
			setPageLoading(false); //
		}
	}, [isEditMode, recipeId, fetchDropdownData, fetchRecipeData]); //

	useEffect(() => {
		fetchPageData();
	}, [fetchPageData]);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (submitError) setSubmitError(null); // Clear general or field errors on new input
	};

	const handleSelectChange = (name, value) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (submitError) setSubmitError(null);
	};

	const handleComponentChange = (index, field, value) => {
		const newComponents = [...components];
		newComponents[index][field] = value;
		setComponents(newComponents);
		if (submitError) setSubmitError(null);
	};

	const addComponent = () => {
		setComponents([
			...components,
			{ inventory_item_id: "", quantity: "1", unit_id: "" },
		]);
	};

	const removeComponent = (index) => {
		setComponents(components.filter((_, i) => i !== index));
	};

	const validateForm = () => {
		const errors = {};
		if (!formData.name.trim()) errors.name = "Recipe name is required.";
		if (!formData.produces_item_id) {
			errors.produces_item_id = "The item this recipe produces is required.";
		} else {
			const producedItem = preparedGoodItems.find(
				(item) => item.id.toString() === formData.produces_item_id
			);
			if (!producedItem || producedItem.item_type !== "PREPARED_GOOD") {
				errors.produces_item_id =
					"Produced item must be an inventory item of type 'Prepared Good'.";
			}
		}

		if (
			isNaN(parseFloat(formData.yield_quantity)) ||
			parseFloat(formData.yield_quantity) <= 0
		) {
			errors.yield_quantity = "Yield quantity must be a positive number.";
		}
		// Note: Validation for yield_unit_id depends on whether it's truly required by your backend.
		// Your current backend serializer does not enforce it. If it were required:
		// if (!formData.yield_unit_id) errors.yield_unit_id = "Yield unit is required.";

		const validComponents = components.filter(
			(c) => c.inventory_item_id && c.quantity.trim() && c.unit_id
		);

		if (components.length === 0) {
			// Check if any components exist at all
			errors.components = "At least one component is required.";
		} else if (validComponents.length !== components.length) {
			// Check if all existing components are valid
			errors.components =
				"All components must have an inventory item, quantity, and unit selected.";
		}

		components.forEach((comp, index) => {
			if (!comp.inventory_item_id) {
				errors[`component_inventory_item_id_${index}`] = `Component ${
					index + 1
				} item is required.`;
			}
			if (
				!comp.quantity.trim() ||
				isNaN(parseFloat(comp.quantity)) ||
				parseFloat(comp.quantity) <= 0
			) {
				errors[`component_quantity_${index}`] = `Component ${
					index + 1
				} quantity must be a positive number.`;
			}
			if (!comp.unit_id) {
				errors[`component_unit_id_${index}`] = `Component ${
					index + 1
				} unit is required.`;
			}
		});

		if (Object.keys(errors).length > 0) {
			setSubmitError(errors);
			return false;
		}
		setSubmitError(null); // Clear previous errors if form is valid
		return true;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			toast.error("Please correct the errors in the form.");
			return;
		}
		setSubmitting(true);

		// Prepare data for submission according to backend serializer expectations
		const dataToSubmit = {
			name: formData.name,
			description: formData.description,
			produces_item_id: parseInt(formData.produces_item_id),
			yield_quantity: parseFloat(formData.yield_quantity),
			// components: array is prepared next
		};

		// --- IMPORTANT BACKEND SERIALIZER NOTE for yield_unit_id ---
		// Your backend RecipeSerializer currently does NOT define 'yield_unit_id'
		// as a writeable PrimaryKeyRelatedField. If the 'yield_unit' field on your
		// Recipe model is required, you MUST update 'cogs/serializers.py':
		//
		// In RecipeSerializer:
		//   yield_unit_id = serializers.PrimaryKeyRelatedField(
		//       queryset=UnitOfMeasure.objects.all(),
		//       source="yield_unit", // Or your model's field name
		//       write_only=True,
		//       allow_null=False // Or True if optional
		//   )
		//   # Then add 'yield_unit_id' to Meta.fields and pop it in to_representation.
		//
		// Once the backend serializer is updated, you can reliably send yield_unit_id:
		if (formData.yield_unit_id) {
			dataToSubmit.yield_unit_id = parseInt(formData.yield_unit_id);
		}

		dataToSubmit.components = components
			.filter(
				(comp) => comp.inventory_item_id && comp.quantity.trim() && comp.unit_id
			) // Ensure only valid components are mapped
			.map((comp) => ({
				inventory_item_id: parseInt(comp.inventory_item_id),
				quantity: parseFloat(comp.quantity),
				quantity_unit_id: parseInt(comp.unit_id), // Changed from unit_id to quantity_unit_id
			}));

		try {
			if (isEditMode) {
				await cogsService.updateRecipe(recipeId, dataToSubmit);
				toast.success("Recipe updated successfully!");
			} else {
				await cogsService.createRecipe(dataToSubmit);
				toast.success("Recipe created successfully!");
			}
			navigate("/cogs/recipes"); // Adjust as needed
		} catch (err) {
			console.error("Error saving recipe:", err.response?.data || err.message);
			const errorData = err.response?.data;
			let errorMessage = "Failed to save recipe.";
			let fieldErrors = {};

			if (errorData) {
				if (typeof errorData === "string") {
					errorMessage = errorData;
				} else if (typeof errorData === "object") {
					// Map backend errors to frontend field names if possible
					Object.entries(errorData).forEach(([key, value]) => {
						const valArray = Array.isArray(value) ? value : [value];
						if (key === "produces_item_id" || key === "produces_item")
							fieldErrors.produces_item_id = valArray.join(", ");
						else if (key === "yield_unit_id" || key === "yield_unit")
							fieldErrors.yield_unit_id = valArray.join(", ");
						else if (key === "components") {
							// Handle nested component errors
							if (Array.isArray(value)) {
								value.forEach((compError, index) => {
									if (typeof compError === "object" && compError !== null) {
										Object.entries(compError).forEach(([compKey, compVal]) => {
											const compValArray = Array.isArray(compVal)
												? compVal
												: [compVal];
											if (
												compKey === "inventory_item_id" ||
												compKey === "inventory_item"
											)
												fieldErrors[`component_inventory_item_id_${index}`] =
													compValArray.join(", ");
											else if (
												compKey === "quantity_unit_id" ||
												compKey === "quantity_unit"
											)
												fieldErrors[`component_unit_id_${index}`] =
													compValArray.join(", ");
											else if (compKey === "quantity")
												fieldErrors[`component_quantity_${index}`] =
													compValArray.join(", ");
											else
												fieldErrors[`component_${index}_${compKey}`] =
													compValArray.join(", "); // Generic component error
										});
									} else if (typeof compError === "string") {
										// If the component error is a string, assign it to a general component error field
										fieldErrors[`components_error_${index}`] = compError;
									}
								});
								if (Object.values(value).every((v) => typeof v === "string")) {
									// If all component errors are strings
									fieldErrors.components = value.join("; ");
								}
							} else if (typeof value === "string") {
								fieldErrors.components = value; // General components error
							}
						} else fieldErrors[key] = valArray.join(", ");
					});
					errorMessage = "Validation errors occurred. Please check the form.";
				}
			} else if (err.message) {
				errorMessage = err.message;
			}

			setSubmitError(
				Object.keys(fieldErrors).length > 0 ? fieldErrors : errorMessage
			);
			toast.error(
				Object.keys(fieldErrors).length > 0
					? "Please correct the highlighted errors."
					: `Save failed: ${errorMessage}`
			);
		} finally {
			setSubmitting(false);
		}
	};

	const displayFieldError = (fieldName, index = null) => {
		if (!submitError || typeof submitError === "string") return null;

		let errorKey = fieldName;
		if (index !== null) {
			// For component fields
			if (fieldName === "inventory_item_id")
				errorKey = `component_inventory_item_id_${index}`;
			else if (fieldName === "quantity")
				errorKey = `component_quantity_${index}`;
			else if (fieldName === "unit_id") errorKey = `component_unit_id_${index}`;
		}

		const error = submitError[errorKey];
		if (error) {
			return (
				<p className="text-xs text-destructive mt-1">
					{Array.isArray(error) ? error.join(", ") : error}
				</p>
			);
		}
		return null;
	};

	if (pageLoading) {
		return (
			<MainLayout>
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner size="lg" />
					<p className="ml-3 text-muted-foreground">Loading recipe form...</p>
				</div>
			</MainLayout>
		);
	}

	if (pageError) {
		return (
			<MainLayout>
				<div className="max-w-2xl mx-auto space-y-6 p-4 text-center">
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>{pageError}</AlertDescription>
					</Alert>
					<Button
						onClick={() => navigate("/cogs/recipes")}
						variant="outline"
					>
						Back to Recipes
					</Button>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="max-w-4xl mx-auto space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
						<ChefHat className="h-5 w-5 text-slate-600" />
						{isEditMode ? "Edit Recipe" : "Add New Recipe"}
					</h2>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => navigate("/cogs/recipes")} // Adjust as needed
							disabled={submitting}
						>
							<ArrowLeft className="h-4 w-4 mr-1.5" />
							Back to Recipes List
						</Button>
					</div>
				</div>

				<Alert>
					<InfoIcon className="h-4 w-4" />
					<AlertDescription>
						Define a recipe for a prepared good. This recipe will calculate the
						cost of the item it produces. The &quot;Produces Item&quot; must be
						an Inventory Item of type &quot;Prepared Good&quot;. Recipe
						components can be raw materials or other prepared goods.
					</AlertDescription>
				</Alert>

				<Card>
					<CardHeader>
						<CardTitle>Recipe Details</CardTitle>
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
											className={submitError?.name ? "border-destructive" : ""}
										/>
										{displayFieldError("name")}
									</div>

									<div>
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											name="description"
											value={formData.description}
											onChange={handleInputChange}
											placeholder="Optional recipe description"
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
										>
											<SelectTrigger
												className={
													submitError?.produces_item_id
														? "border-destructive"
														: ""
												}
											>
												<SelectValue placeholder="Select prepared good item" />
											</SelectTrigger>
											<SelectContent>
												{preparedGoodItems.map((item) => (
													<SelectItem
														key={item.id}
														value={item.id.toString()}
													>
														{item.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{displayFieldError("produces_item_id")}
										<p className="text-xs text-muted-foreground mt-1">
											Must be an inventory item of type &quot;Prepared
											Good&quot;.
										</p>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label htmlFor="yield_quantity">Yield Quantity *</Label>
											<Input
												id="yield_quantity"
												name="yield_quantity"
												type="number"
												step="0.001"
												min="0.001"
												value={formData.yield_quantity}
												onChange={handleInputChange}
												required
												placeholder="1.0"
												className={
													submitError?.yield_quantity
														? "border-destructive"
														: ""
												}
											/>
											{displayFieldError("yield_quantity")}
										</div>
										<div>
											<Label htmlFor="yield_unit_id">Yield Unit *</Label>
											<Select
												name="yield_unit_id"
												value={formData.yield_unit_id}
												onValueChange={(value) =>
													handleSelectChange("yield_unit_id", value)
												}
											>
												<SelectTrigger
													className={
														submitError?.yield_unit_id
															? "border-destructive"
															: ""
													}
												>
													<SelectValue placeholder="Select yield unit" />
												</SelectTrigger>
												<SelectContent>
													{unitsOfMeasure.map((unit) => (
														<SelectItem
															key={unit.id}
															value={unit.id.toString()}
														>
															{unit.name} ({unit.abbreviation || unit.symbol})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{displayFieldError("yield_unit_id")}
											<p className="text-xs text-muted-foreground mt-1">
												(Ensure backend serializer accepts{" "}
												<code>yield_unit_id</code>)
											</p>
										</div>
									</div>
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold">Recipe Components *</h3>
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
								{submitError?.components && (
									<p className="text-xs text-destructive -mt-2 mb-2">
										{typeof submitError.components === "string"
											? submitError.components
											: "Errors in components list."}
									</p>
								)}

								<Card>
									<CardContent className="pt-6">
										{components.length === 0 ? (
											<div className="text-center py-8">
												<p className="text-muted-foreground">
													No components added yet. A recipe requires at least
													one component.
												</p>
												<Button
													type="button"
													variant="outline"
													size="sm"
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
														<TableHead className="w-[40%]">
															Inventory Item *
														</TableHead>
														<TableHead className="w-[20%]">
															Quantity *
														</TableHead>
														<TableHead className="w-[20%]">Unit *</TableHead>
														<TableHead className="text-right w-[10%]">
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
																	<SelectTrigger
																		className={
																			displayFieldError(
																				"inventory_item_id",
																				index
																			)
																				? "border-destructive"
																				: ""
																		}
																	>
																		<SelectValue placeholder="Select item" />
																	</SelectTrigger>
																	<SelectContent>
																		{allInventoryItems.map((item) => (
																			<SelectItem
																				key={item.id}
																				value={item.id.toString()}
																			>
																				{item.name}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																{displayFieldError("inventory_item_id", index)}
															</TableCell>
															<TableCell>
																<Input
																	type="number"
																	step="0.001"
																	min="0.001"
																	value={component.quantity}
																	onChange={(e) =>
																		handleComponentChange(
																			index,
																			"quantity",
																			e.target.value
																		)
																	}
																	placeholder="0.000"
																	className={
																		displayFieldError("quantity", index)
																			? "border-destructive"
																			: ""
																	}
																/>
																{displayFieldError("quantity", index)}
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
																	<SelectTrigger
																		className={
																			displayFieldError("unit_id", index)
																				? "border-destructive"
																				: ""
																		}
																	>
																		<SelectValue placeholder="Unit" />
																	</SelectTrigger>
																	<SelectContent>
																		{unitsOfMeasure.map((unit) => (
																			<SelectItem
																				key={unit.id}
																				value={unit.id.toString()}
																			>
																				{unit.abbreviation || unit.symbol} (
																				{unit.name})
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																{displayFieldError("unit_id", index)}
															</TableCell>
															<TableCell className="text-right">
																<Button
																	type="button"
																	variant="destructive"
																	size="sm"
																	className="h-8 w-8 p-0"
																	onClick={() => removeComponent(index)}
																	disabled={
																		components.length <= 1 && index === 0
																	} // Disable remove for the last item
																>
																	<Trash2 className="h-4 w-4" />
																	<span className="sr-only">
																		Remove component
																	</span>
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

							{submitError && typeof submitError === "string" && (
								<Alert
									variant="destructive"
									className="mt-4"
								>
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>{submitError}</AlertDescription>
								</Alert>
							)}
							{/* Display general object errors if not field specific from validateForm */}
							{submitError &&
								typeof submitError === "object" &&
								!Object.keys(submitError).some(
									(k) =>
										[
											"name",
											"produces_item_id",
											"yield_quantity",
											"yield_unit_id",
											"components",
										].includes(k) || k.startsWith("component_")
								) && (
									<Alert
										variant="destructive"
										className="mt-4"
									>
										<AlertTriangle className="h-4 w-4" />
										<AlertDescription>
											An unexpected error occurred:
											<ul className="list-disc list-inside text-xs">
												{Object.entries(submitError).map(([key, value]) => (
													<li key={key}>
														<strong>{key}:</strong>{" "}
														{Array.isArray(value) ? value.join(", ") : value}
													</li>
												))}
											</ul>
										</AlertDescription>
									</Alert>
								)}

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => navigate("/cogs/recipes")} // Adjust as needed
									disabled={submitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={submitting || pageLoading}
								>
									{submitting ? (
										<Save className="mr-2 h-4 w-4 animate-pulse" />
									) : (
										<Save className="mr-2 h-4 w-4" />
									)}
									{submitting
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
