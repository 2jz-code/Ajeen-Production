"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
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
import { Badge } from "../../components/ui/badge";
import Modal from "../../components/common/Modal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Removed axiosInstance import as cogsService handles it
import * as cogsService from "../../api/services/cogsService"; // Import cogsService
import MainLayout from "../layout/MainLayout";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { toast } from "react-toastify";
import LoadingSpinner from "../reports/components/LoadingSpinner";

import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Ruler,
  ArrowLeft,
  RefreshCw, // For retry button
  AlertTriangle, // For error display
} from "lucide-react";

const UnitsOfMeasurePage = () => {
  useDocumentTitle("COGS | Units of Measure");
  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [currentUnit, setCurrentUnit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    is_base_unit: false,
    base_unit_equivalent: "1.0",
  });

  const [loading, setLoading] = useState(true); // For main list loading
  const [formSubmitting, setFormSubmitting] = useState(false); // For form submission
  const [error, setError] = useState(null); // For main list error
  const [formError, setFormError] = useState(null); // For modal form error
  const navigate = useNavigate();

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cogsService.getUnitsOfMeasure(); // Use service
      setUnits(Array.isArray(data) ? data : []);
      setFilteredUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch units:", err);
      const errorMsg =
        err.response?.data?.detail || err.message || "Failed to fetch units.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    const filtered = units.filter(
      (unit) =>
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUnits(filtered);
  }, [searchTerm, units]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (formError) setFormError(null);
  };

  const openModal = (unit = null) => {
    setCurrentUnit(unit);
    setFormError(null);
    setFormData(
      unit
        ? {
            name: unit.name,
            abbreviation: unit.abbreviation,
            is_base_unit: unit.is_base_unit,
            base_unit_equivalent: unit.base_unit_equivalent.toString(),
          }
        : {
            name: "",
            abbreviation: "",
            is_base_unit: false,
            base_unit_equivalent: "1.0",
          }
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentUnit(null);
    setFormData({
      name: "",
      abbreviation: "",
      is_base_unit: false,
      base_unit_equivalent: "1.0",
    });
    setFormError(null);
  };

  const openDeleteConfirm = (unit) => {
    setCurrentUnit(unit);
    setIsConfirmDeleteOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsConfirmDeleteOpen(false);
    setCurrentUnit(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    const dataToSubmit = {
      ...formData,
      base_unit_equivalent:
        Number.parseFloat(formData.base_unit_equivalent) || 1.0,
    };

    try {
      if (currentUnit) {
        await cogsService.updateUnitOfMeasure(currentUnit.id, dataToSubmit); // Use service
        toast.success("Unit updated successfully!");
      } else {
        await cogsService.createUnitOfMeasure(dataToSubmit); // Use service
        toast.success("Unit created successfully!");
      }
      fetchUnits();
      closeModal();
    } catch (err) {
      const errorData = err.response?.data;
      let errorMessage = "Failed to save unit.";
      if (errorData) {
        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (typeof errorData === "object") {
          // Convert object errors to string. Example: { name: ["Name already exists."]}
          errorMessage = Object.entries(errorData)
            .map(
              ([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
            )
            .join("; ");
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setFormError(errorMessage);
      toast.error(errorMessage);
      console.error("Failed to save unit:", err);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (currentUnit) {
      setFormSubmitting(true); // Use formSubmitting for delete as well, or a new isDeleting state
      setFormError(null); // Clear previous form errors
      try {
        await cogsService.deleteUnitOfMeasure(currentUnit.id); // Use service
        toast.success(`Unit "${currentUnit.name}" deleted successfully.`);
        fetchUnits();
        closeDeleteConfirm();
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail || err.message || "Failed to delete unit.";
        setError(errorMsg); // Set general page error for delete, or a specific deleteError state
        toast.error(errorMsg);
        console.error("Failed to delete unit:", err);
      } finally {
        setFormSubmitting(false);
      }
    }
  };

  if (loading && units.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="ml-3 text-muted-foreground">Loading units...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Ruler className="h-5 w-5 text-slate-600" />
            Units of Measure
          </h2>
          <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cogs")}
              disabled={loading && units.length === 0}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to COGS Dashboard
            </Button>
            <Button
              size="sm"
              onClick={() => openModal()}
              className="flex items-center"
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              <span>Add New Unit</span>
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 w-full sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search units..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {error && ( // Display general page error if list failed to load initially
          <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Loading Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={fetchUnits}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {!error && ( // Only show table card if no initial load error
          <Card>
            <CardHeader>
              <CardTitle>
                Units of Measure List ({filteredUnits.length} of {units.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading &&
                units.length > 0 /* Subsequent loading for filtering */ && (
                  <div className="text-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              {!loading && filteredUnits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "No units found matching your search."
                      : "No units of measure defined yet."}
                  </p>
                  {!searchTerm && (
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => openModal()}
                    >
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      Add First Unit
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Abbreviation</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Base Equivalent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">
                          {unit.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{unit.abbreviation}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={unit.is_base_unit ? "default" : "outline"}
                          >
                            {unit.is_base_unit ? "Base Unit" : "Derived Unit"}
                          </Badge>
                        </TableCell>
                        <TableCell>{unit.base_unit_equivalent}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openModal(unit)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openDeleteConfirm(unit)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            title={currentUnit ? "Edit Unit" : "Add New Unit"}
            size="md" // Standardized modal size
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={
                    formError && (formError.name || formError.detail)
                      ? "border-destructive"
                      : ""
                  }
                />
                {formError?.name && (
                  <p className="text-xs text-destructive mt-1">
                    {formError.name.join
                      ? formError.name.join(", ")
                      : formError.name}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="abbreviation">
                  Abbreviation <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="abbreviation"
                  name="abbreviation"
                  value={formData.abbreviation}
                  onChange={handleInputChange}
                  required
                  className={
                    formError?.abbreviation ? "border-destructive" : ""
                  }
                />
                {formError?.abbreviation && (
                  <p className="text-xs text-destructive mt-1">
                    {formError.abbreviation.join
                      ? formError.abbreviation.join(", ")
                      : formError.abbreviation}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="base_unit_equivalent">
                  Base Unit Equivalent{" "}
                  <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (e.g., 1000 if base is &apos;g&apos; and this is
                    &apos;kg&apos;)
                  </span>
                </Label>
                <Input
                  id="base_unit_equivalent"
                  name="base_unit_equivalent"
                  type="number"
                  step="0.0001"
                  value={formData.base_unit_equivalent}
                  onChange={handleInputChange}
                  required
                  className={
                    formError?.base_unit_equivalent ? "border-destructive" : ""
                  }
                />
                {formError?.base_unit_equivalent && (
                  <p className="text-xs text-destructive mt-1">
                    {formError.base_unit_equivalent.join
                      ? formError.base_unit_equivalent.join(", ")
                      : formError.base_unit_equivalent}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_base_unit"
                  name="is_base_unit"
                  checked={formData.is_base_unit}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_base_unit: checked }))
                  }
                />
                <Label htmlFor="is_base_unit" className="font-normal">
                  {" "}
                  {/* Removed cursor-pointer as checkbox handles it */}
                  Is this a base unit itself?
                </Label>
              </div>
              {formError &&
                typeof formError === "string" && ( // Display general form error if it's a string
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
              {formError?.detail && ( // Display detail error if present
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{formError.detail}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting && (
                    <LoadingSpinner size="sm" className="mr-2" />
                  )}
                  {formSubmitting ? "Saving..." : "Save Unit"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {isConfirmDeleteOpen && currentUnit && (
          <ConfirmationModal
            isOpen={isConfirmDeleteOpen}
            onClose={closeDeleteConfirm}
            onConfirm={handleDelete}
            title="Delete Unit"
            message={`Are you sure you want to delete the unit "${currentUnit.name}"? This action cannot be undone.`}
            confirmButtonText="Delete"
            cancelText="Cancel"
            isConfirmDisabled={formSubmitting}
            confirmButtonClass="bg-red-600 hover:bg-red-700" // Explicitly make delete button red
          />
        )}
      </div>
    </MainLayout>
  );
};

export default UnitsOfMeasurePage;
