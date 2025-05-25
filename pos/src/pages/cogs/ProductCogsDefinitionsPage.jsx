"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Package2,
  ArrowLeft,
  RefreshCw, // For retry button
  AlertTriangle, // For error display
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import * as cogsService from "../../api/services/cogsService"; // Import cogsService
import { toast } from "react-toastify";
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Assuming this exists
import ConfirmationModal from "../../components/ConfirmationModal"; // For delete confirmation

// Helper to safely parse and format currency (if not already globally available)
const safeFormatPrice = (value, digits = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return (0).toFixed(digits);
  }
  return num.toFixed(digits);
};

const ProductCogsDefinitionsPage = () => {
  useDocumentTitle("COGS | Product COGS Definitions");
  const [definitions, setDefinitions] = useState([]);
  const [filteredDefinitions, setFilteredDefinitions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [definitionToDelete, setDefinitionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cogsService.getProductCogsDefinitions();
      const definitionsArray = Array.isArray(data) ? data : [];
      setDefinitions(definitionsArray);
      setFilteredDefinitions(definitionsArray);
    } catch (err) {
      console.error("Error fetching COGS definitions:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to load COGS definitions.";
      setError(errorMsg);
      toast.error(errorMsg);
      setDefinitions([]);
      setFilteredDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  useEffect(() => {
    if (!Array.isArray(definitions)) {
      setFilteredDefinitions([]);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = definitions.filter((def) => {
      const productName = def.product_details?.name || def.product?.name || ""; // Use product_details first
      const productSku = def.product_details?.sku || def.product?.sku || "";
      const notes = def.notes || "";

      return (
        productName.toLowerCase().includes(lowerSearchTerm) ||
        productSku.toLowerCase().includes(lowerSearchTerm) ||
        notes.toLowerCase().includes(lowerSearchTerm)
      );
    });
    setFilteredDefinitions(filtered);
  }, [searchTerm, definitions]);

  const handleDeleteClick = (definition) => {
    setDefinitionToDelete(definition);
    setShowDeleteModal(true);
  };

  const confirmDeleteDefinition = async () => {
    if (!definitionToDelete) return;
    setIsDeleting(true);
    try {
      await cogsService.deleteProductCogsDefinition(definitionToDelete.id);
      toast.success(
        `COGS Definition for "${
          definitionToDelete.product_details?.name ||
          definitionToDelete.product?.name ||
          "Product"
        }" deleted successfully.`
      );
      fetchDefinitions();
    } catch (err) {
      console.error("Error deleting COGS definition:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to delete COGS definition.";
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDefinitionToDelete(null);
    }
  };

  if (loading && definitions.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="ml-3 text-muted-foreground">Loading definitions...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Package2 className="h-5 w-5 text-slate-600" />
            Product COGS Definitions
          </h2>
          <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cogs")}
              disabled={loading}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to COGS Dashboard
            </Button>
            <Link to="/cogs/product-definitions/new">
              <Button size="sm" className="flex items-center">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                <span>Add New Definition</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative flex-1 w-full sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search product definitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Loading Definitions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={fetchDefinitions}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package2 className="h-5 w-5" />
              <span>
                Product COGS Definitions List ({filteredDefinitions.length} of{" "}
                {definitions.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && definitions.length > 0 && (
              <div className="text-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            )}
            {!loading && filteredDefinitions.length === 0 && !error ? (
              <div className="text-center py-8">
                <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No product definitions found matching your search."
                    : "No product COGS definitions created yet."}
                </p>
                {!searchTerm && (
                  <Link to="/cogs/product-definitions/new">
                    <Button className="mt-4" size="sm">
                      Create Your First Definition
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              !error &&
              filteredDefinitions.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Components</TableHead>
                      <TableHead>Waste Factor</TableHead>
                      <TableHead>Final COGS/Unit</TableHead>
                      {/* Changed from Total Cost */}
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDefinitions.map((definition) => (
                      <TableRow key={definition.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {definition.product_details?.name ||
                                definition.product?.name ||
                                "N/A"}
                            </div>
                            {definition.notes && (
                              <div
                                className="text-sm text-muted-foreground line-clamp-2"
                                title={definition.notes}
                              >
                                {definition.notes}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {definition.product_details?.sku ||
                              definition.product?.sku ||
                              "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {/* API response shows 'items' as the array of components for ProductCOGS */}
                            {definition.items?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {safeFormatPrice(
                            definition.waste_factor_percentage,
                            2
                          )}
                          %
                        </TableCell>
                        <TableCell>
                          ${safeFormatPrice(definition.final_cogs_per_unit, 4)}
                        </TableCell>
                        <TableCell>
                          {definition.updated_at
                            ? new Date(
                                definition.updated_at
                              ).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Link
                              to={`/cogs/product-definitions/edit/${definition.id}`}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </Link>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteClick(definition)}
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
              )
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Package2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">
                  Alternative Management
                </h3>
                <p className="text-sm text-blue-700">
                  You can also manage a product&apos;s COGS definition directly
                  from its product edit page in the main product management
                  section.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {showDeleteModal && definitionToDelete && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDefinitionToDelete(null);
          }}
          onConfirm={confirmDeleteDefinition}
          title="Delete COGS Definition"
          message={`Are you sure you want to delete the COGS definition for "${
            definitionToDelete.product_details?.name ||
            definitionToDelete.product?.name ||
            "Product"
          }"? This action cannot be undone.`}
          confirmButtonText={isDeleting ? "Deleting..." : "Delete"}
          isConfirmDisabled={isDeleting}
        />
      )}
    </MainLayout>
  );
};

export default ProductCogsDefinitionsPage;
