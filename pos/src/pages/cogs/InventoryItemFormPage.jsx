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
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { InfoIcon } from "lucide-react";
import * as cogsService from "../../api/services/cogsService";
import useApi from "../../api/hooks/useApi";
import MainLayout from "../layout/MainLayout";

const ITEM_TYPES = [
	{ value: "RAW_MATERIAL", label: "Raw Material" },
	{ value: "PACKAGING", label: "Packaging" },
	{ value: "PREPARED_GOOD", label: "Prepared Good (from Recipe)" },
	{ value: "OTHER_DIRECT_COST", label: "Other Direct Cost" },
];

const InventoryItemFormPage = () => {
	const { itemId } = useParams();
	const navigate = useNavigate();
	const isEditMode = !!itemId;

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		item_type: "RAW_MATERIAL",
		costing_unit_id: "",
		current_cost_per_unit: "0.00",
		latest_purchase_price: "",
		latest_purchase_quantity: "",
		latest_purchase_unit_id: "",
	});
	const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);

	const { data: fetchedUnits, loading: unitsLoading } = useApi(
		cogsService.getUnitsOfMeasure
	);
	const {
		data: itemData,
		loading: itemLoading,
		fetchData: fetchItem,
	} = useApi(itemId ? () => cogsService.getInventoryItemById(itemId) : null);
	const {
		loading: submitting,
		error: submitError,
		fetchData: submitForm,
	} = useApi();

	useEffect(() => {
		if (fetchedUnits) setUnitsOfMeasure(fetchedUnits);
	}, [fetchedUnits]);

	useEffect(() => {
		if (isEditMode) {
			fetchItem();
		}
	}, [isEditMode, itemId, fetchItem]);

	useEffect(() => {
		if (isEditMode && itemData) {
			setFormData({
				name: itemData.name || "",
				description: itemData.description || "",
				item_type: itemData.item_type || "RAW_MATERIAL",
				costing_unit_id: itemData.costing_unit?.id?.toString() || "",
				current_cost_per_unit:
					itemData.current_cost_per_unit?.toString() || "0.00",
				latest_purchase_price: itemData.latest_purchase_price?.toString() || "",
				latest_purchase_quantity:
					itemData.latest_purchase_quantity?.toString() || "",
				latest_purchase_unit_id:
					itemData.latest_purchase_unit?.id?.toString() || "",
			});
		}
	}, [isEditMode, itemData]);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSelectChange = (name, value) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const dataToSubmit = {
			...formData,
			costing_unit: formData.costing_unit_id,
			latest_purchase_unit: formData.latest_purchase_unit_id || null,
		};

		if (
			formData.item_type !== "OTHER_DIRECT_COST" &&
			!isEditMode &&
			formData.item_type !== "PREPARED_GOOD"
		) {
			delete dataToSubmit.current_cost_per_unit;
		} else if (
			formData.item_type === "PREPARED_GOOD" ||
			(isEditMode && formData.item_type !== "OTHER_DIRECT_COST")
		) {
			delete dataToSubmit.current_cost_per_unit;
		}

		delete dataToSubmit.costing_unit_id;
		delete dataToSubmit.latest_purchase_unit_id;

		if (isEditMode) {
			await submitForm(() =>
				cogsService.updateInventoryItem(itemId, dataToSubmit)
			);
		} else {
			await submitForm(() => cogsService.createInventoryItem(dataToSubmit));
		}
		if (!submitError && submitForm.data) {
			navigate("/cogs/inventory-items");
		}
	};

	if (unitsLoading || (isEditMode && itemLoading)) {
		return (
			<MainLayout
				title={isEditMode ? "Edit Inventory Item" : "Add New Inventory Item"}
				backTo="/cogs/inventory-items"
			>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading form data...</p>
					</div>
				</div>
			</MainLayout>
		);
	}

	const isCostEditable = formData.item_type === "OTHER_DIRECT_COST";
	const showPurchaseFields =
		formData.item_type === "RAW_MATERIAL" || formData.item_type === "PACKAGING";

	return (
		<MainLayout
			title={isEditMode ? "Edit Inventory Item" : "Add New Inventory Item"}
			backTo="/cogs/inventory-items"
		>
			<div className="max-w-2xl mx-auto space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>
							{isEditMode ? "Edit" : "Create"} Inventory Item
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={handleSubmit}
							className="space-y-6"
						>
							<div className="space-y-4">
								<div>
									<Label htmlFor="name">Item Name *</Label>
									<Input
										id="name"
										name="name"
										value={formData.name}
										onChange={handleInputChange}
										required
										placeholder="Enter item name"
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

								<div>
									<Label htmlFor="item_type">Item Type *</Label>
									<Select
										name="item_type"
										value={formData.item_type}
										onValueChange={(value) =>
											handleSelectChange("item_type", value)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select item type" />
										</SelectTrigger>
										<SelectContent>
											{ITEM_TYPES.map((type) => (
												<SelectItem
													key={type.value}
													value={type.value}
												>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="costing_unit_id">Costing Unit *</Label>
									<Select
										name="costing_unit_id"
										value={formData.costing_unit_id}
										onValueChange={(value) =>
											handleSelectChange("costing_unit_id", value)
										}
										required
									>
										<SelectTrigger>
											<SelectValue placeholder="Select costing unit" />
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
									<p className="text-sm text-muted-foreground mt-1">
										The unit used for calculating costs (e.g., cost per gram,
										per piece)
									</p>
								</div>
							</div>

							{showPurchaseFields && (
								<>
									<Separator />
									<div className="space-y-4">
										<h3 className="text-lg font-semibold">
											Purchase Information
										</h3>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<Label htmlFor="latest_purchase_price">
													Latest Purchase Price ($)
												</Label>
												<Input
													id="latest_purchase_price"
													name="latest_purchase_price"
													type="number"
													step="0.01"
													value={formData.latest_purchase_price}
													onChange={handleInputChange}
													placeholder="0.00"
												/>
											</div>

											<div>
												<Label htmlFor="latest_purchase_quantity">
													Latest Purchase Quantity
												</Label>
												<Input
													id="latest_purchase_quantity"
													name="latest_purchase_quantity"
													type="number"
													step="0.001"
													value={formData.latest_purchase_quantity}
													onChange={handleInputChange}
													placeholder="0.000"
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="latest_purchase_unit_id">
												Latest Purchase Unit
											</Label>
											<Select
												name="latest_purchase_unit_id"
												value={formData.latest_purchase_unit_id}
												onValueChange={(value) =>
													handleSelectChange("latest_purchase_unit_id", value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select purchase unit" />
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
								</>
							)}

							{isCostEditable && (
								<>
									<Separator />
									<div>
										<Label htmlFor="current_cost_per_unit">
											Current Cost Per Unit *
										</Label>
										<Input
											id="current_cost_per_unit"
											name="current_cost_per_unit"
											type="number"
											step="0.000001"
											value={formData.current_cost_per_unit}
											onChange={handleInputChange}
											required={isCostEditable}
											placeholder="0.000000"
										/>
										<p className="text-sm text-muted-foreground mt-1">
											Directly set the cost for this item
										</p>
									</div>
								</>
							)}

							{formData.item_type === "PREPARED_GOOD" && (
								<Alert>
									<InfoIcon className="h-4 w-4" />
									<AlertDescription>
										The cost for 'Prepared Good' items is automatically
										calculated and updated from its linked Recipe.
									</AlertDescription>
								</Alert>
							)}

							{(formData.item_type === "RAW_MATERIAL" ||
								formData.item_type === "PACKAGING") &&
								!isEditMode && (
									<Alert>
										<InfoIcon className="h-4 w-4" />
										<AlertDescription>
											The cost for new 'Raw Material' or 'Packaging' items will
											be automatically calculated based on the purchase
											information provided.
										</AlertDescription>
									</Alert>
								)}

							{submitError && (
								<Alert variant="destructive">
									<AlertDescription>
										Error: {submitError.message || "Failed to save item."}
									</AlertDescription>
								</Alert>
							)}

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => navigate("/cogs/inventory-items")}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={submitting}
								>
									{submitting
										? "Saving..."
										: isEditMode
										? "Save Changes"
										: "Create Item"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</MainLayout>
	);
};

export default InventoryItemFormPage;
