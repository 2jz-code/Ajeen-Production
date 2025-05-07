// src/components/checkout/components/ProgressIndicator.jsx
import React from "react";
import { FaShoppingCart } from "react-icons/fa";

const ProgressIndicator = ({ step }) => {
	const steps = [
		{ number: 1, name: "Review Cart" },
		{ number: 2, name: "Payment & Pickup" }, // Renamed to reflect consolidated step
	];

	return (
		<div className="mb-8">
			<div className="flex justify-between items-center relative">
				{steps.map((s, i) => (
					<React.Fragment key={s.number}>
						<div className="flex flex-col items-center relative z-10">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center ${
									step >= s.number
										? "bg-green-500 text-white"
										: "bg-gray-200 text-gray-500"
								} transition-colors duration-300`}
							>
								{step > s.number ? (
									<svg
										className="w-6 h-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								) : (
									s.number
								)}
							</div>
							<span
								className={`mt-2 text-sm ${
									step >= s.number
										? "text-gray-800 font-medium"
										: "text-gray-500"
								}`}
							>
								{s.name}
							</span>
						</div>

						{i < steps.length - 1 && (
							<div className="flex-1 h-1 mx-2 relative z-0">
								<div className="absolute inset-0 bg-gray-200"></div>
								<div
									className="absolute inset-0 bg-green-500 transition-all duration-300"
									style={{
										width:
											step > s.number
												? "100%"
												: step === s.number
												? "50%"
												: "0%",
									}}
								></div>
							</div>
						)}
					</React.Fragment>
				))}
			</div>
		</div>
	);
};

export default ProgressIndicator;
