// src/utils/numberUtils.js
export const ensureNumber = (value, fallback = 0) => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}
	return fallback;
};

export const formatPrice = (value, decimals = 2) => {
	const number = ensureNumber(value);
	return number.toFixed(decimals);
};
