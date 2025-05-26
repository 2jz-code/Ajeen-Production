// src/components/checkout/components/ProgressIndicator.jsx
import React from "react";
// FaShoppingCart is not used, can be removed if not planned for future
// import { FaShoppingCart } from "react-icons/fa";

const ProgressIndicator = ({ step }) => {
	const steps = [
		{ number: 1, name: "Review Cart" },
		{ number: 2, name: "Payment & Pickup" },
	];

	return (
		<div className="mb-8 px-2 sm:px-0">
			{" "}
			{/* Added some horizontal padding for smaller screens */}
			<div className="flex justify-between items-center relative">
				{steps.map((s, i) => (
					<React.Fragment key={s.number}>
						<div className="flex flex-col items-center relative z-10">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ease-in-out transform group-hover:scale-110
									${
										step >= s.number
											? "bg-primary-green text-accent-light-beige shadow-md ring-2 ring-primary-green/30" // Active/Completed: Primary green bg, light beige text
											: "bg-accent-subtle-gray text-accent-dark-brown" // Inactive: Subtle gray bg, dark brown text
									}`}
							>
								{step > s.number ? (
									<svg
										className="w-5 h-5" // Adjusted size
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={3} // Bolder checkmark
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								) : (
									s.number
								)}
							</div>
							{/* Step name text: Dark green for active/completed, dark brown for inactive */}
							<span
								className={`mt-2 text-xs sm:text-sm text-center w-20 sm:w-auto ${
									// Added text-center and width for small screens
									step >= s.number
										? "text-accent-dark-green font-semibold"
										: "text-accent-dark-brown"
								}`}
							>
								{s.name}
							</span>
						</div>

						{i < steps.length - 1 && (
							// Connecting line: Subtle gray track, primary green progress
							<div className="flex-1 h-1 mx-1 sm:mx-2 relative z-0 bg-accent-subtle-gray/70 rounded-full overflow-hidden">
								{" "}
								{/* Base track color */}
								<div
									className="absolute top-0 left-0 h-full bg-primary-green transition-all duration-500 ease-in-out rounded-full" // Progress fill
									style={{
										width:
											step > s.number
												? "100%"
												: step === s.number // Current step, half filled
												? "50%"
												: "0%", // Not yet reached
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
