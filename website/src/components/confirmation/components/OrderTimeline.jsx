import React from "react";
import { FaReceipt, FaCog, FaCheck } from "react-icons/fa";

const OrderTimeline = ({ status }) => {
	// Define our 3 steps
	const steps = [
		{ id: "received", label: "Order Received", icon: <FaReceipt size={18} /> },
		{
			id: "processing",
			label: "Processing",
			icon: (
				<FaCog
					size={18}
					className="animate-spin-slow"
				/>
			),
		},
		{ id: "ready", label: "Ready for Pickup", icon: <FaCheck size={18} /> },
	];

	// Map status to step index
	const getStepIndex = () => {
		switch (status) {
			case "pending":
				return 0;
			case "preparing":
				return 1;
			case "ready":
			case "completed":
				return 2;
			case "cancelled":
				return -1; // Special case
			default:
				return 0;
		}
	};

	const currentStepIndex = getStepIndex();
	const isCancelled = status === "cancelled";

	return (
		<div className="w-full max-w-3xl mx-auto py-4">
			<div className="px-4">
				<div className="relative pb-10">
					{/* Background track */}
					<div className="absolute top-6 left-0 right-0 h-1 bg-gray-200"></div>

					{/* Progress track with animation */}
					<div
						className="absolute top-6 h-1 bg-green-500 transition-all duration-1000 ease-out"
						style={{
							left: "6px", // Half of the icon's width (12px÷2)
							width: isCancelled
								? "0%"
								: currentStepIndex === 0
								? "0%"
								: currentStepIndex === 1
								? "50%"
								: "calc(100% - 12px)", // Full width minus half icon width
						}}
					></div>

					{/* Steps container */}
					<div className="flex relative">
						{/* Step 1 - Left aligned */}
						<div
							className="flex flex-col items-center w-1/3"
							style={{ alignItems: "flex-start" }}
						>
							<div
								className={`w-12 h-12 rounded-full flex items-center justify-center ${
									currentStepIndex >= 0 && !isCancelled
										? "bg-green-500 text-white"
										: "bg-gray-200 text-gray-500"
								} ${
									currentStepIndex === 0 && !isCancelled
										? "ring-4 ring-green-100"
										: ""
								}`}
							>
								<FaReceipt size={18} />
								{currentStepIndex === 0 && !isCancelled && (
									<span className="absolute w-12 h-12 rounded-full bg-green-400 opacity-30 animate-ping"></span>
								)}
							</div>
							<span
								className={`mt-2 text-xs ${
									currentStepIndex >= 0 && !isCancelled
										? "text-gray-800 font-medium"
										: "text-gray-500"
								}`}
							>
								Order Received
							</span>
						</div>

						{/* Step 2 - Center aligned */}
						<div className="flex flex-col items-center w-1/3">
							<div
								className={`w-12 h-12 rounded-full flex items-center justify-center ${
									currentStepIndex >= 1 && !isCancelled
										? "bg-green-500 text-white"
										: "bg-gray-200 text-gray-500"
								} ${
									currentStepIndex === 1 && !isCancelled
										? "ring-4 ring-green-100"
										: ""
								}`}
							>
								<FaCog
									size={18}
									className={
										currentStepIndex === 1 && !isCancelled
											? "animate-spin-slow"
											: ""
									}
								/>
								{currentStepIndex === 1 && !isCancelled && (
									<span className="absolute w-12 h-12 rounded-full bg-green-400 opacity-30 animate-ping"></span>
								)}
							</div>
							<span
								className={`mt-2 text-xs ${
									currentStepIndex >= 1 && !isCancelled
										? "text-gray-800 font-medium"
										: "text-gray-500"
								}`}
							>
								Processing
							</span>
						</div>

						{/* Step 3 - Right aligned */}
						<div
							className="flex flex-col items-center w-1/3"
							style={{ alignItems: "flex-end" }}
						>
							<div
								className={`w-12 h-12 rounded-full flex items-center justify-center ${
									currentStepIndex >= 2 && !isCancelled
										? "bg-green-500 text-white"
										: "bg-gray-200 text-gray-500"
								} ${
									currentStepIndex === 2 && !isCancelled
										? "ring-4 ring-green-100"
										: ""
								}`}
							>
								<FaCheck size={18} />
								{currentStepIndex === 2 && !isCancelled && (
									<span className="absolute w-12 h-12 rounded-full bg-green-400 opacity-30 animate-ping"></span>
								)}
							</div>
							<div
								className={`mt-2 text-xs text-right ${
									currentStepIndex >= 2 && !isCancelled
										? "text-gray-800 font-medium"
										: "text-gray-500"
								}`}
								style={{ maxWidth: "90px" }}
							>
								Ready for Pickup
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Cancelled message */}
			{isCancelled && (
				<div className="mt-4 text-center">
					<span className="inline-block px-4 py-2 bg-red-100 text-red-800 rounded-full text-xs font-medium">
						Order Cancelled
					</span>
				</div>
			)}
		</div>
	);
};

export default OrderTimeline;
