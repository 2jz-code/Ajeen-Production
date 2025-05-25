"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import {
  Plus,
  Trash2,
  InfoIcon,
  Calculator,
  PackageSearch,
  ArrowLeft,
  Save,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import * as cogsService from "../../api/services/cogsService";
import { productService } from "../../api/services/productService";
import { toast } from "react-toastify";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatPrice } from "@/utils/numberUtils";

//eslint-disable-next-line
const ProductCogsDefinitionFormPage = ({ mode = "default" }) => {
  const { definitionId, productId: productIdFromParams } = useParams();
  const navigate = useNavigate();

  const isEditMode = !!definitionId;
  const productIdForForm = mode === "product" ? productIdFromParams : null;

  const getPageActionText = () => {
    if (isEditMode) return "Edit";
    if (productIdForForm) return "Define";
    return "Add New";
  };
  useDocumentTitle(`COGS | ${getPageActionText()} Product COGS Definition`);

  const [formData, setFormData] = useState({
    product_id: productIdForForm || "", // This will hold the ID of the product
    notes: "",
    waste_factor_percentage: "5.0",
  });

  const [components, setComponents] = useState([
    { inventory_item_id: "", quantity: "1", unit_id: "" }, // unit_id will be mapped to quantity_unit_id
  ]);

  const [allProducts, setAllProducts] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const [calculatedCost, setCalculatedCost] = useState(0);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [productsData, itemsData, unitsData] = await Promise.all([
        productService.getProductsList(),
        cogsService.getInventoryItems(),
        cogsService.getUnitsOfMeasure(),
      ]);
      setAllProducts(Array.isArray(productsData) ? productsData : []);
      setAllInventoryItems(Array.isArray(itemsData) ? itemsData : []);
      setUnitsOfMeasure(Array.isArray(unitsData) ? unitsData : []);
      return {
        productsData: Array.isArray(productsData) ? productsData : [],
        itemsData: Array.isArray(itemsData) ? itemsData : [],
        unitsData: Array.isArray(unitsData) ? unitsData : [],
      };
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
      toast.error(
        "Failed to load necessary data for the form. Please try refreshing."
      );
      setPageError("Could not load initial form data."); // Set pageError to stop further processing
      throw err; // Re-throw to be caught by fetchPageData
    }
  }, []);

  const fetchDefinitionData = useCallback(async (defId) => {
    // Removed fetchedUnitsData as it's in state
    const defData = await cogsService.getProductCogsDefinitionById(defId);
    setFormData({
      product_id:
        defData.product?.id?.toString() || defData.product_id?.toString() || "", // Use product_id from serializer if available
      notes: defData.notes || "",
      waste_factor_percentage:
        defData.waste_factor_percentage?.toString() || "5.0",
    });

    // The backend items are ProductCOGSComponentLink, which have inventory_item and quantity_unit
    if (defData.items && defData.items.length > 0) {
      const populatedComponents = defData.items.map((item) => {
        return {
          // item.inventory_item is the ID from the backend if not nested, or item.inventory_item_details.id
          inventory_item_id:
            item.inventory_item_details?.id?.toString() ||
            item.inventory_item?.toString() ||
            "",
          quantity: item.quantity?.toString() || "1",
          // item.quantity_unit is the ID from the backend if not nested, or item.quantity_unit_details.id
          unit_id:
            item.quantity_unit_details?.id?.toString() ||
            item.quantity_unit?.toString() ||
            "",
        };
      });
      setComponents(populatedComponents);
    } else {
      setComponents([{ inventory_item_id: "", quantity: "1", unit_id: "" }]);
    }
  }, []);

  const fetchPageData = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);
    try {
      await fetchDropdownData(); // unitsData is now set in state by fetchDropdownData
      if (isEditMode && definitionId) {
        await fetchDefinitionData(definitionId);
      } else if (productIdForForm) {
        setFormData((prev) => ({
          ...prev,
          product_id: productIdForForm.toString(),
        }));
        try {
          const existingDef =
            await cogsService.getProductCogsDefinitionByProductId(
              productIdForForm
            );
          if (existingDef && existingDef.id) {
            toast.info(
              `Existing COGS definition found for product. Loading for editing.`
            );
            navigate(`/cogs/product-definitions/edit/${existingDef.id}`, {
              replace: true,
            });
            return; // Important to return here to prevent further execution
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            // No existing definition, proceed to define new for this product
          } else {
            throw err; // Re-throw other errors
          }
        }
      }
    } catch (err) {
      // Error already logged and pageError set by fetchDropdownData if it failed there
      if (!pageError) {
        // If error originated here or was re-thrown
        console.error("Error fetching page data:", err);
        const errorMsg =
          err.response?.data?.detail ||
          err.message ||
          "Failed to load page data.";
        setPageError(errorMsg);
        toast.error(errorMsg);
      }
      // Clear dropdown data as it might be inconsistent
      setAllProducts([]);
      setAllInventoryItems([]);
      setUnitsOfMeasure([]);
    } finally {
      setPageLoading(false);
    }
  }, [
    isEditMode,
    definitionId,
    productIdForForm,
    fetchDropdownData,
    fetchDefinitionData,
    navigate,
    pageError, // Added pageError dependency
  ]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  // Recalculate cost whenever components, waste factor, or item costs change
  useEffect(() => {
    if (!allInventoryItems.length) return; // Don't calculate if items aren't loaded

    const totalBaseMaterialCost = components.reduce((sum, component) => {
      if (
        component.inventory_item_id &&
        component.quantity.trim() && // Ensure quantity is not just whitespace
        component.unit_id // Ensure unit_id is selected
      ) {
        const itemDetails = allInventoryItems.find(
          (invItem) => invItem.id.toString() === component.inventory_item_id
        );

        // Ensure itemDetails, its costing_unit, and its current_cost_per_unit are valid
        if (
          itemDetails &&
          itemDetails.costing_unit &&
          itemDetails.current_cost_per_unit != null
        ) {
          const quantityUsed = parseFloat(component.quantity);
          const componentUnit = unitsOfMeasure.find(
            (u) => u.id.toString() === component.unit_id
          );
          const itemCostingUnit = unitsOfMeasure.find(
            (u) => u.id === itemDetails.costing_unit
          ); // inventoryItem.costing_unit is an ID

          if (
            isNaN(quantityUsed) ||
            quantityUsed <= 0 ||
            !componentUnit ||
            !itemCostingUnit
          ) {
            return sum; // Skip if quantity is invalid or units are missing
          }

          let quantityInCostingUnits = quantityUsed;
          // Perform unit conversion if component unit is different from item's costing unit
          if (componentUnit.id !== itemCostingUnit.id) {
            if (
              componentUnit.base_unit_equivalent > 0 &&
              itemCostingUnit.base_unit_equivalent > 0
            ) {
              quantityInCostingUnits =
                (quantityUsed * componentUnit.base_unit_equivalent) /
                itemCostingUnit.base_unit_equivalent;
            } else {
              console.warn(
                `Cannot convert units for ${itemDetails.name} due to zero base_unit_equivalent.`
              );
              return sum; // Skip if conversion is not possible
            }
          }

          const cost =
            parseFloat(itemDetails.current_cost_per_unit) *
            quantityInCostingUnits;
          return sum + (isNaN(cost) ? 0 : cost);
        }
      }
      return sum;
    }, 0);

    const wasteFactor =
      (parseFloat(formData.waste_factor_percentage) || 0) / 100;
    const wasteAdjustedCost = totalBaseMaterialCost * (1 + wasteFactor);
    setCalculatedCost(isNaN(wasteAdjustedCost) ? 0 : wasteAdjustedCost);
  }, [
    components,
    formData.waste_factor_percentage,
    allInventoryItems,
    unitsOfMeasure,
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null);
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null);
  };

  const handleComponentChange = (index, field, value) => {
    const newComponents = [...components];
    newComponents[index][field] = value;
    setComponents(newComponents);
    if (submitError) setSubmitError(null);
  };

  const addComponent = () => {
    setComponents([
      ...components,
      { inventory_item_id: "", quantity: "1", unit_id: "" },
    ]);
  };

  const removeComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.product_id) errors.product_id = "Product is required.";

    const wasteFactorNum = parseFloat(formData.waste_factor_percentage);
    if (isNaN(wasteFactorNum) || wasteFactorNum < 0) {
      errors.waste_factor_percentage =
        "Waste factor must be a non-negative number.";
    }

    if (components.length > 0) {
      components.forEach((comp, index) => {
        let compHasError = false;
        if (!comp.inventory_item_id) {
          errors[
            `component_inventory_item_id_${index}`
          ] = `Item for component ${index + 1} is required.`;
          compHasError = true;
        }
        if (!comp.unit_id) {
          errors[`component_unit_id_${index}`] = `Unit for component ${
            index + 1
          } is required.`;
          compHasError = true;
        }
        if (
          !comp.quantity.trim() ||
          isNaN(parseFloat(comp.quantity)) ||
          parseFloat(comp.quantity) <= 0
        ) {
          errors[`component_quantity_${index}`] = `Component ${
            index + 1
          } quantity must be a positive number.`;
          compHasError = true;
        }
        if (compHasError && !errors.components) {
          // Add a general components error if any individual one fails
          errors.components = "Please correct errors in the components list.";
        }
      });
    }
    // It's okay to have zero components if the user hasn't added any.
    // The backend might enforce at least one component if it's logical for COGS.

    setSubmitError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }
    setSubmitting(true);
    if (typeof submitError === "string") setSubmitError(null);

    // Align payload with backend ProductCOGSSerializer and ProductCOGSComponentLinkSerializer
    const dataToSubmit = {
      product_id: parseInt(formData.product_id), // Changed from 'product'
      notes: formData.notes,
      waste_factor_percentage: parseFloat(formData.waste_factor_percentage),
      items: components // Changed from 'components' to 'items'
        .filter(
          // Ensure only complete components are sent
          (comp) =>
            comp.inventory_item_id && comp.quantity.trim() && comp.unit_id
        )
        .map((comp) => ({
          inventory_item_id: parseInt(comp.inventory_item_id), // Changed from 'inventory_item'
          quantity: parseFloat(comp.quantity),
          quantity_unit_id: parseInt(comp.unit_id), // Changed from 'unit' to 'quantity_unit_id'
        })),
    };

    try {
      if (isEditMode) {
        await cogsService.updateProductCogsDefinition(
          definitionId,
          dataToSubmit
        );
        toast.success("Product COGS Definition updated successfully!");
      } else {
        await cogsService.createProductCogsDefinition(dataToSubmit);
        toast.success("Product COGS Definition created successfully!");
      }
      navigate("/cogs/product-definitions"); // Adjust as needed
    } catch (err) {
      console.error(
        "Error saving Product COGS Definition:",
        err.response?.data || err.message
      );
      const errorData = err.response?.data;
      let errorMessage = "Failed to save Product COGS Definition.";
      let fieldErrors = {}; // For specific field errors from backend

      if (errorData) {
        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (typeof errorData === "object") {
          Object.entries(errorData).forEach(([key, value]) => {
            const valArray = Array.isArray(value) ? value : [String(value)];
            if (key === "product_id" || key === "product")
              fieldErrors.product_id = valArray.join(", ");
            else if (key === "items" || key === "components") {
              // Handle nested component errors
              if (Array.isArray(value)) {
                // errors for items array
                value.forEach((itemError, index) => {
                  if (typeof itemError === "object" && itemError !== null) {
                    Object.entries(itemError).forEach(([itemKey, itemVal]) => {
                      const itemValArray = Array.isArray(itemVal)
                        ? itemVal
                        : [String(itemVal)];
                      if (
                        itemKey === "inventory_item_id" ||
                        itemKey === "inventory_item"
                      )
                        fieldErrors[`component_inventory_item_id_${index}`] =
                          itemValArray.join(", ");
                      else if (
                        itemKey === "quantity_unit_id" ||
                        itemKey === "quantity_unit" ||
                        itemKey === "unit"
                      )
                        fieldErrors[`component_unit_id_${index}`] =
                          itemValArray.join(", ");
                      else if (itemKey === "quantity")
                        fieldErrors[`component_quantity_${index}`] =
                          itemValArray.join(", ");
                      else
                        fieldErrors[`component_${index}_${itemKey}`] =
                          itemValArray.join(", ");
                    });
                  } else if (typeof itemError === "string") {
                    fieldErrors[`components_error_${index}`] = itemError;
                  }
                });
                if (Object.values(value).every((v) => typeof v === "string")) {
                  fieldErrors.components = value.join("; "); // General error for components array
                } else if (
                  !Object.keys(fieldErrors).some((k) =>
                    k.startsWith("component_")
                  )
                ) {
                  // If component errors are objects but not mapping to specific fields yet
                  fieldErrors.components = "Error in one or more components.";
                }
              } else if (typeof value === "string") {
                // If 'items' itself has a string error
                fieldErrors.components = value;
              }
            } else fieldErrors[key] = valArray.join(", ");
          });
          if (Object.keys(fieldErrors).length > 0) {
            errorMessage = "Validation errors occurred. Please check the form.";
          } else if (errorData.detail) {
            // General detail error
            errorMessage = errorData.detail;
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setSubmitError(
        Object.keys(fieldErrors).length > 0 ? fieldErrors : errorMessage
      );
      toast.error(
        Object.keys(fieldErrors).length > 0
          ? "Please correct the highlighted errors."
          : `Save failed: ${errorMessage}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayFieldError = (fieldName, index = null) => {
    if (!submitError || typeof submitError === "string") return null;

    let errorKey = fieldName;
    if (index !== null) {
      // For component fields
      if (fieldName === "inventory_item_id")
        errorKey = `component_inventory_item_id_${index}`;
      else if (fieldName === "quantity")
        errorKey = `component_quantity_${index}`;
      else if (fieldName === "unit_id") errorKey = `component_unit_id_${index}`;
    }

    const error = submitError[errorKey];
    if (error) {
      return (
        <p className="text-xs text-destructive mt-1">
          {Array.isArray(error) ? error.join(", ") : error}
        </p>
      );
    }
    return null;
  };

  const displayGeneralSubmitError = () => {
    if (!submitError) return null;
    if (typeof submitError === "string") {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      );
    }
    // Check for general errors like 'detail' or 'non_field_errors' from Django
    const generalError = submitError.detail || submitError.non_field_errors;
    if (generalError) {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {Array.isArray(generalError)
              ? generalError.join(", ")
              : generalError}
          </AlertDescription>
        </Alert>
      );
    }
    // If it's an object but not a specific field error handled by displayFieldError
    if (
      typeof submitError === "object" &&
      Object.keys(submitError).length > 0 &&
      !Object.keys(submitError).some(
        (k) =>
          [
            "product_id",
            "notes",
            "waste_factor_percentage",
            "components",
          ].includes(k) || k.startsWith("component_")
      )
    ) {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            An unexpected error occurred. Please check the details:
            <ul className="list-disc list-inside text-xs mt-1">
              {Object.entries(submitError).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong>{" "}
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const getItemTypeLabel = (type) => {
    const types = {
      RAW_MATERIAL: "Raw Material",
      PACKAGING: "Packaging",
      PREPARED_GOOD: "Prepared Good",
      OTHER_DIRECT_COST: "Other Direct Cost",
    };
    return types[type] || type || "N/A";
  };

  if (pageLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="ml-3 text-muted-foreground">Loading form data...</p>
        </div>
      </MainLayout>
    );
  }

  if (pageError) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 p-4 text-center">
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5 mr-2 inline-block" />
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate("/cogs/product-definitions")}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again or Go Back
          </Button>
        </div>
      </MainLayout>
    );
  }

  const currentProductSelection = allProducts.find(
    (p) => p.id.toString() === formData.product_id
  );

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-slate-600" />
            {isEditMode
              ? `Edit COGS: ${currentProductSelection?.name || "Definition"}`
              : productIdForForm && currentProductSelection
              ? `Define COGS: ${currentProductSelection.name}`
              : "Add New Product COGS Definition"}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cogs/product-definitions")}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Definitions List
            </Button>
          </div>
        </div>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Define all components that make up the cost of a single unit of a
            sellable product. Components can be Inventory Items (raw materials,
            packaging, or prepared goods from recipes). The calculated cost will
            be used to determine profit margins.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Definition Details
                  {productIdForForm &&
                    !isEditMode &&
                    currentProductSelection && (
                      <span className="text-base text-muted-foreground ml-2">
                        for &quot;{currentProductSelection.name}&quot;
                      </span>
                    )}
                  {isEditMode &&
                    formData.product_id &&
                    currentProductSelection && (
                      <span className="text-base text-muted-foreground ml-2">
                        for &quot;{currentProductSelection.name}&quot;
                      </span>
                    )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {!productIdForForm && ( // Only show product selector if not defining for a specific product via URL
                      <div>
                        <Label htmlFor="product_id">Product *</Label>
                        <Select
                          name="product_id"
                          value={formData.product_id}
                          onValueChange={(value) =>
                            handleSelectChange("product_id", value)
                          }
                          disabled={isEditMode || !!productIdForForm} // Disable if editing or product ID came from params
                        >
                          <SelectTrigger
                            className={
                              submitError?.product_id || submitError?.product
                                ? "border-destructive"
                                : ""
                            }
                          >
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {allProducts.map((product) => (
                              <SelectItem
                                key={product.id}
                                value={product.id.toString()}
                              >
                                {product.name} ({product.sku || "No SKU"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {displayFieldError("product_id") ||
                          displayFieldError("product")}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="Optional notes about this COGS definition"
                        rows={3}
                      />
                      {displayFieldError("notes")}
                    </div>

                    <div>
                      <Label htmlFor="waste_factor_percentage">
                        Waste Factor Percentage *
                      </Label>
                      <Input
                        id="waste_factor_percentage"
                        name="waste_factor_percentage"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.waste_factor_percentage}
                        onChange={handleInputChange}
                        placeholder="5.0"
                        className={
                          submitError?.waste_factor_percentage
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {displayFieldError("waste_factor_percentage")}
                      <p className="text-sm text-muted-foreground mt-1">
                        Percentage to account for waste, spillage, or other
                        losses.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Product Components{" "}
                        {components.length > 0 ? "*" : "(Optional)"}
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addComponent}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Component</span>
                      </Button>
                    </div>
                    {displayFieldError("components")}

                    <Card>
                      <CardContent className="pt-0">
                        <div className="overflow-y-auto custom-scrollbar border rounded-md max-h-[400px]">
                          {components.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-center py-8 min-h-[150px]">
                              <div>
                                <p className="text-muted-foreground">
                                  No components added yet.
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addComponent}
                                  className="mt-4"
                                >
                                  Add Component
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                                  <TableRow>
                                    <TableHead className="w-[35%]">
                                      Inventory Item *
                                    </TableHead>
                                    <TableHead className="w-[20%]">
                                      Type
                                    </TableHead>
                                    <TableHead className="w-[15%]">
                                      Quantity *
                                    </TableHead>
                                    <TableHead className="w-[15%]">
                                      Unit *
                                    </TableHead>
                                    <TableHead className="w-[10%]">
                                      Cost
                                    </TableHead>
                                    <TableHead className="text-right w-[5%] pr-2">
                                      {/* Delete */}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {components.map((component, index) => {
                                    const selectedItem = allInventoryItems.find(
                                      (item) =>
                                        item.id.toString() ===
                                        component.inventory_item_id
                                    );

                                    let componentCost = 0;
                                    if (
                                      selectedItem &&
                                      component.quantity.trim() &&
                                      component.unit_id &&
                                      selectedItem.current_cost_per_unit != null
                                    ) {
                                      const quantityUsed = parseFloat(
                                        component.quantity
                                      );
                                      const componentUnit = unitsOfMeasure.find(
                                        (u) =>
                                          u.id.toString() === component.unit_id
                                      );
                                      const itemCostingUnit =
                                        unitsOfMeasure.find(
                                          (u) =>
                                            u.id === selectedItem.costing_unit
                                        );

                                      if (
                                        !isNaN(quantityUsed) &&
                                        quantityUsed > 0 &&
                                        componentUnit &&
                                        itemCostingUnit
                                      ) {
                                        let quantityInCostingUnits =
                                          quantityUsed;
                                        if (
                                          componentUnit.id !==
                                          itemCostingUnit.id
                                        ) {
                                          if (
                                            parseFloat(
                                              componentUnit.base_unit_equivalent
                                            ) > 0 &&
                                            parseFloat(
                                              itemCostingUnit.base_unit_equivalent
                                            ) > 0
                                          ) {
                                            quantityInCostingUnits =
                                              (quantityUsed *
                                                parseFloat(
                                                  componentUnit.base_unit_equivalent
                                                )) /
                                              parseFloat(
                                                itemCostingUnit.base_unit_equivalent
                                              );
                                          } else {
                                            quantityInCostingUnits = 0; // Cannot convert
                                          }
                                        }
                                        const cost =
                                          parseFloat(
                                            selectedItem.current_cost_per_unit
                                          ) * quantityInCostingUnits;
                                        componentCost = isNaN(cost) ? 0 : cost;
                                      }
                                    }

                                    return (
                                      <TableRow key={index}>
                                        <TableCell>
                                          <Select
                                            value={component.inventory_item_id}
                                            onValueChange={(value) =>
                                              handleComponentChange(
                                                index,
                                                "inventory_item_id",
                                                value
                                              )
                                            }
                                          >
                                            <SelectTrigger
                                              className={
                                                displayFieldError(
                                                  "inventory_item_id",
                                                  index
                                                )
                                                  ? "border-destructive"
                                                  : ""
                                              }
                                            >
                                              <SelectValue placeholder="Select item" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {allInventoryItems.map((item) => (
                                                <SelectItem
                                                  key={item.id}
                                                  value={item.id.toString()}
                                                >
                                                  {item.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          {displayFieldError(
                                            "inventory_item_id",
                                            index
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {selectedItem && (
                                            <span className="text-xs text-muted-foreground">
                                              {getItemTypeLabel(
                                                selectedItem.item_type
                                              )}
                                            </span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            value={component.quantity}
                                            onChange={(e) =>
                                              handleComponentChange(
                                                index,
                                                "quantity",
                                                e.target.value
                                              )
                                            }
                                            placeholder="0.000"
                                            className={`w-24 h-8 text-xs ${
                                              displayFieldError(
                                                "quantity",
                                                index
                                              )
                                                ? "border-destructive"
                                                : ""
                                            }`}
                                          />
                                          {displayFieldError("quantity", index)}
                                        </TableCell>
                                        <TableCell>
                                          <Select
                                            value={component.unit_id}
                                            onValueChange={(value) =>
                                              handleComponentChange(
                                                index,
                                                "unit_id",
                                                value
                                              )
                                            }
                                          >
                                            <SelectTrigger
                                              className={`w-20 h-8 text-xs ${
                                                displayFieldError(
                                                  "unit_id",
                                                  index
                                                )
                                                  ? "border-destructive"
                                                  : ""
                                              }`}
                                            >
                                              <SelectValue placeholder="Unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {unitsOfMeasure.map((unit) => (
                                                <SelectItem
                                                  key={unit.id}
                                                  value={unit.id.toString()}
                                                >
                                                  {unit.abbreviation}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          {displayFieldError("unit_id", index)}
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-xs">
                                            ${formatPrice(componentCost, 4)}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-2">
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() =>
                                              removeComponent(index)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">
                                              Remove Component
                                            </span>
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {displayGeneralSubmitError()}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/cogs/product-definitions")}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || pageLoading}>
                      {submitting ? (
                        <Save className="mr-2 h-4 w-4 animate-pulse" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {submitting
                        ? "Saving..."
                        : isEditMode
                        ? "Save Changes"
                        : "Create Definition"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Estimated Cost Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Base Material Cost:</span>
                    <span>
                      $
                      {formatPrice(
                        calculatedCost /
                          (1 +
                            (Number.parseFloat(
                              formData.waste_factor_percentage
                            ) || 0) /
                              100),
                        4
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>
                      Waste Factor ({formData.waste_factor_percentage || 0}%):
                    </span>
                    <span>
                      $
                      {formatPrice(
                        calculatedCost -
                          calculatedCost /
                            (1 +
                              (Number.parseFloat(
                                formData.waste_factor_percentage
                              ) || 0) /
                                100),
                        4
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total Estimated COGS:</span>
                    <span className="text-primary">
                      ${formatPrice(calculatedCost, 4)}
                    </span>
                  </div>
                </div>

                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    This cost represents the total COGS for one unit of the
                    selected product, based on current component costs and waste
                    factor.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductCogsDefinitionFormPage;
