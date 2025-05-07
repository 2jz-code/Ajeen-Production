import React, { createContext, useContext, useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

// Create context
const StripeContext = createContext(null);

// Custom hook to use the Stripe context
export const useStripe = () => useContext(StripeContext);

// Stripe provider component
export const StripeProvider = ({ children }) => {
	const [stripePromise, setStripePromise] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const loadStripeInstance = async () => {
			try {
				setLoading(true);

				// Get the publishable key
				const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

				if (!publishableKey) {
					throw new Error("Stripe publishable key is missing");
				}

				const stripe = await loadStripe(publishableKey);

				if (!stripe) {
					throw new Error("Failed to initialize Stripe");
				}

				console.log("Stripe loaded successfully");
				setStripePromise(stripe);
			} catch (err) {
				console.error("Stripe initialization error:", err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		loadStripeInstance();
	}, []);

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
				<p>Payment system error: {error}</p>
				<p className="text-sm">Please try again later or contact support.</p>
			</div>
		);
	}

	return (
		<StripeContext.Provider value={{ stripePromise }}>
			{loading ? (
				<div className="flex flex-col items-center justify-center p-4">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mb-2"></div>
					<p className="text-gray-600 text-sm">Loading payment system...</p>
				</div>
			) : (
				<Elements stripe={stripePromise}>{children}</Elements>
			)}
		</StripeContext.Provider>
	);
};
