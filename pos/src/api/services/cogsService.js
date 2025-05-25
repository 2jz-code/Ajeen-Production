// src/api/services/cogsService.js
import axiosInstance from "../config/axiosConfig"; //
import { COGS_API_ENDPOINTS } from "../config/apiEndpoints"; //

// Units of Measure
export const getUnitsOfMeasure = async () => {
	const response = await axiosInstance.get(COGS_API_ENDPOINTS.UNITS_OF_MEASURE); //
	return response.data;
};
export const getUnitOfMeasureById = async (id) => {
	const response = await axiosInstance.get(
		`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${id}/`
	); //
	return response.data;
};
export const createUnitOfMeasure = async (data) => {
	const response = await axiosInstance.post(
		COGS_API_ENDPOINTS.UNITS_OF_MEASURE,
		data
	); //
	return response.data;
};
export const updateUnitOfMeasure = async (id, data) => {
	const response = await axiosInstance.put(
		`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${id}/`,
		data
	); //
	return response.data;
};
export const deleteUnitOfMeasure = async (id) => {
	const response = await axiosInstance.delete(
		`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${id}/`
	); //
	return response.data;
};

// Inventory Items
export const getInventoryItems = async (params) => {
	const response = await axiosInstance.get(COGS_API_ENDPOINTS.INVENTORY_ITEMS, {
		params,
	}); //
	return response.data;
};
export const getInventoryItemById = async (id) => {
	const response = await axiosInstance.get(
		`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/`
	); //
	return response.data;
};
export const createInventoryItem = async (data) => {
	const response = await axiosInstance.post(
		COGS_API_ENDPOINTS.INVENTORY_ITEMS,
		data
	); //
	return response.data;
};
export const updateInventoryItem = async (id, data) => {
	const response = await axiosInstance.put(
		`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/`,
		data
	); //
	return response.data;
};
export const deleteInventoryItem = async (id) => {
	const response = await axiosInstance.delete(
		`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/`
	); //
	return response.data;
};
export const recalculateInventoryItemPurchaseCost = async (id) => {
	const response = await axiosInstance.post(
		`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/recalculate-purchase-cost/` //
	);
	return response.data;
};

// Recipes
export const getRecipes = async (params) => {
	const response = await axiosInstance.get(COGS_API_ENDPOINTS.RECIPES, {
		params,
	}); //
	return response.data;
};
export const getRecipeById = async (id) => {
	const response = await axiosInstance.get(
		`${COGS_API_ENDPOINTS.RECIPES}${id}/`
	); //
	return response.data;
};
export const createRecipe = async (data) => {
	const response = await axiosInstance.post(COGS_API_ENDPOINTS.RECIPES, data); //
	return response.data;
};
export const updateRecipe = async (id, data) => {
	const response = await axiosInstance.put(
		`${COGS_API_ENDPOINTS.RECIPES}${id}/`,
		data
	); //
	return response.data;
};
export const deleteRecipe = async (id) => {
	const response = await axiosInstance.delete(
		`${COGS_API_ENDPOINTS.RECIPES}${id}/`
	); //
	return response.data;
};
export const recalculateRecipeCost = async (id) => {
	const response = await axiosInstance.post(
		`${COGS_API_ENDPOINTS.RECIPES}${id}/recalculate-recipe-cost/`
	); //
	return response.data;
};

// Product COGS Definitions
export const getProductCogsDefinitions = async (params) => {
	const response = await axiosInstance.get(COGS_API_ENDPOINTS.PRODUCT_COGS, {
		params,
	}); //
	return response.data;
};
export const getProductCogsDefinitionById = async (id) => {
	const response = await axiosInstance.get(
		`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/`
	); //
	return response.data;
};
export const getProductCogsDefinitionByProductId = async (productId) => {
	const response = await axiosInstance.get(
		`${COGS_API_ENDPOINTS.PRODUCT_COGS}by-product/${productId}/`
	); //
	return response.data;
};
export const createProductCogsDefinition = async (data) => {
	const response = await axiosInstance.post(
		COGS_API_ENDPOINTS.PRODUCT_COGS,
		data
	); //
	return response.data;
};
export const updateProductCogsDefinition = async (id, data) => {
	const response = await axiosInstance.put(
		`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/`,
		data
	); //
	return response.data;
};
export const deleteProductCogsDefinition = async (id) => {
	const response = await axiosInstance.delete(
		`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/`
	); //
	return response.data;
};
export const recalculateProductCogs = async (id) => {
	const response = await axiosInstance.post(
		`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/recalculate-total-cogs/`
	); //
	return response.data;
};

// New Global COGS Data Management
/**
 * Fetches all COGS data as a ZIP file containing multiple CSVs.
 */
export const exportAllCogsData = async () => {
	// The backend endpoint is '/api/cogs/export-all-cogs/'
	// COGS_API_ENDPOINTS.BASE is likely '/cogs/' or 'cogs/'
	// Adjust the path construction as per your COGS_API_ENDPOINTS structure.
	// Assuming COGS_API_ENDPOINTS.BASE is '/cogs/' for this example.

	const response = await axiosInstance.get(
		`${COGS_API_ENDPOINTS.EXPORT_ALL_COGS}`,
		{
			responseType: "blob", // Crucial for file downloads
		}
	);
	return response.data; // This will be a Blob
};

/**
 * Imports all COGS data from a ZIP file containing multiple CSVs.
 * @param {File} file - The ZIP file to import.
 */
export const importAllCogsData = async (file) => {
	const formData = new FormData();
	formData.append("file", file); // 'file' should match the name expected by the backend parser

	// Adjust the path construction as per your COGS_API_ENDPOINTS structure.

	const response = await axiosInstance.post(
		`${COGS_API_ENDPOINTS.IMPORT_ALL_COGS}`,
		formData,
		{
			headers: {
				"Content-Type": "multipart/form-data",
			},
		}
	);
	return response.data; // Contains success/error messages from backend
};
