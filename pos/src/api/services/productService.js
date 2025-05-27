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
};
