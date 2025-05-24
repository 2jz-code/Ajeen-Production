// src/pages/payments/PaymentDetails.jsx
import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useParams, useNavigate } from "react-router-dom";
import { paymentService } from "../../api/services/paymentService";
import { authService } from "../../api/services/authService";
import RefundConfirmation from "./RefundConfirmation"; // Restored
import RefundSuccessModal from "./RefundSuccessModal"; // Restored
import LoadingSpinner from "../reports/components/LoadingSpinner";
import { formatPrice } from "../../utils/numberUtils";
import {
	ArrowLeftIcon,
	BanknotesIcon,
	CreditCardIcon as CreditCardIconOutline,
	ArrowUturnLeftIcon,
	TicketIcon,
	InformationCircleIcon,
	DocumentTextIcon,
	HashtagIcon,
	ClockIcon as ClockOutlineIcon,
	CalendarDaysIcon,
	ExclamationTriangleIcon as ExclamationTriangleIconOutline,
} from "@heroicons/react/24/outline";
import {
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon as ClockSolidIcon,
	ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from "@heroicons/react/24/solid";
import { openDrawerWithAgent } from "../../api/services/localHardwareService";
import MainLayout from "../layout/MainLayout";

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

// DetailItem Helper
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

export default function PaymentDetails() {
	const { paymentId } = useParams();
	const navigate = useNavigate();
	const [payment, setPayment] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false); // Retained for refund button logic
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	// Modal states restored
	const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
	const [isProcessingRefund, setIsProcessingRefund] = useState(false);
	const [refundSuccessData, setRefundSuccessData] = useState(null);
	const [transactionToRefund, setTransactionToRefund] = useState(null);

	const fetchPaymentDetails = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const [paymentResponse, authResponse] = await Promise.all([
				paymentService.getPaymentById(paymentId),
				authService.checkStatus(), // Check admin status for refund capability
			]);
			setPayment(paymentResponse);
			setIsAdmin(authResponse.is_admin);
		} catch (err) {
			console.error("Error fetching payment details:", err);
			setError(err.response?.data?.detail || "Failed to load payment details.");
		} finally {
			setIsLoading(false);
		}
	}, [paymentId]);

	useEffect(() => {
		fetchPaymentDetails();
	}, [fetchPaymentDetails]);

	const formatDate = (timestamp) =>
		timestamp
			? new Date(timestamp).toLocaleString(undefined, {
					dateStyle: "short",
					timeStyle: "short",
			  })
			: "N/A";

	const getStatusPillClasses = (status) => {
		const lowerStatus = status?.toLowerCase();
		const baseClasses =
			"inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm whitespace-nowrap";
		switch (lowerStatus) {
			case "completed":
				return `${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`;
			case "refunded":
				return `${baseClasses} bg-rose-50 text-rose-700 border-rose-200`;
			case "partially_refunded":
				return `${baseClasses} bg-amber-50 text-amber-700 border-amber-200`;
			case "failed":
				return `${baseClasses} bg-red-50 text-red-700 border-red-200`;
			case "pending":
			case "processing":
				return `${baseClasses} bg-sky-50 text-sky-700 border-sky-200`;
			default:
				return `${baseClasses} bg-slate-100 text-slate-600 border-slate-200`;
		}
	};

	const getStatusIcon = (status) => {
		const iconClasses = "h-3.5 w-3.5";
		const lowerStatus = status?.toLowerCase();
		switch (lowerStatus) {
			case "completed":
				return (
					<CheckCircleIcon className={`${iconClasses} text-emerald-500`} />
				);
			case "refunded":
			case "failed":
				return <XCircleIcon className={`${iconClasses} text-red-500`} />;
			case "partially_refunded":
				return (
					<ExclamationTriangleIconSolid
						className={`${iconClasses} text-amber-500`}
					/>
				);
			case "pending":
			case "processing":
				return <ClockSolidIcon className={`${iconClasses} text-sky-500`} />;
			default:
				return (
					<InformationCircleIcon className={`${iconClasses} text-slate-400`} />
				);
		}
	};

	const getPaymentMethodDisplay = (method, isSplit) => {
		const baseClasses = "inline-flex items-center gap-1.5 text-sm";
		if (isSplit)
			return (
				<span className={`${baseClasses} font-medium text-purple-700`}>
					<TicketIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
					Split Payment
				</span>
			);
		switch (method?.toLowerCase()) {
			case "cash":
				return (
					<span className={`${baseClasses} font-medium text-green-700`}>
						<BanknotesIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
						Cash
					</span>
				);
			case "credit":
			case "card":
				return (
					<span className={`${baseClasses} font-medium text-blue-700`}>
						<CreditCardIconOutline className="h-4 w-4 text-blue-500 flex-shrink-0" />
						Credit Card
					</span>
				);
			default:
				return (
					<span className={`${baseClasses} font-medium text-slate-600`}>
						<TicketIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
						{method ? method.toUpperCase() : "N/A"}
					</span>
				);
		}
	};

	// Modal handlers restored
	const openRefundModal = (transaction) => {
		if (transaction?.status !== "completed") {
			alert("Only completed transactions can be refunded.");
			return;
		}
		setTransactionToRefund(transaction);
		setIsRefundModalOpen(true);
	};

	const handleConfirmRefund = async (refundInputData) => {
		if (!payment || !transactionToRefund) return;
		setIsProcessingRefund(true);
		setError(null);
		try {
			const refundPayload = {
				transaction_id: transactionToRefund.id,
				amount: refundInputData.amount,
				reason: refundInputData.reason,
			};
			const response = await paymentService.processRefund(
				payment.id,
				refundPayload
			);
			if (response.success) {
				const updatedPaymentData = await paymentService.getPaymentById(
					paymentId
				);
				const originalMethod =
					transactionToRefund.payment_method?.toLowerCase();
				if (originalMethod === "cash") {
					await openDrawerWithAgent();
				}
				setPayment(updatedPaymentData);
				setIsRefundModalOpen(false);
				setRefundSuccessData(response); // Pass the whole response
				setTransactionToRefund(null);
			} else {
				throw new Error(
					response.message || "Refund processing failed on the backend."
				);
			}
		} catch (err) {
			console.error("Error processing refund:", err);
			const errorMsg =
				err.response?.data?.error ||
				err.message ||
				"An unexpected error occurred during refund.";
			setError(errorMsg);
		} finally {
			setIsProcessingRefund(false);
		}
	};

	const pageTitle = payment ? `Payment #${payment.id}` : "Payment Details";

	if (isLoading) {
		return (
			<MainLayout pageTitle="Loading Payment...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}
	if (error && !payment) {
		// Error during initial load
		return (
			<MainLayout pageTitle="Error Loading Payment">
				<div className="flex flex-col items-center justify-center h-full p-6 text-center">
					<ExclamationTriangleIconOutline className="mb-4 h-12 w-12 text-red-400" />
					<h1 className="mb-2 text-xl font-semibold text-slate-800">
						Error Loading Payment Details
					</h1>
					<p className="mb-6 text-slate-600">{error || "Payment not found."}</p>
					<button
						className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
						onClick={() => navigate("/payments")}
					>
						<ArrowLeftIcon className="h-4 w-4" /> Back to Payments
					</button>
				</div>
			</MainLayout>
		);
	}
	if (!payment) {
		// Should be caught by error state if fetch fails, but as a fallback
		return (
			<MainLayout pageTitle="Payment Not Found">
				<div className="text-center p-8">Payment data could not be loaded.</div>
			</MainLayout>
		);
	}

	const transactions = Array.isArray(payment.transactions)
		? payment.transactions
		: [];
	const canRefundAny =
		isAdmin && transactions.some((txn) => txn.status === "completed");

	return (
		<MainLayout pageTitle={pageTitle}>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-semibold text-slate-800">
						Payment Record
					</h2>
					<span className={getStatusPillClasses(payment.status)}>
						{getStatusIcon(payment.status)}
						{payment.status?.replace("_", " ").toUpperCase()}
					</span>
				</div>
				<button
					className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
					onClick={() => navigate("/payments")}
				>
					<ArrowLeftIcon className="h-4 w-4" /> Back to Payments
				</button>
			</div>

			{error && ( // Display error from refund processing, if any
				<div
					role="alert"
					className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
				>
					<ExclamationTriangleIconOutline className="h-5 w-5 flex-shrink-0" />
					<span>{error}</span>
					<button
						onClick={() => setError(null)}
						className="ml-2 rounded p-0.5 text-red-600 hover:bg-red-100"
						aria-label="Dismiss error"
					>
						<XCircleIcon className="h-4 w-4" />
					</button>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
				<div className="lg:col-span-1 space-y-4 sm:space-y-6">
					<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
						<h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
							<InformationCircleIcon className="w-5 h-5 text-slate-400" />
							Payment Summary
						</h3>
						<dl className="space-y-3">
							<DetailItem
								label="Payment ID"
								value={`#${payment.id}`}
								icon={HashtagIcon}
							/>
							<DetailItem
								label="Total Amount"
								value={
									<span className="text-lg font-semibold text-slate-900">
										{formatPrice(payment.amount)}
									</span>
								}
							/>
							<div className="flex items-center justify-between">
								{" "}
								{/* Inline status as it's key summary info */}
								<dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
									<ClockOutlineIcon className="h-3.5 w-3.5 text-slate-400" />
									Overall Status
								</dt>
								<dd>
									<span className={getStatusPillClasses(payment.status)}>
										{getStatusIcon(payment.status)}
										{payment.status?.replace("_", " ").toUpperCase()}
									</span>
								</dd>
							</div>
							<DetailItem
								label="Method"
								value={getPaymentMethodDisplay(
									payment.payment_method,
									payment.is_split_payment
								)}
								icon={
									payment.is_split_payment
										? TicketIcon
										: payment.payment_method === "cash"
										? BanknotesIcon
										: CreditCardIconOutline
								}
							/>
							<DetailItem
								label="Date Created"
								value={formatDate(payment.created_at)}
								icon={CalendarDaysIcon}
							/>
							<DetailItem
								label="Last Updated"
								value={formatDate(payment.updated_at)}
								icon={ClockOutlineIcon}
							/>
						</dl>
					</div>

					{payment.order && (
						<div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
							<h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
								<DocumentTextIcon className="w-5 h-5 text-slate-400" />
								Associated Order
							</h3>
							<DetailItem
								label="Order ID"
								value={
									<button
										onClick={() => navigate(`/orders/${payment.order}`)}
										className="text-sm font-medium text-blue-600 hover:underline focus:outline-none"
									>
										#{payment.order}
									</button>
								}
								icon={HashtagIcon}
							/>
						</div>
					)}
				</div>

				<div
					className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col"
					style={{ maxHeight: "calc(100vh - 230px)" }}
				>
					{" "}
					{/* Adjust max height for layout */}
					<div className="p-4 border-b border-slate-200 flex-shrink-0">
						<h3 className="text-base font-semibold text-slate-700">
							Transactions ({transactions.length})
						</h3>
					</div>
					<div className="custom-scrollbar flex-1 overflow-auto">
						{transactions.length === 0 ? (
							<div className="p-6 text-center text-sm text-slate-500">
								No individual transactions found for this payment.
							</div>
						) : (
							<table className="min-w-full divide-y divide-slate-100">
								<thead className="bg-slate-50 sticky top-0 z-10">
									<tr>
										<Th>ID / Method</Th>
										<Th align="right">Amount</Th>
										<Th>Status</Th>
										{canRefundAny && <Th align="right">Actions</Th>}
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 bg-white">
									{transactions.map((txn) => (
										<tr
											key={txn.id}
											className="hover:bg-slate-50/50"
										>
											<Td>
												<div className="text-xs font-medium text-slate-800">
													#{txn.id}
												</div>
												<div className="mt-0.5 text-[11px] text-slate-500">
													{getPaymentMethodDisplay(txn.payment_method, false)}
												</div>
											</Td>
											<Td
												align="right"
												className="font-medium text-slate-800"
											>
												{formatPrice(txn.amount)}
												{txn.status === "refunded" && (
													<span className="ml-1 text-xs font-normal text-rose-600">
														(Refund)
													</span>
												)}
											</Td>
											<Td>
												<span className={getStatusPillClasses(txn.status)}>
													{getStatusIcon(txn.status)}
													{txn.status?.replace("_", " ").toUpperCase()}
												</span>
											</Td>
											{canRefundAny && (
												<Td
													align="right"
													className="whitespace-nowrap"
												>
													{isAdmin && txn.status === "completed" && (
														<button
															onClick={() => openRefundModal(txn)}
															disabled={isProcessingRefund}
															className="flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
														>
															<ArrowUturnLeftIcon className="h-3.5 w-3.5" />
															Refund
														</button>
													)}
												</Td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>

			{/* Modals restored */}
			{isRefundModalOpen && transactionToRefund && (
				<RefundConfirmation
					isOpen={isRefundModalOpen}
					onClose={() => {
						setIsRefundModalOpen(false);
						setTransactionToRefund(null);
					}}
					onConfirm={handleConfirmRefund}
					transaction={transactionToRefund}
					isProcessing={isProcessingRefund}
					// paymentId={payment.id} // Not explicitly needed by RefundConfirmation based on its props
				/>
			)}
			{refundSuccessData && (
				<RefundSuccessModal
					isOpen={!!refundSuccessData}
					onClose={() => setRefundSuccessData(null)}
					refundDetails={refundSuccessData} // Pass the whole response object
					// originalPaymentId={payment.id} // Not explicitly needed by RefundSuccessModal based on its props
				/>
			)}
		</MainLayout>
	);
}
