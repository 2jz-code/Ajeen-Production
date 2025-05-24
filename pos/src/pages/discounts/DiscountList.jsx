// src/pages/discounts/DiscountList.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { discountService } from "../../api/services/discountService";
import { authService } from "../../api/services/authService";
import { useApi } from "../../api/hooks/useApi";
import {
	TagIcon as PageIcon, // Renamed for page title
	PlusIcon,
	PencilSquareIcon,
	TrashIcon,
	CalendarDaysIcon,
	// Bars3Icon, // Handled by MainLayout
	BuildingStorefrontIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	InformationCircleIcon,
	CheckCircleIcon,
	XCircleIcon,
	ArchiveBoxXMarkIcon,
	TagIcon, // Keep for general discount icon
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal";
import MainLayout from "../layout/MainLayout";

// Helper: Format date string
const formatDate = (dateString) => {
	if (!dateString) return "N/A";
	try {
		return new Date(dateString).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		//eslint-disable-next-line
	} catch (e) {
		return "Invalid Date";
	}
};

// Helper: Format discount value
const formatValue = (discount) => {
	if (!discount) return "N/A";
	if (discount.discount_type === "percentage") return `${discount.value}%`;
	if (discount.discount_type === "fixed")
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(discount.value);
	return String(discount.value);
};

// Helper: Get discount type label
const getDiscountTypeLabel = (discount) => {
	if (!discount) return "Unknown";
	const type =
		discount.discount_type === "percentage" ? "Percentage" : "Fixed Amount";
	let appliesTo = "";
	switch (discount.apply_to) {
		case "order":
			appliesTo = "Order";
			break;
		case "product":
			appliesTo = "Product(s)";
			break;
		case "category":
			appliesTo = "Category(s)";
			break;
		default:
			appliesTo = "Unknown Target";
	}
	return `${type} / ${appliesTo}`;
};

// Helper: Get status pill styling
const getStatusPill = (isActive) => {
	const baseClasses =
		"px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 border";
	if (isActive)
		return (
			<span
				className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
			>
				<CheckCircleIcon className="h-3 w-3" /> ACTIVE
			</span>
		);
	return (
		<span className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}>
			<XCircleIcon className="h-3 w-3" /> INACTIVE
		</span>
	);
};

// Helper: Get category/schedule pill styling
const getCategoryPill = (discount) => {
	const baseClasses =
		"px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border";
	if (discount.discount_category === "permanent")
		return (
			<span
				className={`${baseClasses} bg-indigo-50 text-indigo-700 border-indigo-200`}
			>
				<BuildingStorefrontIcon className="h-3 w-3" /> PERMANENT
			</span>
		);
	if (discount.start_date || discount.end_date)
		return (
			<span className={`${baseClasses} bg-sky-50 text-sky-700 border-sky-200`}>
				<CalendarDaysIcon className="h-3 w-3" /> SCHEDULED
			</span>
		);
	return (
		<span
			className={`${baseClasses} bg-orange-50 text-orange-700 border-orange-200`}
		>
			<TagIcon className="h-3 w-3" /> PROMOTIONAL
		</span>
	);
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color = "gray" }) => {
	const colors = {
		green: {
			bg: "bg-emerald-50",
			text: "text-emerald-600",
			iconBg: "bg-emerald-100",
		},
		sky: { bg: "bg-sky-50", text: "text-sky-600", iconBg: "bg-sky-100" },
		slate: {
			bg: "bg-slate-50",
			text: "text-slate-600",
			iconBg: "bg-slate-100",
		},
		indigo: {
			bg: "bg-indigo-50",
			text: "text-indigo-600",
			iconBg: "bg-indigo-100",
		},
	};
	const selectedColor = colors[color] || colors.slate;
	return (
		<div
			className={`flex items-center rounded-lg border border-slate-200 ${selectedColor.bg} p-3 shadow-sm`}
		>
			<div
				className={`mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${selectedColor.iconBg} ${selectedColor.text}`}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div>
				<dt className="truncate text-xs font-medium text-slate-500">{title}</dt>
				<dd className="text-xl font-semibold text-slate-800">{value}</dd>
			</div>
		</div>
	);
};
StatCard.propTypes = {
	title: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	icon: PropTypes.elementType.isRequired,
	color: PropTypes.string,
};

// Table Header Cell Component
const Th = ({ children, align = "left" }) => (
	<th
		scope="col"
		className={`whitespace-nowrap px-4 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500`}
	>
		{children}
	</th>
);
Th.propTypes = { children: PropTypes.node, align: PropTypes.string };

// Table Data Cell Component
const Td = ({ children, align = "left", isHeader = false }) => (
	<td
		className={`px-4 py-2.5 text-${align} text-xs ${
			isHeader ? "font-medium text-slate-800" : "text-slate-600"
		}`}
	>
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	isHeader: PropTypes.bool,
};

export default function DiscountList() {
	const navigate = useNavigate();
	const {
		execute,
		isLoading: isApiLoadingInitial,
		error: apiErrorHook,
	} = useApi(); // isLoading for initial, isSubmitting for actions

	const [discounts, setDiscounts] = useState([]);
	const [filteredDiscounts, setFilteredDiscounts] = useState([]);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentDiscount, setCurrentDiscount] = useState(null);
	const [filter, setFilter] = useState("all");
	const [isAdmin, setIsAdmin] = useState(false); // Retained for add/edit/delete buttons
	// const [userName, setUserName] = useState(""); // Handled by MainLayout footer
	const [fetchError, setFetchError] = useState(null);
	const [isSubmittingAction, setIsSubmittingAction] = useState(false); // For delete operation

	const [stats, setStats] = useState({
		activeCount: 0,
		upcomingCount: 0,
		expiredCount: 0,
		permanentCount: 0,
	});

	const fetchData = useCallback(async () => {
		setFetchError(null);
		// isApiLoadingInitial is true here via execute
		try {
			const [discountsResponse, authResponse] = await Promise.all([
				execute(() => discountService.getDiscounts()),
				execute(() => authService.checkStatus()), // Still need admin status for buttons
			]);
			const discountData = Array.isArray(discountsResponse)
				? discountsResponse
				: [];
			setDiscounts(discountData);
			setIsAdmin(authResponse.is_admin);
			// setUserName(authResponse.username); // Handled by MainLayout

			const now = new Date();
			let active = 0,
				upcoming = 0,
				expired = 0,
				permanent = 0;
			discountData.forEach((d) => {
				const startDate = d.start_date ? new Date(d.start_date) : null;
				const endDate = d.end_date ? new Date(d.end_date) : null;
				const isActiveNow =
					d.is_active &&
					(!startDate || startDate <= now) &&
					(!endDate || endDate >= now);
				if (d.discount_category === "permanent" && d.is_active) {
					permanent++;
					if (isActiveNow) active++;
				} else if (d.discount_category === "promotional") {
					if (startDate && startDate > now && d.is_active) upcoming++;
					else if (endDate && endDate < now) expired++;
					else if (isActiveNow) active++;
				} else if (isActiveNow) active++;
			});
			setStats({
				activeCount: active,
				upcomingCount: upcoming,
				expiredCount: expired,
				permanentCount: permanent,
			});
		} catch (error) {
			console.error("Error fetching data:", error);
			const message =
				apiErrorHook || "Failed to load discounts. Please try again.";
			setFetchError(message);
			setDiscounts([]);
			setStats({
				activeCount: 0,
				upcomingCount: 0,
				expiredCount: 0,
				permanentCount: 0,
			});
		}
	}, [execute, apiErrorHook]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		const now = new Date();
		const filtered = discounts.filter((discount) => {
			const startDate = discount.start_date
				? new Date(discount.start_date)
				: null;
			const endDate = discount.end_date ? new Date(discount.end_date) : null;
			const isActiveNow =
				discount.is_active &&
				(!startDate || startDate <= now) &&
				(!endDate || endDate >= now);
			const isUpcoming = discount.is_active && startDate && startDate > now;
			const isExpired = endDate && endDate < now;
			switch (filter) {
				case "active":
					return isActiveNow;
				case "inactive":
					return !discount.is_active || isExpired;
				case "scheduled":
					return (
						discount.discount_category === "promotional" &&
						(startDate || endDate)
					);
				case "permanent":
					return discount.discount_category === "permanent";
				case "upcoming":
					return isUpcoming;
				case "expired":
					return isExpired;
				default:
					return true;
			}
		});
		setFilteredDiscounts(filtered);
	}, [discounts, filter]);

	const handleDeleteDiscount = (discount) => {
		setCurrentDiscount(discount);
		setShowDeleteModal(true);
	};

	const handleConfirmDelete = async () => {
		if (!currentDiscount) return;
		setIsSubmittingAction(true); // For delete button specifically
		try {
			await execute(() => discountService.deleteDiscount(currentDiscount.id), {
				successMessage: `Discount "${currentDiscount.name}" deleted successfully`,
				errorMessage: "Failed to delete discount",
			});
			fetchData(); // Refetch all data
			setShowDeleteModal(false);
			setCurrentDiscount(null);
		} catch (error) {
			console.error("Error deleting discount:", error);
		} finally {
			setIsSubmittingAction(false);
			setShowDeleteModal(false);
		}
	};

	const tabButtonBase =
		"flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1";
	const tabButtonActive = "bg-orange-600 text-white shadow-sm";
	const tabButtonInactive =
		"bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700";
	const actionButtonClass =
		"p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-orange-400";

	if (isApiLoadingInitial && discounts.length === 0 && !fetchError) {
		return (
			<MainLayout pageTitle="Loading Discounts...">
				<div className="flex h-full items-center justify-center">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle="Discount Management">
			<div className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 sm:text-2xl">
					<PageIcon className="h-6 w-6 text-orange-500" />
					Discounts
				</h2>
				{isAdmin && (
					<button
						onClick={() => navigate("/discounts/create")}
						className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
					>
						{" "}
						<PlusIcon className="h-4 w-4" /> Add Discount
					</button>
				)}
			</div>

			{/* Stats Summary */}
			<div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
				<StatCard
					title="Active Now"
					value={stats.activeCount}
					icon={CheckCircleIcon}
					color="green"
				/>
				<StatCard
					title="Permanent"
					value={stats.permanentCount}
					icon={BuildingStorefrontIcon}
					color="indigo"
				/>
				<StatCard
					title="Upcoming"
					value={stats.upcomingCount}
					icon={CalendarDaysIcon}
					color="sky"
				/>
				<StatCard
					title="Expired"
					value={stats.expiredCount}
					icon={ArchiveBoxXMarkIcon}
					color="slate"
				/>
			</div>

			{/* Filter Tabs */}
			<div className="mb-4 flex-shrink-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
				<div className="flex flex-wrap gap-1.5">
					{[
						{ key: "all", label: "All Discounts" },
						{ key: "active", label: "Active Now" },
						{ key: "permanent", label: "Permanent" },
						{ key: "scheduled", label: "Scheduled" },
						{ key: "upcoming", label: "Upcoming" },
						{ key: "expired", label: "Expired" },
						{ key: "inactive", label: "Inactive" },
					].map((item) => (
						<button
							key={item.key}
							className={`${tabButtonBase} ${
								filter === item.key ? tabButtonActive : tabButtonInactive
							}`}
							onClick={() => setFilter(item.key)}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				{isApiLoadingInitial &&
					discounts.length === 0 && ( // Show main loader if it's initial load AND no data
						<div className="flex h-full items-center justify-center">
							<LoadingSpinner size="md" />
						</div>
					)}
				{fetchError && !isApiLoadingInitial && (
					<div className="flex h-full flex-col items-center justify-center p-6 text-center">
						<ExclamationTriangleIcon className="mb-2 h-8 w-8 text-red-400" />
						<p className="mb-3 text-sm text-red-600">{fetchError}</p>
						<button
							onClick={fetchData}
							disabled={isApiLoadingInitial || isSubmittingAction}
							className="flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
						>
							<ArrowPathIcon className="h-3.5 w-3.5" /> Retry
						</button>
					</div>
				)}
				{!isApiLoadingInitial && !fetchError && (
					<div className="custom-scrollbar h-full overflow-auto">
						{isSubmittingAction && (
							<div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
								<LoadingSpinner size="sm" />
							</div>
						)}
						<table className="min-w-full divide-y divide-slate-100">
							<thead className="sticky top-0 z-10 bg-slate-50">
								<tr>
									<Th>Name / Category</Th>
									<Th>Code</Th>
									<Th>Type / Applies To</Th>
									<Th>Value</Th>
									<Th>Dates</Th>
									<Th>Status</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{filteredDiscounts.length === 0 ? (
									<tr>
										<td
											colSpan="7"
											className="p-8 text-center text-sm text-slate-500"
										>
											No discounts match filters.
										</td>
									</tr>
								) : (
									filteredDiscounts.map((discount) => (
										<tr
											key={discount.id}
											className="transition-colors hover:bg-slate-50/50"
										>
											<Td>
												<div className="font-medium text-slate-800">
													{discount.name}
												</div>
												<div className="mt-0.5">
													{getCategoryPill(discount)}
												</div>
											</Td>
											<Td>
												{discount.code ? (
													<span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
														{discount.code}
													</span>
												) : (
													<span className="text-xs italic text-slate-400">
														Auto
													</span>
												)}
											</Td>
											<Td>
												<span className="text-xs text-slate-600">
													{getDiscountTypeLabel(discount)}
												</span>
											</Td>
											<Td isHeader>{formatValue(discount)}</Td>
											<Td>
												{discount.start_date || discount.end_date ? (
													<>
														{discount.start_date && (
															<div className="text-xs">
																Start: {formatDate(discount.start_date)}
															</div>
														)}
														{discount.end_date && (
															<div className="text-xs mt-0.5">
																End: {formatDate(discount.end_date)}
															</div>
														)}
													</>
												) : (
													<span className="text-xs italic text-slate-400">
														Always
													</span>
												)}
											</Td>
											<Td>{getStatusPill(discount.is_active)}</Td>
											<Td align="right">
												<button
													onClick={() =>
														navigate(`/discounts/edit/${discount.id}`)
													}
													className={`${actionButtonClass} mr-1`}
													title="Edit Discount"
													disabled={isSubmittingAction}
												>
													<PencilSquareIcon className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDeleteDiscount(discount)}
													className={`${actionButtonClass} text-red-500 hover:bg-red-50 hover:text-red-700 focus:ring-red-400`}
													title="Delete Discount"
													disabled={isSubmittingAction}
												>
													<TrashIcon className="h-4 w-4" />
												</button>
											</Td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<footer className="mt-4 flex-shrink-0 rounded-lg bg-white px-4 py-2 text-xs shadow-sm border border-slate-200">
				<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
					<span className="flex items-center gap-2 text-slate-600">
						<InformationCircleIcon className="h-3.5 w-3.5 text-slate-400" />
						<span>Showing: {filteredDiscounts.length} discount(s)</span>
					</span>
					{/* User info from MainLayout's footer */}
				</div>
			</footer>

			{showDeleteModal && currentDiscount && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleConfirmDelete}
					title="Delete Discount"
					message={`Are you sure you want to delete "${currentDiscount.name}"? This action cannot be undone.`}
					confirmButtonText={isSubmittingAction ? "Deleting..." : "Delete"}
					confirmButtonClass="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
					isConfirmDisabled={isSubmittingAction}
				/>
			)}
		</MainLayout>
	);
}
