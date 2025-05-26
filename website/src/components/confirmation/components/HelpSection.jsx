// src/components/confirmation/components/HelpSection.jsx
import React from "react";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa"; // Using more specific icons

const HelpSection = () => {
	return (
		// Main container: Primary Beige background, subtle border and shadow
		<div className="mt-10 bg-primary-beige rounded-xl shadow-lg p-6 sm:p-8 border border-accent-subtle-gray/30">
			{/* Heading: Dark Green */}
			<h3 className="font-semibold text-accent-dark-green text-xl mb-4">
				Need Help?
			</h3>
			{/* Paragraph text: Dark Brown */}
			<p className="text-accent-dark-brown mb-5 text-sm leading-relaxed">
				If you have any questions or concerns about your order, please don't
				hesitate to contact us. We're here to assist you!
			</p>
			<div className="space-y-3">
				{/* Phone Link: Primary Green text & icon, hover Dark Green */}
				<a
					href="tel:+16514125336" // Corrected your example number
					className="flex items-center text-primary-green hover:text-accent-dark-green transition-colors group text-sm font-medium"
				>
					<FaPhoneAlt className="mr-2.5 h-4 w-4 text-primary-green group-hover:text-accent-dark-green transition-colors" />
					(651) 412-5336
				</a>
				{/* Email Link: Primary Green text & icon, hover Dark Green */}
				<a
					href="mailto:contact@bakeajeen.com" // Corrected your example email
					className="flex items-center text-primary-green hover:text-accent-dark-green transition-colors group text-sm font-medium"
				>
					<FaEnvelope className="mr-2.5 h-4 w-4 text-primary-green group-hover:text-accent-dark-green transition-colors" />
					contact@bakeajeen.com
				</a>
			</div>
		</div>
	);
};

export default HelpSection;
