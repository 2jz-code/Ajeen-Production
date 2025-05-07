// src/components/confirmation/components/HelpSection.jsx
import React from "react";

const HelpSection = () => {
	return (
		<div className="mt-8 bg-white rounded-lg shadow-md p-6">
			<h3 className="font-semibold text-gray-800 mb-4">Need Help?</h3>
			<p className="text-gray-600 mb-4">
				If you have any questions or concerns about your order, please contact
				us at:
			</p>
			<div className="flex flex-col space-y-2 text-sm">
				<a
					href="tel:+11234567890"
					className="text-green-600 hover:text-green-700"
				>
					(123) 456-7890
				</a>
				<a
					href="mailto:support@bakeajeen.com"
					className="text-green-600 hover:text-green-700"
				>
					support@bakeajeen.com
				</a>
			</div>
		</div>
	);
};

export default HelpSection;
