// src/api/services/productService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const productService = {
	/**
	 * Get a list of all products.
	 * @returns {Promise<Array>} A promise that resolves to an array of products.
	 */
	getProductsList: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.PRODUCTS.LIST);
			return response.data;
		} catch (error) {
			console.error("Error fetching product list:", error);
			throw error;
		}
	},

	/**
	 * Get a list of all product categories.
	 * @returns {Promise<Array>} A promise that resolves to an array of categories.
	 */
	getProductCategories: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.PRODUCTS.CATEGORIES);
			return response.data;
		} catch (error) {
			console.error("Error fetching product categories:", error);
			throw error;
		}
	},

	/**
	 * Get details for a specific product by its name.
	 * @param {string} name - The name of the product.
	 * @returns {Promise<Object>} A promise that resolves to the product object.
	 */
	getProductByName: async (name) => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.PRODUCTS.DETAIL(name));
			return response.data;
		} catch (error) {
			console.error(`Error fetching product by name ${name}:`, error);
			throw error;
		}
	},

	/**
	 * Add a new product.
	 * @param {Object} productData - The data for the new product.
	 * @returns {Promise<Object>} A promise that resolves to the created product object.
	 */
	addProduct: async (productData) => {
		try {
			const response = await axiosInstance.post(
				ENDPOINTS.PRODUCTS.ADD,
				productData
			);
			return response.data;
		} catch (error) {
			console.error("Error adding product:", error);
			throw error;
		}
	},

	/**
	 * Edit an existing product by its name.
	 * @param {string} name - The name of the product to edit.
	 * @param {Object} productData - The updated data for the product.
	 * @returns {Promise<Object>} A promise that resolves to the updated product object.
	 */
	editProduct: async (name, productData) => {
		try {
			const response = await axiosInstance.put(
				ENDPOINTS.PRODUCTS.EDIT(name),
				productData
			);
			return response.data;
		} catch (error) {
			console.error(`Error editing product ${name}:`, error);
			throw error;
		}
	},

	/**
	 * Delete a product by its name.
	 * @param {string} name - The name of the product to delete.
	 * @returns {Promise<void>} A promise that resolves when the product is deleted.
	 */
	deleteProduct: async (name) => {
		try {
			const response = await axiosInstance.delete(
				ENDPOINTS.PRODUCTS.DELETE(name)
			);
			return response.data; // Or handle 204 No Content appropriately
		} catch (error) {
			console.error(`Error deleting product ${name}:`, error);
			throw error;
		}
	},

	/**
	 * Get a product by its barcode.
	 * @param {string} barcode - The barcode of the product.
	 * @returns {Promise<Object>} A promise that resolves to the product object.
	 */
	getProductByBarcode: async (barcode) => {
		try {
			const response = await axiosInstance.get(
				`${ENDPOINTS.PRODUCTS.BY_BARCODE}?barcode=${barcode}`
			);
			return response.data;
		} catch (error) {
			console.error(`Error fetching product by barcode ${barcode}:`, error);
			throw error;
		}
	},

	/**
	 * Bulk restock grocery items.
	 * @param {Array<Object>} restockItems - Array of objects, e.g., [{ product_id: 1, restock_quantity: 10 }, ...]
	 * @returns {Promise<Object>} A promise that resolves to the backend response.
	 */
	restockProducts: async (restockItems) => {
		// <-- Add this function
		try {
			const response = await axiosInstance.post(
				`${ENDPOINTS.PRODUCTS.RESTOCK}`,
				restockItems
			);
			return response.data;
		} catch (error) {
			console.error("Error bulk restocking products:", error);
			if (error.response && error.response.data) {
				throw error.response.data; // Propagate backend validation errors
			}
			throw error; // Propagate other errors
		}
	},

	/**
	 * Export all products to a CSV file.
	 * @returns {Promise<void>} A promise that resolves when the download is initiated.
	 */
	exportProductsCSV: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.PRODUCTS.EXPORT_CSV, {
				responseType: "blob", // Important for file downloads
			});
			// Create a URL for the blob
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement("a");
			link.href = url;
			let filename = "products_export.csv";
			// Try to get filename from content-disposition header
			const contentDisposition = response.headers["content-disposition"];
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
				if (filenameMatch && filenameMatch.length > 1) {
					filename = filenameMatch[1];
				}
			}
			link.setAttribute("download", filename);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url); // Clean up the object URL
		} catch (error) {
			console.error("Error exporting products to CSV:", error);
			// You might want to show a user-friendly error message here
			if (error.response && error.response.data) {
				// If the blob data can be converted to text, it might contain an error message
				try {
					const errorText = await error.response.data.text();
					const errorJson = JSON.parse(errorText); // If backend sends JSON error for blob request
					console.error("Backend error details:", errorJson);
					alert(
						`Failed to export products: ${errorJson.detail || "Unknown error"}`
					);
					//eslint-disable-next-line
				} catch (e) {
					alert("Failed to export products. Check console for details.");
				}
			} else {
				alert("Failed to export products. Check console for details.");
			}
			throw error;
		}
	},
};
