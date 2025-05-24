// combined-project/frontend-pos/pages/payments/RefundSuccessModal.jsx

import { Fragment } from "react"; // Import React
import PropTypes from "prop-types";
import { Dialog, Transition } from "@headlessui/react";
import {
	CheckCircleIcon,
	BanknotesIcon,
	CreditCardIcon,
	TicketIcon,
	InformationCircleIcon,
} from "@heroicons/react/24/solid";

// Fallback formatCurrency (import from utils if available)
const formatCurrency = (amount, defaultValue = "$?.??") => {
	try {
		const numAmount = Number(amount);
		if (isNaN(numAmount)) return defaultValue;
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(numAmount);
	} catch {
		return defaultValue;
	}
};

// Helper to get Original Transaction ID from message (if needed as fallback)
const extractTxnIdFromMessage = (message) => {
	const match = message?.match(/transaction (\d+)/);
	return match ? match[1] : null;
};

export default function RefundSuccessModal({ isOpen, onClose, refundDetails }) {
	if (!isOpen || !refundDetails) return null;

	const details = refundDetails.refund_details || {};

	// FIX 1: Use 'processed_amount' for the displayed refunded amount
	const refundedAmount = details.processed_amount || 0;

	// FIX 2: Use 'refund_id_stripe' to get the Stripe refund ID
	const stripeRefundId = details.refund_id_stripe;

	const originalTxnPk = details.original_transaction_pk;
	const originalStripeId = details.original_stripe_id;
	const paymentMethod = details.method;
	const refundStatus = details.status || "succeeded";

	const overallMessage =
		refundDetails.message || "Refund processed successfully.";
	const finalTransactionStatus = refundDetails.transaction_status;
	const finalPaymentStatus = refundDetails.payment_status;
	const displayTxnId =
		originalTxnPk || extractTxnIdFromMessage(refundDetails.message);

	const displayMethod =
		paymentMethod?.replace("_", " ").toUpperCase() || "UNKNOWN";
	const getPaymentMethodIcon = (method, sizeClass = "h-4 w-4") => {
		switch (method?.toLowerCase()) {
			case "cash":
				return <BanknotesIcon className={`${sizeClass} text-green-600`} />;
			case "credit":
				return <CreditCardIcon className={`${sizeClass} text-blue-600`} />;
			default:
				return <TicketIcon className={`${sizeClass} text-gray-500`} />;
		}
	};

	const baseButtonClass =
		"inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-150";
	const primaryButtonClass = `${baseButtonClass} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`;

	return (
		<Transition
			appear
			show={isOpen}
			as={Fragment}
		>
			<Dialog
				as="div"
				className="relative z-[70]"
				onClose={onClose}
			>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-200"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
				</Transition.Child>
				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-200"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-150"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all border border-slate-200">
								<div className="text-center">
									<CheckCircleIcon className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
									<Dialog.Title
										as="h3"
										className="text-lg font-semibold leading-6 text-slate-800"
									>
										Refund Processed
									</Dialog.Title>
									<p className="text-sm text-slate-500 mt-1">
										{overallMessage}
									</p>
								</div>

								<div className="mt-4 bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
									<div className="flex justify-between text-sm">
										<span className="font-medium text-slate-600">
											Amount Refunded:
										</span>
										<span className="text-lg font-bold text-slate-900">
											{formatCurrency(refundedAmount)}{" "}
											{/* This will now use the corrected value */}
										</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Refund Status:
										</span>
										<span
											className={`px-1.5 py-0.5 rounded text-xs font-medium ${
												refundStatus === "succeeded" ||
												refundStatus === "completed"
													? "bg-emerald-100 text-emerald-700"
													: refundStatus === "pending"
													? "bg-yellow-100 text-yellow-800"
													: "bg-slate-100 text-slate-700"
											}`}
										>
											{refundStatus?.toUpperCase() || "N/A"}
										</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Original Method:
										</span>
										{paymentMethod ? (
											<span className="font-medium text-slate-700 inline-flex items-center gap-1">
												{getPaymentMethodIcon(paymentMethod, "h-3.5 w-3.5")}
												{displayMethod}
											</span>
										) : (
											<span className="italic text-slate-400">N/A</span>
										)}
									</div>
									{displayTxnId && (
										<div className="flex justify-between text-xs">
											<span className="font-medium text-slate-500">
												Original Txn #:
											</span>
											<span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">
												{displayTxnId}
											</span>
										</div>
									)}
									{originalStripeId && paymentMethod === "credit" && (
										<div className="flex justify-between text-xs">
											<span className="font-medium text-slate-500">
												Original Ref ID:
											</span>
											<span className="font-mono text-xs text-slate-600 bg-slate-100 px-1 rounded break-all">
												{originalStripeId}
											</span>
										</div>
									)}
									{stripeRefundId && paymentMethod === "credit" && (
										<div className="flex justify-between text-xs">
											<span className="font-medium text-slate-500">
												Refund Ref ID:
											</span>
											<span className="font-mono text-xs text-slate-600 bg-slate-100 px-1 rounded break-all">
												{stripeRefundId}{" "}
												{/* This will now use the corrected value */}
											</span>
										</div>
									)}
									<div className="flex justify-between text-xs pt-1 mt-1 border-t border-slate-200">
										<span className="font-medium text-slate-500">
											Updated Txn Status:
										</span>
										<span className="font-medium text-slate-700">
											{finalTransactionStatus?.toUpperCase() || "N/A"}
										</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="font-medium text-slate-500">
											Updated Payment Status:
										</span>
										<span className="font-medium text-slate-700">
											{finalPaymentStatus?.replace("_", " ").toUpperCase() ||
												"N/A"}
										</span>
									</div>
								</div>

								<div className="bg-blue-50 border border-blue-100 p-3 mt-4 rounded-md flex items-start gap-2">
									<InformationCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
									<p className="text-xs text-blue-700">
										{paymentMethod === "cash"
											? "Remember to provide the cash back to the customer."
											: "Refund issued via payment processor. It may take 5-10 business days to appear on statement."}
									</p>
								</div>

								<div className="mt-5 sm:mt-6">
									<button
										type="button"
										onClick={onClose}
										className={`w-full ${primaryButtonClass}`}
									>
										Close
									</button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}

// --- PropType Definitions ---
RefundSuccessModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	refundDetails: PropTypes.shape({
		success: PropTypes.bool,
		message: PropTypes.string,
		refund_details: PropTypes.shape({
			original_transaction_pk: PropTypes.oneOfType([
				PropTypes.string,
				PropTypes.number,
			]),
			original_stripe_id: PropTypes.string,
			method: PropTypes.string,
			// FIX 3: Update PropTypes to reflect the actual data keys used
			requested_amount: PropTypes.oneOfType([
				PropTypes.string,
				PropTypes.number,
			]), // Amount requested by user
			processed_amount: PropTypes.oneOfType([
				PropTypes.string,
				PropTypes.number,
			]), // Amount actually processed
			status: PropTypes.string,
			success: PropTypes.bool,
			refund_id_stripe: PropTypes.string, // Key for Stripe's refund ID
		}),
		payment_status: PropTypes.string,
		transaction_status: PropTypes.string,
	}).isRequired,
};
