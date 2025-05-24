// src/pages/payments/Payments.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService"; // Kept for isAdmin if needed for content
import RefundSuccessModal from "./RefundSuccessModal"; // Modal restored
import LoadingSpinner from "../reports/components/LoadingSpinner";
import {
	CreditCardIcon as PageIcon,
	BanknotesIcon,
	CreditCardIcon, // For method display
	TicketIcon,
	EyeIcon,
	// Bars3Icon, // Handled by MainLayout
	ExclamationTriangleIcon,
	ArrowPathIcon,
	InformationCircleIcon,
	SquaresPlusIcon,
	ClockIcon,
	CheckCircleIcon,
	XCircleIcon,
} from "@heroicons/react/24/outline";
import MainLayout from "../layout/MainLayout";

// Helper components for table styling
const Th = ({ children, align = "left", className = "" }) => (
	<th
		scope="col"
		className={`whitespace-nowrap px-4 py-2.5 text-${align} text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}
	>
		{children}
	</th>
);
Th.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	className: PropTypes.string,
};

const Td = ({ children, align = "left", className = "", isHeader = false }) => (
	<td
		className={`whitespace-nowrap px-4 py-2 text-${align} text-xs ${
			isHeader ? "font-medium text-slate-800" : "text-slate-600"
		} ${className}`}
	>
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	className: PropTypes.string,
	isHeader: PropTypes.bool,
};

export default function Payments() {
	const [allPaymentsForStatus, setAllPaymentsForStatus] = useState([]);
	const [filteredPayments, setFilteredPayments] = useState([]);
	const [activeTab, setActiveTab] = useState("all");
	const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
	//eslint-disable-next-line
	const [isAdmin, setIsAdmin] = useState(false); // Retained for potential page-specific logic not handled by MainLayout
	//eslint-disable-next-line
	const [userName, setUserName] = useState(""); // Retained for potential page-specific logic
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();
	const [refundSuccessData, setRefundSuccessData] = useState(null); // Modal state restored

	const applyFrontendMethodFilter = useCallback(
		(paymentsToFilter, methodFilter) => {
			let newlyFiltered = [];
			if (methodFilter === "all") {
				newlyFiltered = paymentsToFilter;
			} else if (methodFilter === "split") {
				newlyFiltered = paymentsToFilter.filter((p) => p.is_split_payment);
			} else if (methodFilter === "cash") {
				newlyFiltered = paymentsToFilter.filter(
					(p) =>
						!p.is_split_payment && p.payment_method?.toLowerCase() === "cash"
				);
			} else if (methodFilter === "credit") {
				newlyFiltered = paymentsToFilter.filter(
					(p) =>
						!p.is_split_payment &&
						(p.payment_method?.toLowerCase() === "credit" ||
							p.payment_method?.toLowerCase() === "card")
				);
			}
			setFilteredPayments(newlyFiltered);
		},
		[]
	);

	const fetchPaymentsByStatus = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		// Not clearing allPaymentsForStatus / filteredPayments here to prevent UI flashing if only method filter changes
		try {
			const filters = {};
			if (activeTab !== "all") filters.status = activeTab;

			// Fetch auth status for isAdmin/userName if MainLayout doesn't pass it down
			// For now, assuming MainLayout handles the user display in its own header/footer.
			// If this page *needs* isAdmin for content decisions, this call is fine.
			const authResponse = await authService.checkStatus();
			setIsAdmin(authResponse.is_admin);
			setUserName(authResponse.username); // User for footer notice if not using MainLayout's

			const paymentsData = await paymentService.getPayments(filters);
			const fetchedPayments = Array.isArray(paymentsData) ? paymentsData : [];
			setAllPaymentsForStatus(fetchedPayments);
			applyFrontendMethodFilter(fetchedPayments, paymentMethodFilter);
		} catch (err) {
			console.error("Error fetching payments:", err);
			setError(
				err.response?.data?.detail ||
					"Failed to load payments. Please try again."
			);
			setAllPaymentsForStatus([]);
			setFilteredPayments([]);
		} finally {
			setIsLoading(false);
		}
	}, [activeTab, paymentMethodFilter, applyFrontendMethodFilter]);

	useEffect(() => {
		fetchPaymentsByStatus();
	}, [fetchPaymentsByStatus]);

	// This useEffect for method filter remains, but it now operates on allPaymentsForStatus
	useEffect(() => {
		if (!isLoading) {
			applyFrontendMethodFilter(allPaymentsForStatus, paymentMethodFilter);
		}
	}, [
		paymentMethodFilter,
		allPaymentsForStatus,
		isLoading,
		applyFrontendMethodFilter,
	]);

	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return "$ --";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	};

	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "short",
				timeStyle: "short",
			});
			//eslint-disable-next-line
		} catch (e) {
			return "Invalid Date";
		}
	};

	const getStatusPill = (status) => {
		const lowerStatus = status?.toLowerCase();
		const baseClasses =
			"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap";
		switch (lowerStatus) {
			case "completed":
				return (
					<span
						className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
					>
						<CheckCircleIcon className="h-3 w-3" />
						COMPLETED
					</span>
				);
			case "refunded":
				return (
					<span
						className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}
					>
						<XCircleIcon className="h-3 w-3" />
						REFUNDED
					</span>
				);
			case "partially_refunded":
				return (
					<span
						className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}
					>
						<ExclamationTriangleIcon className="h-3 w-3" />
						PARTIAL REFUND
					</span>
				);
			case "failed":
				return (
					<span
						className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}
					>
						<XCircleIcon className="h-3 w-3" />
						FAILED
					</span>
				);
			case "pending":
			case "processing":
				return (
					<span
						className={`${baseClasses} bg-sky-50 text-sky-700 border-sky-200`}
					>
						<ClockIcon className="h-3 w-3" />
						{lowerStatus.toUpperCase()}
					</span>
				);
			default:
				return (
					<span
						className={`${baseClasses} bg-slate-100 text-slate-600 border-slate-200`}
					>
						{String(status ?? "UNKNOWN").toUpperCase()}
					</span>
				);
		}
	};

	const getPaymentMethodDisplay = (payment) => {
		const baseClasses =
			"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap";
		if (payment.is_split_payment) {
			return (
				<span
					className={`${baseClasses} bg-purple-50 text-purple-700 border-purple-200`}
				>
					<SquaresPlusIcon className="h-3 w-3" />
					SPLIT
				</span>
			);
		}
		const method = payment.payment_method?.toLowerCase();
		if (method === "cash")
			return (
				<span
					className={`${baseClasses} bg-green-50 text-green-700 border-green-200`}
				>
					<BanknotesIcon className="h-3 w-3" />
					CASH
				</span>
			);
		if (method === "credit" || method === "card")
			return (
				<span
					className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}
				>
					<CreditCardIcon className="h-3 w-3" />
					CARD
				</span>
			);
		return (
			<span
				className={`${baseClasses} bg-slate-100 text-slate-700 border-slate-200`}
			>
				<TicketIcon className="h-3 w-3" />
				{method ? method.toUpperCase() : "N/A"}
			</span>
		);
	};

	const viewPaymentDetails = (paymentId) => navigate(`/payments/${paymentId}`);
	const viewAssociatedOrder = (orderId) => {
		if (orderId) navigate(`/orders/${orderId}`);
		else console.warn("No associated order ID found for this payment.");
	};

	const tabButtonBase =
		"flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1";
	const tabButtonActive = "bg-blue-600 text-white shadow-sm";
	const tabButtonInactive =
		"bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700";
	const actionButtonClass =
		"p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400";

	return (
		<MainLayout pageTitle="Payment Management">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
					<PageIcon className="h-6 w-6 text-slate-600" />
					Payment Records
				</h2>
				{/* Dashboard button is in MainLayout */}
			</div>

			<div className="mb-4 grid flex-shrink-0 grid-cols-1 gap-3 md:grid-cols-2">
				<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
					<div className="mb-1.5 px-1 text-xs font-semibold text-slate-500">
						Filter by Status
					</div>
					<div className="flex flex-wrap gap-1.5">
						{[
							"all",
							"completed",
							"refunded",
							"partially_refunded",
							"failed",
							"pending",
						].map((tab) => (
							<button
								key={tab}
								className={`${tabButtonBase} ${
									activeTab === tab ? tabButtonActive : tabButtonInactive
								}`}
								onClick={() => setActiveTab(tab)}
							>
								{tab.toUpperCase().replace("_", " ")}
							</button>
						))}
					</div>
				</div>
				<div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
					<div className="mb-1.5 px-1 text-xs font-semibold text-slate-500">
						Filter by Method
					</div>
					<div className="flex flex-wrap gap-1.5">
						{["all", "cash", "credit", "split"].map((method) => (
							<button
								key={method}
								className={`${tabButtonBase} ${
									paymentMethodFilter === method
										? tabButtonActive
										: tabButtonInactive
								}`}
								onClick={() => setPaymentMethodFilter(method)}
							>
								{method.toUpperCase()}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				{isLoading && filteredPayments.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<LoadingSpinner size="md" />
					</div>
				) : error ? (
					<div className="flex h-full flex-col items-center justify-center p-6 text-center">
						<ExclamationTriangleIcon className="mb-2 h-8 w-8 text-red-400" />
						<p className="mb-3 text-sm text-red-600">{error}</p>
						<button
							onClick={() => fetchPaymentsByStatus(true)}
							className="flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
						>
							<ArrowPathIcon className="h-3.5 w-3.5" /> Retry
						</button>
					</div>
				) : (
					<div className="custom-scrollbar h-full overflow-auto">
						<table className="min-w-full divide-y divide-slate-100">
							<thead className="sticky top-0 z-10 bg-slate-50">
								<tr>
									<Th>ID</Th>
									<Th>Date</Th>
									<Th>Method</Th>
									<Th align="right">Amount</Th>
									<Th>Status</Th>
									<Th>Order</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{filteredPayments.length === 0 ? (
									<tr>
										<td
											colSpan="7"
											className="p-8 text-center text-sm text-slate-500"
										>
											No payments match filters.
										</td>
									</tr>
								) : (
									filteredPayments.map((payment) => (
										<tr
											key={payment.id}
											className="transition-colors hover:bg-slate-50/50"
										>
											<Td isHeader>#{payment.id}</Td>
											<Td>{formatDate(payment.created_at)}</Td>
											<Td>{getPaymentMethodDisplay(payment)}</Td>
											<Td
												isHeader
												align="right"
											>
												{formatCurrency(payment.amount)}
											</Td>
											<Td>{getStatusPill(payment.status)}</Td>
											<Td>
												{payment.order ? (
													<button
														onClick={() => viewAssociatedOrder(payment.order)}
														className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-blue-600 hover:bg-blue-50 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-400"
														title={`View Order #${payment.order}`}
													>
														<TicketIcon className="h-3.5 w-3.5 flex-shrink-0" />{" "}
														#{payment.order}
													</button>
												) : (
													<span className="text-xs text-slate-400 italic">
														N/A
													</span>
												)}
											</Td>
											<Td align="right">
												<button
													onClick={() => viewPaymentDetails(payment.id)}
													className={actionButtonClass}
													title="View Details"
												>
													<EyeIcon className="h-4 w-4" />
												</button>
											</Td>
										</tr>
									))
								)}
							</tbody>
						</table>
						{isLoading && filteredPayments.length > 0 && (
							<div className="p-4 text-center text-slate-500 text-sm">
								<ArrowPathIcon className="h-4 w-4 inline animate-spin mr-2" />{" "}
								Loading more...
							</div>
						)}
					</div>
				)}
			</div>

			<footer className="mt-4 flex-shrink-0 rounded-lg bg-white px-4 py-2 text-xs shadow-sm border border-slate-200">
				<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
					<span className="flex items-center gap-2 text-slate-600">
						<InformationCircleIcon className="h-3.5 w-3.5 text-slate-400" />
						<span>Payments Shown: {filteredPayments.length}</span>
						{paymentMethodFilter !== "all" || activeTab !== "all" ? (
							<span className="text-slate-400">
								(Filtered from {allPaymentsForStatus.length} matching status
								&quot;{activeTab}&quot;)
							</span>
						) : (
							<span className="text-slate-400">
								(Total: {allPaymentsForStatus.length})
							</span>
						)}
					</span>
					{/* userName and isAdmin will be in MainLayout's footer */}
				</div>
			</footer>

			{/* RefundSuccessModal and its trigger logic are part of PaymentDetails, kept there */}
			{refundSuccessData && (
				<RefundSuccessModal
					isOpen={!!refundSuccessData}
					onClose={() => setRefundSuccessData(null)}
					refundDetails={refundSuccessData} // Ensure this matches what RefundSuccessModal expects
				/>
			)}
		</MainLayout>
	);
}
