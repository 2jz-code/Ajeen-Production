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
	Scale,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	RefreshCw,
	Info,
	Sparkles,
	Box,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper: Format Rule Type/Value Display
const formatRuleValue = (rule) => {
	if (!rule) return <span className="italic text-muted-foreground">N/A</span>;
	if (rule.is_product_specific) {
		return (
			<span className="inline-flex items-center gap-1.5 text-indigo-600">
				<Box className="h-4 w-4" />
				{rule.product_points || 0} points / Product #{rule.product_id || "?"}
			</span>
		);
	}
	if (rule.is_promotion) {
		return (
			<span className="inline-flex items-center gap-1.5 text-amber-600">
				<Sparkles className="h-4 w-4" />
				{rule.multiplier || 1}x Points Multiplier
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 text-emerald-600">
			<Scale className="h-4 w-4" />
			{rule.points_per_dollar || 0} points / $
			{rule.minimum_order_amount > 0 && ` (min $${rule.minimum_order_amount})`}
		</span>
	);
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

// Helper: Format promotion dates
const formatPromoDates = (start, end) => {
	if (!start && !end)
		return <span className="italic text-muted-foreground">Always Active</span>;
	const formatDate = (dateStr) =>
		dateStr
			? new Date(dateStr).toLocaleString(undefined, {
					dateStyle: "short",
					timeStyle: "short",
			  })
			: "N/A";
	return (
		<div className="text-xs space-y-0.5">
			{start && (
				<div className="text-muted-foreground">Start: {formatDate(start)}</div>
			)}
			{end && (
				<div className="text-muted-foreground">End: {formatDate(end)}</div>
			)}
		</div>
	);
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

export default function PointsRules() {
	const navigate = useNavigate();
	const { execute, isLoading: isApiLoading, error: apiErrorHook } = useApi();

	const [rules, setRules] = useState([]);
	const [showAddEditModal, setShowAddEditModal] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentRule, setCurrentRule] = useState(null);
	const [ruleForm, setRuleForm] = useState({
		name: "",
		description: "",
		points_per_dollar: "1",
		minimum_order_amount: "0",
		is_product_specific: false,
		product_id: "",
		product_points: "",
		is_promotion: false,
		multiplier: "",
		promotion_start: "",
		promotion_end: "",
		is_active: true,
	});
	const [formErrors, setFormErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fetchError, setFetchError] = useState(null);

	const fetchRules = useCallback(async () => {
		setFetchError(null);
		try {
			const data = await execute(() => rewardsService.getPointsRules());
			setRules(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("Error fetching points rules:", error);
			const message =
				apiErrorHook ||
				error.message ||
				"Failed to load points rules. Please try again.";
			setFetchError(message);
			toast.error(message);
			setRules([]);
		}
	}, [execute, apiErrorHook]);

	useEffect(() => {
		fetchRules();
	}, [fetchRules]);

	const resetForm = () => {
		setRuleForm({
			name: "",
			description: "",
			points_per_dollar: "1",
			minimum_order_amount: "0",
			is_product_specific: false,
			product_id: "",
			product_points: "",
			is_promotion: false,
			multiplier: "",
			promotion_start: "",
			promotion_end: "",
			is_active: true,
		});
		setFormErrors({});
		setCurrentRule(null);
	};

	const handleOpenAddModal = () => {
		resetForm();
		setIsEditMode(false);
		setShowAddEditModal(true);
	};

	const handleOpenEditModal = (rule) => {
		if (!rule) return;
		setCurrentRule(rule);
		const formatDateTimeLocal = (dateStr) => {
			if (!dateStr) return "";
			try {
				const date = new Date(dateStr);
				const tzoffset = date.getTimezoneOffset() * 60000;
				const localISOTime = new Date(date.getTime() - tzoffset)
					.toISOString()
					.slice(0, 16);
				return localISOTime;
			} catch {
				return "";
			}
		};
		setRuleForm({
			name: rule.name || "",
			description: rule.description || "",
			points_per_dollar: rule.points_per_dollar ?? "1",
			minimum_order_amount: rule.minimum_order_amount ?? "0",
			is_product_specific: rule.is_product_specific ?? false,
			product_id: rule.product_id ?? "",
			product_points: rule.product_points ?? "",
			is_promotion: rule.is_promotion ?? false,
			multiplier: rule.multiplier ?? "",
			promotion_start: formatDateTimeLocal(rule.promotion_start),
			promotion_end: formatDateTimeLocal(rule.promotion_end),
			is_active: rule.is_active ?? true,
		});
		setFormErrors({});
		setIsEditMode(true);
		setShowAddEditModal(true);
	};

	const handleOpenDeleteModal = (rule) => {
		if (!rule) return;
		setCurrentRule(rule);
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

		if (type === "checkbox") {
			newValue = checked;
			if (name === "is_product_specific" && checked) {
				setRuleForm((prev) => ({
					...prev,
					is_promotion: false,
					[name]: newValue,
				}));
				setFormErrors((prev) => ({
					...prev,
					multiplier: null,
					promotion_start: null,
					promotion_end: null,
				}));
				return;
			}
			if (name === "is_promotion" && checked) {
				setRuleForm((prev) => ({
					...prev,
					is_product_specific: false,
					[name]: newValue,
				}));
				setFormErrors((prev) => ({
					...prev,
					product_id: null,
					product_points: null,
				}));
				return;
			}
		}
		if (type === "radio" && name === "rule_type_selector") {
			const isProduct = value === "product";
			const isPromo = value === "promotion";
			setRuleForm((prev) => ({
				...prev,
				is_product_specific: isProduct,
				is_promotion: isPromo,
			}));
			setFormErrors((prev) => ({
				...prev,
				multiplier: null,
				promotion_start: null,
				promotion_end: null,
				product_id: null,
				product_points: null,
			})); // Clear errors for other types
			return;
		}

		setRuleForm((prev) => ({ ...prev, [name]: newValue }));
		if (formErrors[name]) {
			setFormErrors((prev) => ({ ...prev, [name]: null }));
		}
		if (name === "promotion_start" && formErrors.promotion_end) {
			setFormErrors((prev) => ({ ...prev, promotion_end: null }));
		}
	};

	const validateForm = () => {
		const errors = {};
		if (!ruleForm.name.trim()) errors.name = "Rule Name is required.";
		if (ruleForm.is_product_specific) {
			if (
				ruleForm.product_id === "" ||
				isNaN(Number(ruleForm.product_id)) ||
				Number(ruleForm.product_id) <= 0
			) {
				errors.product_id =
					"Product ID is required and must be a positive number.";
			}
			if (
				ruleForm.product_points === "" ||
				isNaN(Number(ruleForm.product_points)) ||
				Number(ruleForm.product_points) <= 0
			) {
				errors.product_points =
					"Points Per Product is required and must be positive.";
			}
		} else if (ruleForm.is_promotion) {
			if (
				ruleForm.multiplier === "" ||
				isNaN(Number(ruleForm.multiplier)) ||
				Number(ruleForm.multiplier) <= 1
			) {
				errors.multiplier =
					"Multiplier is required and must be greater than 1.";
			}
			if (
				ruleForm.promotion_start &&
				ruleForm.promotion_end &&
				ruleForm.promotion_start >= ruleForm.promotion_end
			) {
				errors.promotion_end =
					"Promotion End date/time must be after the Start date/time.";
			}
		} else {
			// Standard Rule
			if (
				ruleForm.points_per_dollar === "" ||
				isNaN(Number(ruleForm.points_per_dollar)) ||
				Number(ruleForm.points_per_dollar) <= 0
			) {
				errors.points_per_dollar =
					"Points Per Dollar is required and must be positive.";
			}
			if (
				ruleForm.minimum_order_amount !== "" &&
				(isNaN(Number(ruleForm.minimum_order_amount)) ||
					Number(ruleForm.minimum_order_amount) < 0)
			) {
				errors.minimum_order_amount =
					"Minimum Order Amount must be a non-negative number.";
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
		const payload = { ...ruleForm };
		payload.points_per_dollar =
			payload.is_product_specific || payload.is_promotion
				? null
				: Number(payload.points_per_dollar);
		payload.minimum_order_amount =
			payload.is_product_specific || payload.is_promotion
				? null
				: payload.minimum_order_amount
				? Number(payload.minimum_order_amount)
				: 0;
		payload.product_id = payload.is_product_specific
			? payload.product_id
				? Number(payload.product_id)
				: null
			: null;
		payload.product_points = payload.is_product_specific
			? payload.product_points
				? Number(payload.product_points)
				: null
			: null;
		payload.multiplier = payload.is_promotion
			? payload.multiplier
				? Number(payload.multiplier)
				: null
			: null;
		payload.promotion_start =
			payload.is_promotion && payload.promotion_start
				? new Date(payload.promotion_start).toISOString()
				: null;
		payload.promotion_end =
			payload.is_promotion && payload.promotion_end
				? new Date(payload.promotion_end).toISOString()
				: null;
		payload.is_active = Boolean(payload.is_active);
		payload.is_product_specific = Boolean(payload.is_product_specific);
		payload.is_promotion = Boolean(payload.is_promotion);

		try {
			if (isEditMode && currentRule) {
				await execute(
					() => rewardsService.updatePointsRule(currentRule.id, payload),
					{ successMessage: "Points rule updated successfully!" }
				);
			} else {
				await execute(() => rewardsService.createPointsRule(payload), {
					successMessage: "Points rule created successfully!",
				});
			}
			fetchRules();
			handleCloseModal();
		} catch (error) {
			console.error(
				`Error ${isEditMode ? "updating" : "creating"} points rule:`,
				error
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleConfirmDelete = async () => {
		if (!currentRule?.id) return;
		setIsSubmitting(true);
		try {
			await execute(() => rewardsService.deletePointsRule(currentRule.id), {
				successMessage: `Rule "${currentRule.name}" deleted.`,
			});
			fetchRules();
			handleCloseModal();
		} catch (error) {
			console.error("Error deleting points rule:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const isLoadingPage = isApiLoading && rules.length === 0 && !fetchError;

	return (
		<MainLayout pageTitle="Points Rules">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
					<Scale className="h-6 w-6 text-primary" />
					Manage Points Rules
				</h1>
				<div className="flex items-center gap-2">
					<Button
						onClick={handleOpenAddModal}
						disabled={isApiLoading || isSubmitting}
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Rule
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
							Error Loading Rules
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-destructive mb-3">{fetchError}</p>
						<Button
							variant="destructive"
							size="sm"
							onClick={fetchRules}
							disabled={isApiLoading || isSubmitting}
						>
							<RefreshCw className="h-4 w-4 mr-2" /> Retry
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Configured Points Rules</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Rule Name</TableHead>
										<TableHead>Details / Value</TableHead>
										<TableHead>Promotion Dates</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rules.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan="5"
												className="h-24 text-center text-muted-foreground"
											>
												No points rules found. Click &quot;Add Rule&quot; to
												create one.
											</TableCell>
										</TableRow>
									) : (
										rules.map((rule) => (
											<TableRow
												key={rule.id}
												className="hover:bg-muted/50"
											>
												<TableCell>
													<div className="font-medium text-foreground">
														{rule.name}
													</div>
													<div
														className="text-xs text-muted-foreground line-clamp-1"
														title={rule.description}
													>
														{rule.description || (
															<span className="italic">No description</span>
														)}
													</div>
												</TableCell>
												<TableCell>{formatRuleValue(rule)}</TableCell>
												<TableCell>
													{rule.is_promotion ? (
														formatPromoDates(
															rule.promotion_start,
															rule.promotion_end
														)
													) : (
														<span className="italic text-muted-foreground">
															N/A
														</span>
													)}
												</TableCell>
												<TableCell>{getStatusPill(rule.is_active)}</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 mr-1"
														onClick={() => handleOpenEditModal(rule)}
														disabled={isApiLoading || isSubmitting}
														title="Edit Rule"
													>
														<Edit2 className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-destructive-foreground hover:bg-destructive/10"
														onClick={() => handleOpenDeleteModal(rule)}
														disabled={isApiLoading || isSubmitting}
														title="Delete Rule"
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
				title={isEditMode ? "Edit Points Rule" : "Add New Points Rule"}
				size="lg"
			>
				<form
					onSubmit={handleSubmitForm}
					noValidate
				>
					<div className="space-y-4 p-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
						<FormField
							label="Rule Name"
							id="rule-name"
							required
							error={formErrors.name}
						>
							<Input
								id="rule-name"
								name="name"
								value={ruleForm.name}
								onChange={handleFormChange}
								required
								placeholder="e.g., Weekend Double Points"
								className={formErrors.name ? "border-destructive" : ""}
							/>
						</FormField>
						<FormField
							label="Description"
							id="rule-description"
							helpText="Optional internal note about this rule."
						>
							<Input
								id="rule-description"
								name="description"
								value={ruleForm.description}
								onChange={handleFormChange}
								placeholder="e.g., For all sales on Sat & Sun"
							/>
						</FormField>
						<div className="flex items-center pt-2">
							<Checkbox
								id="rule-is-active"
								name="is_active"
								checked={ruleForm.is_active}
								onCheckedChange={(checked) =>
									handleFormChange({
										target: { name: "is_active", checked, type: "checkbox" },
									})
								}
							/>
							<Label
								htmlFor="rule-is-active"
								className="ml-2 cursor-pointer"
							>
								Rule is Active
							</Label>
						</div>

						<fieldset className="space-y-2 pt-3 border-t border-border">
							<Label className="font-medium">Rule Type*</Label>
							<div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
								{["standard", "product", "promotion"].map((type) => (
									<Label
										key={type}
										className="flex items-center cursor-pointer rounded-md border border-border p-2 hover:bg-muted has-[:checked]:bg-primary/10 has-[:checked]:border-primary flex-1 min-w-[150px]"
									>
										<input
											type="radio"
											name="rule_type_selector" // This ensures they are part of the same group
											value={type}
											checked={
												// Determine checked state based on ruleForm flags
												(type === "standard" &&
													!ruleForm.is_product_specific &&
													!ruleForm.is_promotion) ||
												(type === "product" && ruleForm.is_product_specific) ||
												(type === "promotion" && ruleForm.is_promotion)
											}
											onChange={handleFormChange}
											className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
										/>
										<span className="ml-2 text-sm text-foreground capitalize">
											{type === "standard"
												? "Standard (Points per $)"
												: type === "product"
												? "Product Specific"
												: "Promotion (Multiplier)"}
										</span>
									</Label>
								))}
							</div>
						</fieldset>

						{!ruleForm.is_product_specific &&
							!ruleForm.is_promotion && ( // Standard fields
								<div className="space-y-4 pt-3 border-t border-border">
									<FormField
										label="Points Per Dollar"
										id="rule-points-per-dollar"
										required
										error={formErrors.points_per_dollar}
									>
										<Input
											type="number"
											id="rule-points-per-dollar"
											name="points_per_dollar"
											min="0.01"
											step="0.01"
											required
											value={ruleForm.points_per_dollar}
											onChange={handleFormChange}
											className={
												formErrors.points_per_dollar ? "border-destructive" : ""
											}
										/>
									</FormField>
									<FormField
										label="Minimum Order Amount ($)"
										id="rule-min-order"
										helpText="Optional. Minimum subtotal to earn points."
										error={formErrors.minimum_order_amount}
									>
										<Input
											type="number"
											id="rule-min-order"
											name="minimum_order_amount"
											min="0"
											step="0.01"
											value={ruleForm.minimum_order_amount}
											onChange={handleFormChange}
											className={
												formErrors.minimum_order_amount
													? "border-destructive"
													: ""
											}
										/>
									</FormField>
								</div>
							)}
						{ruleForm.is_product_specific && (
							<div className="space-y-4 pt-3 border-t border-border">
								<FormField
									label="Product ID"
									id="rule-product-id"
									required
									error={formErrors.product_id}
								>
									<Input
										type="number"
										id="rule-product-id"
										name="product_id"
										min="1"
										step="1"
										required
										value={ruleForm.product_id}
										onChange={handleFormChange}
										className={
											formErrors.product_id ? "border-destructive" : ""
										}
									/>
								</FormField>
								<FormField
									label="Points Per Product"
									id="rule-product-points"
									required
									error={formErrors.product_points}
								>
									<Input
										type="number"
										id="rule-product-points"
										name="product_points"
										min="1"
										step="1"
										required
										value={ruleForm.product_points}
										onChange={handleFormChange}
										className={
											formErrors.product_points ? "border-destructive" : ""
										}
									/>
								</FormField>
							</div>
						)}
						{ruleForm.is_promotion && (
							<div className="space-y-4 pt-3 border-t border-border">
								<FormField
									label="Points Multiplier"
									id="rule-multiplier"
									required
									helpText="e.g., 2 for double points. Must be > 1."
									error={formErrors.multiplier}
								>
									<Input
										type="number"
										id="rule-multiplier"
										name="multiplier"
										min="1.1"
										step="0.1"
										required
										value={ruleForm.multiplier}
										onChange={handleFormChange}
										className={
											formErrors.multiplier ? "border-destructive" : ""
										}
									/>
								</FormField>
								<FormField
									label="Promotion Start (Optional)"
									id="rule-promo-start"
									helpText="When the promotion begins."
									error={formErrors.promotion_start}
								>
									<Input
										type="datetime-local"
										id="rule-promo-start"
										name="promotion_start"
										value={ruleForm.promotion_start}
										onChange={handleFormChange}
										className={
											formErrors.promotion_start ? "border-destructive" : ""
										}
									/>
								</FormField>
								<FormField
									label="Promotion End (Optional)"
									id="rule-promo-end"
									helpText="When the promotion ends."
									error={formErrors.promotion_end}
								>
									<Input
										type="datetime-local"
										id="rule-promo-end"
										name="promotion_end"
										value={ruleForm.promotion_end}
										onChange={handleFormChange}
										min={ruleForm.promotion_start || ""}
										className={
											formErrors.promotion_end ? "border-destructive" : ""
										}
									/>
								</FormField>
							</div>
						)}
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
								? "Update Rule"
								: "Create Rule"}
						</Button>
					</div>
				</form>
			</Modal>

			{showDeleteModal && currentRule && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={handleCloseModal}
					onConfirm={handleConfirmDelete}
					title="Delete Points Rule"
					message={`Are you sure you want to delete the rule "${currentRule.name}"? This action cannot be undone.`}
					confirmButtonText={isSubmitting ? "Deleting..." : "Delete"}
					confirmButtonClass="bg-red-600 hover:bg-red-700"
					isConfirmDisabled={isSubmitting || isApiLoading}
				/>
			)}
		</MainLayout>
	);
}
