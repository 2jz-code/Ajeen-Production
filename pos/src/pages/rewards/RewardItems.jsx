import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	ArrowLeft,
	Plus,
	Edit2,
	Trash2,
	Gift,
	CheckCircle2,
	XCircle,
	DollarSign,
	Percent,
	Box,
	AlertTriangle,
	RefreshCw,
	Info,
} from "lucide-react";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal";
import Modal from "../../components/common/Modal";
import MainLayout from "../layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper: Format Reward Value Display
const formatRewardValue = (reward) => {
	if (!reward) return <span className="italic text-muted-foreground">N/A</span>;
	if (reward.free_product) {
		return (
			<span className="inline-flex items-center gap-1.5 text-indigo-600">
				<Box className="h-4 w-4" />
				{reward.product_id
					? `Free Product #${reward.product_id}`
					: "Any Free Product"}
			</span>
		);
	}
	if (reward.discount_type === "percentage") {
		return (
			<span className="inline-flex items-center gap-1.5 text-teal-600">
				<Percent className="h-4 w-4" />
				{reward.discount_value || 0}% Off
			</span>
		);
	}
	if (reward.discount_type === "fixed") {
		return (
			<span className="inline-flex items-center gap-1.5 text-blue-600">
				<DollarSign className="h-4 w-4" />
				{new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: "USD",
				}).format(reward.discount_value || 0)}{" "}
				Off
			</span>
		);
	}
	return <span className="italic text-muted-foreground">No Value Set</span>;
};

// Helper: Get status pill styling
const getStatusPill = (isActive) => {
	const baseClasses =
		"px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border";
	if (isActive) {
		return (
			<span
				className={`${baseClasses} bg-green-500/10 text-green-700 border-green-500/20`}
			>
				<CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE
			</span>
		);
	} else {
		return (
			<span
				className={`${baseClasses} bg-red-500/10 text-red-700 border-red-500/20`}
			>
				<XCircle className="h-3.5 w-3.5" /> INACTIVE
			</span>
		);
	}
};

const FormField = ({
	label,
	id,
	children,
	required = false,
	helpText = null,
	error = null,
	className = "",
}) => (
	<div className={`space-y-1.5 ${className}`}>
		<Label htmlFor={id}>
			{label} {required && <span className="text-destructive">*</span>}
		</Label>
		{children}
		{helpText && !error && (
			<p className="text-xs text-muted-foreground flex items-center gap-1">
				<Info className="h-3 w-3 flex-shrink-0" />
				{helpText}
			</p>
		)}
		{error && (
			<p className="text-xs text-destructive flex items-center gap-1">
				<AlertTriangle className="h-3 w-3 flex-shrink-0" />
				{error}
			</p>
		)}
	</div>
);
FormField.propTypes = {
	label: PropTypes.string.isRequired,
	id: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
	required: PropTypes.bool,
	helpText: PropTypes.string,
	error: PropTypes.string,
	className: PropTypes.string,
};

export default function RewardItems() {
	const navigate = useNavigate();
	const { execute, isLoading: isApiLoading, error: apiErrorHook } = useApi();

	const [rewards, setRewards] = useState([]);
	const [showAddEditModal, setShowAddEditModal] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentReward, setCurrentReward] = useState(null);
	const [rewardForm, setRewardForm] = useState({
		name: "",
		description: "",
		points_required: "",
		is_active: true,
		discount_type: "",
		discount_value: "",
		free_product: false,
		product_id: "",
	});
	const [formErrors, setFormErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fetchError, setFetchError] = useState(null);

	const fetchRewards = useCallback(async () => {
		setFetchError(null);
		try {
			const data = await execute(() => rewardsService.getRewards());
			setRewards(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("Error fetching rewards:", error);
			const message =
				apiErrorHook ||
				error.message ||
				"Failed to load rewards. Please try again.";
			setFetchError(message);
			toast.error(message);
			setRewards([]);
		}
	}, [execute, apiErrorHook]);

	useEffect(() => {
		fetchRewards();
	}, [fetchRewards]);

	const resetForm = () => {
		setRewardForm({
			name: "",
			description: "",
			points_required: "",
			is_active: true,
			discount_type: "",
			discount_value: "",
			free_product: false,
			product_id: "",
		});
		setFormErrors({});
		setCurrentReward(null);
	};

	const handleOpenAddModal = () => {
		resetForm();
		setIsEditMode(false);
		setShowAddEditModal(true);
	};

	const handleOpenEditModal = (reward) => {
		if (!reward) return;
		setCurrentReward(reward);
		setRewardForm({
			name: reward.name || "",
			description: reward.description || "",
			points_required: reward.points_required ?? "",
			is_active: reward.is_active ?? true,
			discount_type: reward.discount_type || "",
			discount_value: reward.discount_value ?? "",
			free_product: reward.free_product ?? false,
			product_id: reward.product_id ?? "",
		});
		setFormErrors({});
		setIsEditMode(true);
		setShowAddEditModal(true);
	};

	const handleOpenDeleteModal = (reward) => {
		if (!reward) return;
		setCurrentReward(reward);
		setShowDeleteModal(true);
	};

	const handleCloseModal = () => {
		setShowAddEditModal(false);
		setShowDeleteModal(false);
		setTimeout(resetForm, 300);
	};

	const handleFormChange = (e) => {
		const { name, value, type, checked } = e.target;
		let newValue = value;

		if (type === "checkbox" && name === "free_product") {
			newValue = checked;
			setRewardForm((prev) => ({
				...prev,
				discount_type: checked ? "" : prev.discount_type,
				discount_value: checked ? "" : prev.discount_value,
				product_id: !checked ? "" : prev.product_id,
				[name]: newValue,
			}));
			setFormErrors((prev) => ({
				...prev,
				discount_type: null,
				discount_value: null,
				product_id: !checked ? prev.product_id : null,
			}));
			return;
		}
		if (type === "checkbox" && name === "is_active") {
			newValue = checked;
		}

		setRewardForm((prev) => ({ ...prev, [name]: newValue }));
		if (formErrors[name]) {
			setFormErrors((prev) => ({ ...prev, [name]: null }));
		}
		if (name === "discount_type" && formErrors.discount_value) {
			setFormErrors((prev) => ({ ...prev, discount_value: null }));
		}
	};

	const handleSelectChange = (name, value) => {
		setRewardForm((prev) => ({ ...prev, [name]: value }));
		if (formErrors[name]) {
			setFormErrors((prev) => ({ ...prev, [name]: null }));
		}
	};

	const validateForm = () => {
		const errors = {};
		if (!rewardForm.name.trim()) errors.name = "Reward Name is required.";
		if (
			rewardForm.points_required === "" ||
			isNaN(Number(rewardForm.points_required)) ||
			Number(rewardForm.points_required) <= 0
		) {
			errors.points_required = "Points Required must be a positive number.";
		}

		if (rewardForm.free_product) {
			if (
				rewardForm.product_id !== "" &&
				(isNaN(Number(rewardForm.product_id)) ||
					Number(rewardForm.product_id) <= 0)
			) {
				errors.product_id = "Product ID must be a positive number if provided.";
			}
		} else {
			if (!rewardForm.discount_type) {
				errors.discount_type =
					"Discount Type is required if not a Free Product.";
			}
			if (
				rewardForm.discount_type &&
				(rewardForm.discount_value === "" ||
					isNaN(Number(rewardForm.discount_value)) ||
					Number(rewardForm.discount_value) <= 0)
			) {
				errors.discount_value =
					"Discount Value is required and must be positive.";
			} else if (
				rewardForm.discount_type === "percentage" &&
				Number(rewardForm.discount_value) > 100
			) {
				errors.discount_value = "Percentage cannot exceed 100.";
			}
		}
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmitForm = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			toast.warn("Please fix the errors in the form.");
			return;
		}
		setIsSubmitting(true);
		const payload = {
			...rewardForm,
			points_required: Number(rewardForm.points_required),
			discount_type: rewardForm.free_product ? null : rewardForm.discount_type,
			discount_value: rewardForm.free_product
				? null
				: rewardForm.discount_value
				? Number(rewardForm.discount_value)
				: null,
			product_id: rewardForm.free_product
				? rewardForm.product_id
					? Number(rewardForm.product_id)
					: null
				: null,
			is_active: Boolean(rewardForm.is_active),
			free_product: Boolean(rewardForm.free_product),
		};

		try {
			if (isEditMode && currentReward) {
				await execute(
					() => rewardsService.updateReward(currentReward.id, payload),
					{ successMessage: "Reward updated successfully!" }
				);
			} else {
				await execute(() => rewardsService.createReward(payload), {
					successMessage: "Reward created successfully!",
				});
			}
			fetchRewards();
			handleCloseModal();
		} catch (error) {
			console.error(
				`Error ${isEditMode ? "updating" : "creating"} reward:`,
				error
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleConfirmDelete = async () => {
		if (!currentReward?.id) return;
		setIsSubmitting(true);
		try {
			await execute(() => rewardsService.deleteReward(currentReward.id), {
				successMessage: `Reward "${currentReward.name}" deleted.`,
			});
			fetchRewards();
			handleCloseModal();
		} catch (error) {
			console.error("Error deleting reward:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const isLoadingPage = isApiLoading && rewards.length === 0 && !fetchError;

	return (
		<MainLayout pageTitle="Reward Items">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
					<Gift className="h-6 w-6 text-primary" />
					Manage Reward Items
				</h1>
				<div className="flex items-center gap-2">
					<Button
						onClick={handleOpenAddModal}
						disabled={isApiLoading || isSubmitting}
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Reward
					</Button>
					<Button
						variant="outline"
						onClick={() => navigate("/rewards")}
						disabled={isApiLoading || isSubmitting}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Rewards Hub
					</Button>
				</div>
			</div>

			{isLoadingPage ? (
				<div className="flex h-[calc(100vh-250px)] items-center justify-center">
					<LoadingSpinner size="lg" />
				</div>
			) : fetchError ? (
				<Card className="border-destructive/50 bg-destructive/10">
					<CardHeader>
						<CardTitle className="text-destructive flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							Error Loading Rewards
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-destructive mb-3">{fetchError}</p>
						<Button
							variant="destructive"
							size="sm"
							onClick={fetchRewards}
							disabled={isApiLoading || isSubmitting}
						>
							<RefreshCw className="h-4 w-4 mr-2" /> Retry
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Available Reward Items</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead className="text-center">Points</TableHead>
										<TableHead>Value / Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rewards.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan="5"
												className="h-24 text-center text-muted-foreground"
											>
												No reward items found. Add one to get started.
											</TableCell>
										</TableRow>
									) : (
										rewards.map((reward) => (
											<TableRow
												key={reward.id}
												className="hover:bg-muted/50"
											>
												<TableCell>
													<div className="font-medium text-foreground">
														{reward.name}
													</div>
													<div
														className="text-xs text-muted-foreground line-clamp-1"
														title={reward.description}
													>
														{reward.description || (
															<span className="italic">No description</span>
														)}
													</div>
												</TableCell>
												<TableCell className="text-center font-semibold text-primary">
													{reward.points_required}
												</TableCell>
												<TableCell>{formatRewardValue(reward)}</TableCell>
												<TableCell>{getStatusPill(reward.is_active)}</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 mr-1"
														onClick={() => handleOpenEditModal(reward)}
														disabled={isApiLoading || isSubmitting}
														title="Edit Reward"
													>
														<Edit2 className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-destructive-foreground hover:bg-destructive/10"
														onClick={() => handleOpenDeleteModal(reward)}
														disabled={isApiLoading || isSubmitting}
														title="Delete Reward"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			<Modal
				isOpen={showAddEditModal}
				onClose={handleCloseModal}
				title={isEditMode ? "Edit Reward Item" : "Add New Reward Item"}
				size="lg"
			>
				<form
					onSubmit={handleSubmitForm}
					noValidate
				>
					<div className="space-y-4 p-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
						<FormField
							label="Reward Name"
							id="reward-name"
							required
							error={formErrors.name}
						>
							<Input
								id="reward-name"
								name="name"
								value={rewardForm.name}
								onChange={handleFormChange}
								required
								placeholder="e.g., Free Coffee"
								className={formErrors.name ? "border-destructive" : ""}
							/>
						</FormField>
						<FormField
							label="Description"
							id="reward-description"
							helpText="Optional description for the reward (e.g., for staff)."
							error={formErrors.description}
						>
							<Input
								id="reward-description"
								name="description"
								value={rewardForm.description}
								onChange={handleFormChange}
								placeholder="e.g., Any regular-size hot coffee"
								className={formErrors.description ? "border-destructive" : ""}
							/>
						</FormField>
						<FormField
							label="Points Required"
							id="reward-points"
							required
							error={formErrors.points_required}
						>
							<Input
								type="number"
								id="reward-points"
								name="points_required"
								min="1"
								step="1"
								required
								value={rewardForm.points_required}
								onChange={handleFormChange}
								placeholder="e.g., 100"
								className={
									formErrors.points_required ? "border-destructive" : ""
								}
							/>
						</FormField>

						<div className="space-y-3 pt-3 border-t border-border">
							<Label className="font-medium">Reward Type*</Label>
							<div className="flex items-center gap-4">
								<div className="flex items-center">
									<Checkbox
										id="free_product_checkbox"
										name="free_product"
										checked={rewardForm.free_product}
										onCheckedChange={(checked) =>
											handleFormChange({
												target: {
													name: "free_product",
													checked,
													type: "checkbox",
												},
											})
										}
									/>
									<Label
										htmlFor="free_product_checkbox"
										className="ml-2 cursor-pointer"
									>
										Free Product
									</Label>
								</div>
								<div className="flex items-center">
									<input
										type="radio"
										id="discount_type_radio"
										name="reward_type_selector_radio"
										value="discount"
										checked={!rewardForm.free_product}
										onChange={() =>
											handleFormChange({
												target: {
													name: "free_product",
													checked: false,
													type: "checkbox",
												},
											})
										}
										className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
									/>
									<Label
										htmlFor="discount_type_radio"
										className="ml-2 cursor-pointer"
									>
										Discount
									</Label>
								</div>
							</div>
						</div>

						{rewardForm.free_product ? (
							<FormField
								label="Specific Product ID (Optional)"
								id="reward-product-id"
								helpText="Leave blank if reward is for any product (e.g. any free drink)."
								error={formErrors.product_id}
							>
								<Input
									type="number"
									id="reward-product-id"
									name="product_id"
									min="1"
									step="1"
									value={rewardForm.product_id}
									onChange={handleFormChange}
									placeholder="Enter Product ID if specific"
									className={formErrors.product_id ? "border-destructive" : ""}
								/>
							</FormField>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<FormField
									label="Discount Type"
									id="reward-discount-type"
									required={!rewardForm.free_product}
									error={formErrors.discount_type}
								>
									<Select
										name="discount_type"
										value={rewardForm.discount_type}
										onValueChange={(value) =>
											handleSelectChange("discount_type", value)
										}
										disabled={rewardForm.free_product}
									>
										<SelectTrigger
											id="reward-discount-type"
											className={
												formErrors.discount_type ? "border-destructive" : ""
											}
										>
											<SelectValue placeholder="Select Type..." />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="percentage">Percentage (%)</SelectItem>
											<SelectItem value="fixed">Fixed Amount ($)</SelectItem>
										</SelectContent>
									</Select>
								</FormField>
								<FormField
									label={`Value ${
										rewardForm.discount_type === "percentage" ? "(%)" : "($)"
									}`}
									id="reward-discount-value"
									required={
										!rewardForm.free_product && !!rewardForm.discount_type
									}
									error={formErrors.discount_value}
								>
									<Input
										type="number"
										id="reward-discount-value"
										name="discount_value"
										value={rewardForm.discount_value}
										onChange={handleFormChange}
										required={
											!rewardForm.free_product && !!rewardForm.discount_type
										}
										min={
											rewardForm.discount_type === "percentage" ? "0" : "0.01"
										}
										max={
											rewardForm.discount_type === "percentage"
												? "100"
												: undefined
										}
										step={
											rewardForm.discount_type === "percentage" ? "1" : "0.01"
										}
										disabled={
											!rewardForm.discount_type || rewardForm.free_product
										}
										className={
											formErrors.discount_value ? "border-destructive" : ""
										}
										placeholder="e.g., 10 or 5.00"
									/>
								</FormField>
							</div>
						)}
						<div className="flex items-center pt-3">
							<Checkbox
								id="reward-is-active"
								name="is_active"
								checked={rewardForm.is_active}
								onCheckedChange={(checked) =>
									handleFormChange({
										target: { name: "is_active", checked, type: "checkbox" },
									})
								}
							/>
							<Label
								htmlFor="reward-is-active"
								className="ml-2 cursor-pointer"
							>
								Reward is Active
							</Label>
						</div>
					</div>

					<div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={handleCloseModal}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || isApiLoading}
						>
							{isSubmitting ? (
								<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
							) : null}
							{isSubmitting
								? "Saving..."
								: isEditMode
								? "Update Reward"
								: "Create Reward"}
						</Button>
					</div>
				</form>
			</Modal>

			{showDeleteModal && currentReward && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={handleCloseModal}
					onConfirm={handleConfirmDelete}
					title="Delete Reward Item"
					message={`Are you sure you want to delete the reward "${currentReward.name}"? This action cannot be undone.`}
					confirmButtonText={isSubmitting ? "Deleting..." : "Delete"}
					confirmButtonClass="bg-red-600 hover:bg-red-700"
					isConfirmDisabled={isSubmitting || isApiLoading}
				/>
			)}
		</MainLayout>
	);
}
