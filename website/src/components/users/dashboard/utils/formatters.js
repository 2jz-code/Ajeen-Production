// src/components/dashboard/utils/formatters.js

// Format price for display
export const formatPrice = (price) => {
	if (price === null || price === undefined) {
		return "0.00";
	}

	const numericPrice = typeof price === "string" ? parseFloat(price) : price;

	if (isNaN(numericPrice)) {
		return "0.00";
	}

	return numericPrice.toFixed(2);
};

// Format date for display
export const formatDate = (dateString) => {
	if (!dateString) return "";

	const options = {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	};

	return new Date(dateString).toLocaleDateString(undefined, options);
};

// Get order status badge color
export const getStatusColor = (status) => {
	switch (status?.toLowerCase()) {
		case "completed":
			return "bg-green-100 text-green-800";
		case "preparing":
			return "bg-blue-100 text-blue-800";
		case "ready":
			return "bg-green-100 text-green-800";
		case "cancelled":
			return "bg-red-100 text-red-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
};
