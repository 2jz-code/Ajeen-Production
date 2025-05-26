import React from "react";
import { FaReceipt, FaCog, FaCheck, FaTimes } from "react-icons/fa";

const OrderTimeline = ({ status }) => {
	const steps = [
		{ id: "received", label: "Order Received", icon: <FaReceipt size={18} /> },
		{
			id: "processing",
			label: "Processing",
			icon: <FaCog size={18} />,
		},
		{ id: "ready", label: "Ready for Pickup", icon: <FaCheck size={18} /> },
	];

	const getStepIndex = () => {
		switch (status?.toLowerCase()) {
			case "pending":
				return 0;
			case "preparing":
				return 1;
			case "ready":
			case "completed":
				return 2;
			case "cancelled":
				return -1;
			default:
				return 0;
		}
	};

	const currentStepIndex = getStepIndex();
	const isCancelled = status?.toLowerCase() === "cancelled";

	return (
		<div className="w-full max-w-3xl mx-auto py-4">
			<div className="px-4">
				<div className="relative pb-10">
					{/* Background track: Using primary-beige for a soft, visible track */}
					<div className="absolute top-6 left-0 right-0 h-1 bg-primary-beige rounded-full shadow-inner"></div>

					{/* Progress track with animation: Primary Green */}
					<div
						className="absolute top-6 h-1 bg-primary-green rounded-full transition-all duration-1000 ease-out"
						style={{
							left: "6px",
							width: isCancelled
								? "0%"
								: currentStepIndex === 0
								? "0%"
								: currentStepIndex === 1
								? "50%"
								: "calc(100% - 12px)",
						}}
					></div>

					{/* Steps container */}
					<div className="flex relative">
						{steps.map((stepItem, index) => {
							const isCompletedOrActive =
								currentStepIndex >= index && !isCancelled;
							const isCurrent = currentStepIndex === index && !isCancelled;

							// Determine icon container classes based on state
							let iconContainerClasses =
								"w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 ";
							if (isCompletedOrActive) {
								iconContainerClasses +=
									"bg-primary-green text-accent-light-beige shadow-md border-primary-green";
							} else if (isCancelled) {
								// Use page background for cancelled icons to cover the line
								iconContainerClasses +=
									"bg-background text-accent-dark-brown/60 border-accent-subtle-gray";
							} else {
								// Inactive and not cancelled
								// Use page background for inactive icons to cover the line
								iconContainerClasses +=
									"bg-background text-accent-dark-brown border-accent-subtle-gray";
							}

							if (isCurrent) {
								iconContainerClasses +=
									" ring-4 ring-primary-green/30 scale-105";
							}

							let textClasses = "mt-2 text-xs ";
							if (index === 0) textClasses += "text-left ";
							else if (index === steps.length - 1) textClasses += "text-right ";
							else textClasses += "text-center ";

							if (isCompletedOrActive) {
								textClasses += "text-accent-dark-green font-medium";
							} else if (isCancelled) {
								textClasses += "text-accent-dark-brown/70";
							} else {
								textClasses += "text-accent-dark-brown";
							}

							return (
								<div
									key={stepItem.id}
									className="flex flex-col items-center w-1/3"
									style={{
										alignItems:
											index === 0
												? "flex-start"
												: index === steps.length - 1
												? "flex-end"
												: "center",
									}}
								>
									<div className={iconContainerClasses}>
										{React.cloneElement(stepItem.icon, {
											className:
												isCurrent && stepItem.id === "processing"
													? "animate-spin-slow"
													: "",
										})}
										{isCurrent && !isCancelled && (
											<span className="absolute w-12 h-12 rounded-full bg-primary-green/40 opacity-75 animate-ping"></span>
										)}
									</div>
									<span
										className={textClasses}
										style={{ maxWidth: "90px" }}
									>
										{stepItem.label}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{isCancelled && (
				<div className="mt-4 text-center">
					<span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-full text-xs font-medium shadow-sm">
						Order Cancelled
					</span>
				</div>
			)}
		</div>
	);
};

export default OrderTimeline;
