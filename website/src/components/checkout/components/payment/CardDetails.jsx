// src/components/checkout/components/payment/CardDetails.jsx
import React from "react";
import { CardElement } from "@stripe/react-stripe-js";

// Define color variables from your theme to be used in CARD_ELEMENT_OPTIONS
// These should match the hex codes from your globals.css
const colorAccentDarkBrown = "#654321"; // --color-accent-dark-brown
const colorAccentSubtleGray = "#D1C7BC"; // --color-accent-subtle-gray (for placeholder)
const colorDestructive = "#D9534F"; // Example for destructive, or use your theme's destructive HSL value converted to hex

const CARD_ELEMENT_OPTIONS = {
	style: {
		base: {
			color: colorAccentDarkBrown, // Text color inside Stripe element
			fontFamily:
				'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', // Match your site's font
			fontSmoothing: "antialiased",
			fontSize: "16px", // Standard Stripe element font size
			"::placeholder": {
				color: colorAccentSubtleGray, // Placeholder text color
			},
			// Add padding within the Stripe element itself if needed
			// padding: "10px 12px"
		},
		invalid: {
			color: colorDestructive, // Text color for invalid input
			iconColor: colorDestructive, // Icon color for invalid input
		},
	},
	hidePostalCode: false, // Keep postal code visible as it's often required
};

const CardDetails = ({ onChange }) => {
	return (
		<div className="mb-4">
			{" "}
			{/* Keep existing margin */}
			{/* Label: Dark Green */}
			<label className="block text-accent-dark-green text-sm font-semibold mb-2">
				Card Details
			</label>
			{/* Stripe Element Container: White background, Subtle Gray border, Primary Green focus ring (applied via parent PaymentForm focus on Stripe element) */}
			<div className="p-3.5 border border-accent-subtle-gray rounded-md bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary-green focus-within:border-primary-green">
				<CardElement
					options={CARD_ELEMENT_OPTIONS}
					onChange={onChange}
					className="w-full" // Ensure CardElement takes full width of its container
				/>
			</div>
			{/* Helper text: Dark Brown, slightly transparent */}
			<p className="mt-2 text-xs text-accent-dark-brown/80">
				Test card: 4242 4242 4242 4242 (any future date, any CVC)
			</p>
		</div>
	);
};

export default CardDetails;
