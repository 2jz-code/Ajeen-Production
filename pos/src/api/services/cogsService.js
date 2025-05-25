// pos_and_backend/pos/api/services/cogsService.js
import api from "../api";
import { COGS_API_ENDPOINTS } from "../config/apiEndpoints";

// Units of Measure
export const getUnitsOfMeasure = () =>
	api.get(COGS_API_ENDPOINTS.UNITS_OF_MEASURE);
export const getUnitOfMeasureById = (id) =>
	api.get(`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${id}/`);
export const createUnitOfMeasure = (data) =>
	api.post(COGS_API_ENDPOINTS.UNITS_OF_MEASURE, data);
export const updateUnitOfMeasure = (id, data) =>
	api.put(`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${id}/`, data);
export const deleteUnitOfMeasure = (id) =>
	api.delete(`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${id}/`);

// Inventory Items
export const getInventoryItems = (params) =>
	api.get(COGS_API_ENDPOINTS.INVENTORY_ITEMS, { params });
export const getInventoryItemById = (id) =>
	api.get(`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/`);
export const createInventoryItem = (data) =>
	api.post(COGS_API_ENDPOINTS.INVENTORY_ITEMS, data);
export const updateInventoryItem = (id, data) =>
	api.put(`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/`, data);
export const deleteInventoryItem = (id) =>
	api.delete(`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/`);
export const recalculateInventoryItemPurchaseCost = (id) =>
	api.post(
		`${COGS_API_ENDPOINTS.INVENTORY_ITEMS}${id}/recalculate-purchase-cost/`
	);

// Recipes
export const getRecipes = (params) =>
	api.get(COGS_API_ENDPOINTS.RECIPES, { params });
export const getRecipeById = (id) =>
	api.get(`${COGS_API_ENDPOINTS.RECIPES}${id}/`);
export const createRecipe = (data) =>
	api.post(COGS_API_ENDPOINTS.RECIPES, data);
export const updateRecipe = (id, data) =>
	api.put(`${COGS_API_ENDPOINTS.RECIPES}${id}/`, data);
export const deleteRecipe = (id) =>
	api.delete(`${COGS_API_ENDPOINTS.RECIPES}${id}/`);
export const recalculateRecipeCost = (id) =>
	api.post(`${COGS_API_ENDPOINTS.RECIPES}${id}/recalculate-recipe-cost/`);

// Product COGS Definitions
export const getProductCogsDefinitions = (params) =>
	api.get(COGS_API_ENDPOINTS.PRODUCT_COGS, { params });
export const getProductCogsDefinitionById = (id) =>
	api.get(`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/`);
export const getProductCogsDefinitionByProductId = (productId) =>
	api.get(`${COGS_API_ENDPOINTS.PRODUCT_COGS}by-product/${productId}/`);
export const createProductCogsDefinition = (data) =>
	api.post(COGS_API_ENDPOINTS.PRODUCT_COGS, data);
export const updateProductCogsDefinition = (id, data) =>
	api.put(`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/`, data);
export const deleteProductCogsDefinition = (id) =>
	api.delete(`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/`);
export const recalculateProductCogs = (id) =>
	api.post(`${COGS_API_ENDPOINTS.PRODUCT_COGS}${id}/recalculate-total-cogs/`);
