// src/components/checkout/components/payment/CardDetails.jsx
import React from "react";
import { CardElement } from "@stripe/react-stripe-js";

const CARD_ELEMENT_OPTIONS = {
	style: {
		base: {
			color: "#32325d",
			fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
			fontSmoothing: "antialiased",
			fontSize: "16px",
			"::placeholder": {
				color: "#aab7c4",
			},
		},
		invalid: {
			color: "#fa755a",
			iconColor: "#fa755a",
		},
	},
	hidePostalCode: false,
};

const CardDetails = ({ onChange }) => {
	return (
		<div className="mb-4">
			<label className="block text-gray-700 text-sm font-medium mb-2">
				Card Details
			</label>
			<div className="p-3 border border-gray-300 rounded-md">
				<CardElement
					options={CARD_ELEMENT_OPTIONS}
					onChange={onChange}
				/>
			</div>
			<p className="mt-1 text-xs text-gray-500">
				Test card: 4242 4242 4242 4242 (any future date, any CVC)
			</p>
		</div>
	);
};

export default CardDetails;
