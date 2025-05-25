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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { InfoIcon, Package, ArrowLeft, Save } from "lucide-react"; // Added Save, Package, ArrowLeft
import * as cogsService from "../../api/services/cogsService";
// Removed useApi import
import MainLayout from "../layout/MainLayout";
import { toast } from "react-toastify"; // For notifications
import { useDocumentTitle } from "../../hooks/useDocumentTitle"; // For setting document title

const ITEM_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "PREPARED_GOOD", label: "Prepared Good (from Recipe)" },
  { value: "OTHER_DIRECT_COST", label: "Other Direct Cost" },
];

const USE_COSTING_UNIT_VALUE = "__USE_COSTING_UNIT__"; // Special value for N/A option

const InventoryItemFormPage = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!itemId;

  // Document Title
  const pageAction = isEditMode ? "Edit" : "Add New";
  useDocumentTitle(`COGS | ${pageAction} Inventory Item`);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    item_type: "RAW_MATERIAL",
    costing_unit_id: "", // Will store ID
    current_cost_per_unit: "0.00",
    latest_purchase_price: "",
    latest_purchase_quantity: "",
    latest_purchase_unit_id: USE_COSTING_UNIT_VALUE, // Default to special value if "N/A" is default
  });
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);

  // Loading and Error States
  const [pageLoading, setPageLoading] = useState(true); // For initial data load (units and item if editing)
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null); // For errors during initial load
  const [submitError, setSubmitError] = useState(null); // For errors during form submission

  const fetchPageData = useCallback(async () => {
    setPageLoading(true);
    setPageError(null);
    try {
      const unitsData = await cogsService.getUnitsOfMeasure();
      setUnitsOfMeasure(Array.isArray(unitsData) ? unitsData : []);

      if (isEditMode && itemId) {
        const itemData = await cogsService.getInventoryItemById(itemId);
        setFormData({
          name: itemData.name || "",
          description: itemData.description || "",
          item_type: itemData.item_type || "RAW_MATERIAL",
          costing_unit_id: itemData.costing_unit?.id?.toString() || "",
          current_cost_per_unit:
            itemData.current_cost_per_unit?.toString() || "0.00",
          latest_purchase_price:
            itemData.latest_purchase_price?.toString() || "",
          latest_purchase_quantity:
            itemData.latest_purchase_quantity?.toString() || "",
          latest_purchase_unit_id:
            itemData.latest_purchase_unit?.id?.toString() ||
            USE_COSTING_UNIT_VALUE,
        });
      }
    } catch (err) {
      console.error("Error fetching page data:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to load page data.";
      setPageError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setPageLoading(false);
    }
  }, [isEditMode, itemId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null); // Clear submit error on change
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const dataToSubmit = {
      ...formData,
      costing_unit: formData.costing_unit_id
        ? parseInt(formData.costing_unit_id)
        : null,
      latest_purchase_unit:
        formData.latest_purchase_unit_id &&
        formData.latest_purchase_unit_id !== USE_COSTING_UNIT_VALUE
          ? parseInt(formData.latest_purchase_unit_id)
          : null,
      current_cost_per_unit: formData.current_cost_per_unit
        ? parseFloat(formData.current_cost_per_unit)
        : 0.0,
      latest_purchase_price: formData.latest_purchase_price
        ? parseFloat(formData.latest_purchase_price)
        : null,
      latest_purchase_quantity: formData.latest_purchase_quantity
        ? parseFloat(formData.latest_purchase_quantity)
        : null,
    };

    // Remove IDs as backend expects nested object or just the ID for 'costing_unit' and 'latest_purchase_unit'
    // The service should handle sending costing_unit (ID) and latest_purchase_unit (ID) correctly.
    // For now, we assume backend handles `costing_unit: ID` and `latest_purchase_unit: ID`.
    // If it needs the full object, the backend interaction or this payload needs adjustment.
    // Based on the current cogsService, it just passes the data through.

    // Conditional cost_per_unit deletion (same logic as useApi version)
    if (
      formData.item_type !== "OTHER_DIRECT_COST" &&
      !isEditMode &&
      formData.item_type !== "PREPARED_GOOD"
    ) {
      delete dataToSubmit.current_cost_per_unit;
    } else if (
      formData.item_type === "PREPARED_GOOD" ||
      (isEditMode && formData.item_type !== "OTHER_DIRECT_COST")
    ) {
      delete dataToSubmit.current_cost_per_unit;
    }

    // Remove id fields if they were added for select mapping
    delete dataToSubmit.costing_unit_id;
    delete dataToSubmit.latest_purchase_unit_id;

    try {
      if (isEditMode) {
        await cogsService.updateInventoryItem(itemId, dataToSubmit);
        toast.success("Inventory item updated successfully!");
      } else {
        await cogsService.createInventoryItem(dataToSubmit);
        toast.success("Inventory item created successfully!");
      }
      navigate("/cogs/inventory-items");
    } catch (err) {
      console.error(
        "Error saving inventory item:",
        err.response?.data || err.message
      );
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data ||
        err.message ||
        "Failed to save inventory item.";
      // If errorData is an object, try to format it
      let formattedError = errorMsg;
      if (
        typeof err.response?.data === "object" &&
        err.response?.data !== null
      ) {
        formattedError = Object.entries(err.response.data)
          .map(
            ([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
          )
          .join("; ");
      }
      setSubmitError(formattedError);
      toast.error(`Save failed: ${formattedError}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading form data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (pageError) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 p-4 text-center">
          <Alert variant="destructive">
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate("/cogs/inventory-items")}
            variant="outline"
          >
            Back to Inventory Items
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isCostEditable = formData.item_type === "OTHER_DIRECT_COST";
  const showPurchaseFields =
    formData.item_type === "RAW_MATERIAL" || formData.item_type === "PACKAGING";

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-600" />
            {isEditMode ? "Edit Inventory Item" : "Add New Inventory Item"}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cogs/inventory-items")}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Inventory List
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="item_type">Item Type *</Label>
                  <Select
                    name="item_type"
                    value={formData.item_type}
                    onValueChange={(value) =>
                      handleSelectChange("item_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="costing_unit_id">Costing Unit *</Label>
                  <Select
                    name="costing_unit_id"
                    value={formData.costing_unit_id}
                    onValueChange={(value) =>
                      handleSelectChange("costing_unit_id", value)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select costing unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitsOfMeasure.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    The unit used for calculating costs (e.g., cost per gram,
                    per piece)
                  </p>
                </div>
              </div>

              {showPurchaseFields && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Purchase Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="latest_purchase_price">
                          Latest Purchase Price ($)
                        </Label>
                        <Input
                          id="latest_purchase_price"
                          name="latest_purchase_price"
                          type="number"
                          step="0.01"
                          value={formData.latest_purchase_price}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label htmlFor="latest_purchase_quantity">
                          Latest Purchase Quantity
                        </Label>
                        <Input
                          id="latest_purchase_quantity"
                          name="latest_purchase_quantity"
                          type="number"
                          step="0.001"
                          value={formData.latest_purchase_quantity}
                          onChange={handleInputChange}
                          placeholder="0.000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="latest_purchase_unit_id">
                        Latest Purchase Unit
                      </Label>
                      <Select
                        name="latest_purchase_unit_id"
                        value={formData.latest_purchase_unit_id}
                        onValueChange={(value) =>
                          handleSelectChange("latest_purchase_unit_id", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select purchase unit" />
                        </SelectTrigger>
                        <SelectContent>
                          +{" "}
                          <SelectItem value={USE_COSTING_UNIT_VALUE}>
                            N/A (Use Costing Unit)
                          </SelectItem>
                          {unitsOfMeasure.map((unit) => (
                            <SelectItem
                              key={unit.id}
                              value={unit.id.toString()}
                            >
                              {unit.name} ({unit.abbreviation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {isCostEditable && (
                <>
                  <Separator />
                  <div>
                    <Label htmlFor="current_cost_per_unit">
                      Current Cost Per Unit *
                    </Label>
                    <Input
                      id="current_cost_per_unit"
                      name="current_cost_per_unit"
                      type="number"
                      step="0.000001"
                      value={formData.current_cost_per_unit}
                      onChange={handleInputChange}
                      required={isCostEditable}
                      placeholder="0.000000"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Directly set the cost for this item (e.g. for services or
                      fees).
                    </p>
                  </div>
                </>
              )}

              {formData.item_type === "PREPARED_GOOD" && (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    The cost for &apos;Prepared Good&apos; items is
                    automatically calculated and updated from its linked Recipe.
                  </AlertDescription>
                </Alert>
              )}

              {(formData.item_type === "RAW_MATERIAL" ||
                formData.item_type === "PACKAGING") &&
                !isEditMode && (
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      The cost for new &apos;Raw Material&apos; or
                      &apos;Packaging&apos; items will be automatically
                      calculated based on the purchase information provided. If
                      no purchase info, cost remains 0 until updated.
                    </AlertDescription>
                  </Alert>
                )}

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>Error: {submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/cogs/inventory-items")}
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
                    : "Create Item"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InventoryItemFormPage;
