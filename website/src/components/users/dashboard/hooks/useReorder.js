// src/hooks/useReorder.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../../api/api";

export const useReorder = () => {
	const [isReordering, setIsReordering] = useState(false);
	const [reorderError, setReorderError] = useState(null);
	const navigate = useNavigate();

	const reorderFromPastOrder = async (orderId) => {
		setIsReordering(true);
		setReorderError(null);

		try {
			// Call the reorder API endpoint
			await axiosInstance.post("website/reorder/", { order_id: orderId });

			// Redirect to checkout
			navigate("/checkout");
			return true;
		} catch (error) {
			console.error("Reordering failed:", error);
			setReorderError(
				error.response?.data?.error || "Failed to reorder. Please try again."
			);
			return false;
		} finally {
			setIsReordering(false);
		}
	};

	return {
		reorderFromPastOrder,
		isReordering,
		reorderError,
	};
};
