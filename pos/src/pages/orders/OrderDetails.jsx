// src/pages/orders/OrderDetails.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import axiosInstance from "../../api/config/axiosConfig";
import { authService } from "../../api/services/authService";
import { resumeOrder, updateOnlineOrderStatus } from "../../utils/orderActions";
import { printReceiptWithAgent } from "../../api/services/localHardwareService";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	// UserCircleIcon, // For customer name, can be generic UserIcon
	ShoppingBagIcon,
	CreditCardIcon,
	PrinterIcon,
	PlayCircleIcon,
	XCircleIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
	ClockIcon as ClockOutlineIcon, // Renamed to avoid conflict
	InformationCircleIcon,
	UserIcon,
	EnvelopeIcon,
	CalendarDaysIcon,
	ArrowPathIcon,
	DocumentTextIcon,
	TagIcon,
	ListBulletIcon,
	// BuildingStorefrontIcon, // Not directly used
	// GlobeAltIcon, // Not directly used
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import { formatPrice } from "../../utils/numberUtils";
import MainLayout from "../layout/MainLayout";

// DetailItem helper component (can be moved to a shared location)
const DetailItem = ({ label, value, icon: IconComponent, children }) => (
	<div>
		<dt className="text-xs font-medium text-slate-500 mb-0.5 flex items-center gap-1">
			{IconComponent && (
				<IconComponent className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
			)}
			{label}
		</dt>
		<dd className="text-sm text-slate-800 break-words">
			{children || value || <span className="italic text-slate-400">N/A</span>}
		</dd>
	</div>
);
DetailItem.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.node,
	icon: PropTypes.elementType,
	children: PropTypes.node,
};

export default function OrderDetails() {
	const { orderId } = useParams();
	const [order, setOrder] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isReprinting, setIsReprinting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	const fetchOrderDetails = useCallback(async () => {
		// Wrapped in useCallback
		setLoading(true);
		setError(null);
		try {
			const [orderResponse, authResponse] = await Promise.all([
				axiosInstance.get(`orders/${orderId}/`),
				authService.checkStatus(),
			]);
			setOrder(orderResponse.data);
			setIsAdmin(authResponse.is_admin);
		} catch (error) {
			console.error("Error fetching order details:", error);
			setError("Could not load order details.");
			toast.error("Could not load order details.");
		} finally {
			setLoading(false);
		}
	}, [orderId]); // Added orderId to dependency array

	useEffect(() => {
		fetchOrderDetails();
	}, [fetchOrderDetails]); // Effect depends on fetchOrderDetails

	const updateOrderStatusLocal = (newStatus) => {
		// Renamed to avoid conflict
		updateOnlineOrderStatus(
			orderId,
			newStatus,
			(updatedOrder) => {
				setOrder(updatedOrder);
				toast.success(`Order status updated to ${newStatus.replace("_", " ")}`);
			},
			(error) => {
				toast.error(`Failed to update status: ${error.message}`);
			}
		);
	};

	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			});
			//eslint-disable-next-line
		} catch (e) {
			return "Invalid Date";
		}
	};

	const handleReprintReceipt = useCallback(async () => {
		if (!order || isReprinting || !order.receipt_payload) {
			if (!order.receipt_payload)
				toast.error("Receipt data not available for this order.");
			return;
		}
		setIsReprinting(true);
		const toastId = toast.loading("Sending reprint request...");
		try {
			const result = await printReceiptWithAgent(order.receipt_payload, false);
			if (result.success) {
				toast.update(toastId, {
					render: "Reprint sent to printer!",
					type: "success",
					isLoading: false,
					autoClose: 3000,
				});
			} else {
				toast.update(toastId, {
					render: `Reprint Failed: ${result.message}`,
					type: "error",
					isLoading: false,
					autoClose: 5000,
				});
			}
		} catch (error) {
			toast.update(toastId, {
				render: `Reprint Failed: ${error.message || "Unknown error"}`,
				type: "error",
				isLoading: false,
				autoClose: 5000,
			});
		} finally {
			setIsReprinting(false);
		}
	}, [order, isReprinting]);

	const getStatusBadgeClass = (status) => {
		switch (status) {
			case "completed":
			case "paid":
				return "bg-emerald-100 text-emerald-700 border border-emerald-200";
			case "voided":
			case "cancelled":
			case "refunded":
				return "bg-red-100 text-red-700 border border-red-200";
			case "preparing":
			case "in_progress":
				return "bg-blue-100 text-blue-700 border border-blue-200";
			case "pending":
				return "bg-yellow-100 text-yellow-700 border border-yellow-200";
			case "saved":
				return "bg-amber-100 text-amber-700 border border-amber-200";
			default:
				return "bg-slate-100 text-slate-700 border border-slate-200";
		}
	};

	const getStatusIcon = (status) => {
		const iconClasses = "h-4 w-4";
		switch (status?.toLowerCase()) {
			case "completed":
			case "paid":
				return (
					<CheckCircleIcon className={`${iconClasses} text-emerald-500`} />
				);
			case "voided":
			case "cancelled":
			case "refunded":
				return <XCircleIcon className={`${iconClasses} text-red-500`} />;
			case "preparing":
			case "in_progress":
			case "pending":
				return <ClockOutlineIcon className={`${iconClasses} text-sky-500`} />; // Changed from ClockSolidIcon
			default:
				return (
					<InformationCircleIcon className={`${iconClasses} text-slate-400`} />
				);
		}
	};

	const getOrderActions = () => {
		const actions = [];
		const buttonBaseStyle =
			"px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm border";
		const primaryButtonStyle = `${buttonBaseStyle} bg-blue-600 text-white border-blue-700 hover:bg-blue-700`;
		const secondaryButtonStyle = `${buttonBaseStyle} bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200`;
		const dangerButtonStyle = `${buttonBaseStyle} bg-red-600 text-white border-red-700 hover:bg-red-700`;
		const successButtonStyle = `${buttonBaseStyle} bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700`;
		const warningButtonStyle = `${buttonBaseStyle} bg-amber-500 text-white border-amber-600 hover:bg-amber-600`;

		if (!order) return null;

		if (order.source === "pos") {
			if (order.status === "in_progress" || order.status === "saved") {
				actions.push(
					<button
						key="resume"
						className={primaryButtonStyle}
						onClick={() => resumeOrder(order.id, navigate)}
					>
						<PlayCircleIcon className="h-4 w-4" /> Resume
					</button>
				);
			}
			if (
				isAdmin &&
				order.status !== "voided" &&
				order.status !== "completed"
			) {
				actions.push(
					<button
						key="void"
						className={dangerButtonStyle}
						onClick={() => updateOrderStatusLocal("voided")}
					>
						<XCircleIcon className="h-4 w-4" /> Void
					</button>
				);
			}
			if (order.status === "completed" && order.receipt_payload) {
				// Check for receipt_payload
				actions.push(
					<button
						key="reprint"
						className={secondaryButtonStyle}
						onClick={handleReprintReceipt}
						disabled={isReprinting}
					>
						{isReprinting ? (
							<ArrowPathIcon className="h-4 w-4 animate-spin" />
						) : (
							<PrinterIcon className="h-4 w-4" />
						)}
						{isReprinting ? "Printing..." : "Reprint"}
					</button>
				);
			}
		} else {
			// website orders
			if (order.status === "pending") {
				actions.push(
					<button
						key="prepare"
						className={warningButtonStyle}
						onClick={() => updateOrderStatusLocal("preparing")}
					>
						<ClockOutlineIcon className="h-4 w-4" /> Prepare
					</button>
				);
			}
			if (order.status === "preparing") {
				actions.push(
					<button
						key="complete"
						className={successButtonStyle}
						onClick={() => updateOrderStatusLocal("completed")}
					>
						<CheckCircleIcon className="h-4 w-4" /> Complete
					</button>
				);
			}
			if (
				isAdmin &&
				order.status !== "cancelled" &&
				order.status !== "completed"
			) {
				actions.push(
					<button
						key="cancel"
						className={dangerButtonStyle}
						onClick={() => updateOrderStatusLocal("cancelled")}
					>
						<XCircleIcon className="h-4 w-4" /> Cancel
					</button>
				);
			}
		}
		return actions.length > 0 ? (
			<div className="flex flex-wrap gap-2 mt-4 border-t border-slate-100 pt-4">
				{actions}
			</div>
		) : null;
	};

	const pageTitle = order ? `Order #${order.id}` : "Order Details";

	if (loading) {
		return (
			<MainLayout pageTitle="Loading Order...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}
	if (error || !order) {
		return (
			<MainLayout pageTitle="Error Loading Order">
				<div className="flex flex-col items-center justify-center h-full p-6 text-center">
					<ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-400" />
					<p className="mb-6 text-slate-600">{error || "Order not found."}</p>
					<button
						className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
						onClick={() => navigate("/orders")}
					>
						<ArrowLeftIcon className="h-4 w-4" /> Back to Orders
					</button>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle={pageTitle}>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-semibold text-slate-800">
						Order Information
					</h2>
					<span
						className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center ${
							order.source === "website"
								? "bg-purple-100 text-purple-700"
								: "bg-cyan-100 text-cyan-700"
						}`}
					>
						{order.source === "website" ? "ONLINE" : "POS"}
					</span>
				</div>
				<button
					className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
					onClick={() => navigate("/orders")}
				>
					<ArrowLeftIcon className="h-4 w-4" /> Back
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
				<div className="lg:col-span-1 space-y-4 sm:space-y-6">
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
						<h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
							<InformationCircleIcon className="w-5 h-5 text-slate-400" />
							Order Summary
						</h3>
						<dl className="space-y-2.5 text-sm">
							<div className="flex justify-between items-center">
								<dt className="font-medium text-slate-500">Status:</dt>
								<dd>
									<span
										className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-xs shadow-sm ${getStatusBadgeClass(
											order.status
										)}`}
									>
										{getStatusIcon(order.status)}
										{order.status?.replace("_", " ").toUpperCase() || "N/A"}
									</span>
								</dd>
							</div>
							<DetailItem
								label="Total"
								value={
									<span className="font-semibold text-base">
										{formatPrice(order.total_price)}
									</span>
								}
							/>
							<DetailItem
								label="Created"
								value={formatDate(order.created_at)}
								icon={CalendarDaysIcon}
							/>
							<DetailItem
								label="Last Updated"
								value={formatDate(order.updated_at)}
								icon={ClockOutlineIcon}
							/>
							{order.source === "pos" && (
								<DetailItem
									label="Created By"
									value={order.created_by}
									icon={UserIcon}
								/>
							)}
						</dl>
						{getOrderActions()}
					</div>

					{order.source === "website" && (
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
							<h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
								<UserIcon className="w-5 h-5 text-slate-400" />
								Customer Information
							</h3>
							<dl className="space-y-2.5 text-sm">
								<DetailItem
									label="Name"
									value={order.customer_display_name || "Guest"}
								/>
								<DetailItem
									label="Email"
									value={order.customer_display_email}
									icon={EnvelopeIcon}
								/>
								{order.payment_status && (
									<div className="flex justify-between items-center">
										<dt className="font-medium text-slate-500">
											Payment Status:
										</dt>
										<dd>
											<span
												className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-xs shadow-sm ${getStatusBadgeClass(
													order.payment_status
												)}`}
											>
												{getStatusIcon(order.payment_status)}
												{order.payment_status?.toUpperCase() || "N/A"}
											</span>
										</dd>
									</div>
								)}
							</dl>
						</div>
					)}
				</div>

				<div className="lg:col-span-2 space-y-4 sm:space-y-6">
					<div
						className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col"
						style={{ maxHeight: "calc(50vh - 2rem)" }}
					>
						<div className="p-4 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
							<ShoppingBagIcon className="w-5 h-5 text-slate-400" />
							<h2 className="text-base font-semibold text-slate-700">
								Order Items ({order.items?.length || 0})
							</h2>
						</div>
						<div className="overflow-y-auto custom-scrollbar flex-grow">
							{order.items && order.items.length > 0 ? (
								<ul className="divide-y divide-slate-100">
									{order.items.map((item) => (
										<li
											key={item.id}
											className="px-4 py-2.5 flex justify-between items-center text-sm hover:bg-slate-50"
										>
											<div>
												<span className="font-medium text-slate-800">
													{item.product?.name || "Unknown Item"}
												</span>
												<span className="text-slate-500 ml-2 text-xs">
													({item.quantity} ×{" "}
													{formatPrice(item.product?.price || 0)})
												</span>
												{item.discount > 0 && (
													<span className="ml-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
														-{item.discount}%
													</span>
												)}
											</div>
											<span className="font-medium text-slate-700">
												{formatPrice(
													item.quantity *
														(item.product?.price || 0) *
														(1 - (item.discount || 0) / 100)
												)}
											</span>
										</li>
									))}
								</ul>
							) : (
								<div className="p-6 text-center text-slate-500 text-sm">
									No items found.
								</div>
							)}
						</div>
					</div>

					<div
						className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col"
						style={{ maxHeight: "calc(50vh - 2rem)" }}
					>
						<div className="p-4 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
							<CreditCardIcon className="w-5 h-5 text-slate-400" />
							<h2 className="text-base font-semibold text-slate-700">
								Payment Information
							</h2>
						</div>
						<div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-grow">
							{order.payment ? (
								<div className="space-y-4 text-sm">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
										<DetailItem
											label="Method"
											value={
												<span className="font-semibold">
													{order.payment.is_split_payment
														? "Split Payment"
														: order.payment.payment_method
														? order.payment.payment_method
																.replace("_", " ")
																.toUpperCase()
														: "N/A"}
												</span>
											}
										/>
										<DetailItem label="Status">
											<span
												className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-xs shadow-sm ${getStatusBadgeClass(
													order.payment?.status
												)}`}
											>
												{getStatusIcon(order.payment?.status)}
												{order.payment?.status
													?.replace("_", " ")
													.toUpperCase() || "N/A"}
											</span>
										</DetailItem>
										<DetailItem
											label="Amount Paid"
											value={
												<span className="font-semibold">
													{formatPrice(
														order.payment.amount || order.total_price
													)}
												</span>
											}
										/>
										<DetailItem
											label="Date"
											value={formatDate(
												order.payment.updated_at || order.payment.created_at
											)}
											icon={CalendarDaysIcon}
										/>
									</div>
									{order.discount_details && (
										<div className="pt-3 border-t border-slate-100">
											<label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
												<TagIcon className="h-3.5 w-3.5" /> Discount Applied
											</label>
											<div className="bg-slate-50 p-2 rounded-md text-xs space-y-0.5 border border-slate-200">
												<p>
													<span className="font-medium text-slate-700">
														Name:
													</span>{" "}
													{order.discount_details.name}
												</p>
												<p>
													<span className="font-medium text-slate-700">
														Code:
													</span>{" "}
													{order.discount_details.code}
												</p>
												<p>
													<span className="font-medium text-slate-700">
														Amount:
													</span>{" "}
													-{formatPrice(order.discount_details.amount_applied)}
												</p>
											</div>
										</div>
									)}
									{order.payment.is_split_payment &&
										order.payment.transactions?.length > 0 && (
											<div className="pt-3 border-t border-slate-100">
												<label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
													<ListBulletIcon className="h-3.5 w-3.5" /> Split
													Transactions
												</label>
												<div className="bg-slate-50 p-2 rounded-md max-h-32 overflow-y-auto custom-scrollbar border border-slate-200">
													<table className="w-full text-xs">
														<thead>
															<tr className="border-b border-slate-200">
																<th className="text-left py-1 px-1 font-semibold text-slate-600">
																	Method
																</th>
																<th className="text-right py-1 px-1 font-semibold text-slate-600">
																	Amount
																</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-slate-100">
															{order.payment.transactions.map((tx, index) => (
																<tr key={tx.id || index}>
																	<td className="py-1 px-1 text-slate-700">
																		{tx.payment_method
																			?.replace("_", " ")
																			.toUpperCase() || "N/A"}
																	</td>
																	<td className="py-1 px-1 text-right text-slate-700">
																		{formatPrice(tx.amount)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											</div>
										)}
									{order.payment.payment_intent_id && (
										<div className="pt-3 border-t border-slate-100">
											<label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
												<DocumentTextIcon className="h-3.5 w-3.5" /> Payment
												Reference
											</label>
											<p className="text-[11px] bg-slate-50 p-2 rounded font-mono text-slate-600 break-all border border-slate-200">
												{order.payment.payment_intent_id}
											</p>
										</div>
									)}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center text-center p-6 h-full">
									<CreditCardIcon className="h-10 w-10 text-slate-300 mb-2" />
									<p className="text-sm text-slate-500">
										No payment information recorded.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
}
