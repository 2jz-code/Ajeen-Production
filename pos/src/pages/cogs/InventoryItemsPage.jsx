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
  Package, // Icon for page title
  ArrowLeft,
  RefreshCw, // For retry button
  AlertTriangle, // For error display
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle"; // For setting document title
import * as cogsService from "../../api/services/cogsService"; // Import cogsService
import { toast } from "react-toastify";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal"; // For delete confirmation

const InventoryItemsPage = () => {
  useDocumentTitle("COGS | Inventory Items"); // Set document title
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInventoryItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cogsService.getInventoryItems();
      setInventoryItems(Array.isArray(data) ? data : []);
      setFilteredItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching inventory items:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to load inventory items.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryItems();
  }, [fetchInventoryItems]);

  useEffect(() => {
    const filtered = inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.item_type &&
          item.item_type.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredItems(filtered);
  }, [searchTerm, inventoryItems]);

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await cogsService.deleteInventoryItem(itemToDelete.id);
      toast.success(
        `Inventory Item "${itemToDelete.name}" deleted successfully.`
      );
      fetchInventoryItems();
    } catch (err) {
      console.error("Error deleting inventory item:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to delete inventory item.";
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
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

  const getItemTypeVariant = (type) => {
    const variants = {
      RAW_MATERIAL: "default",
      PACKAGING: "secondary",
      PREPARED_GOOD: "outline",
      OTHER_DIRECT_COST: "destructive",
    };
    return variants[type] || "default";
  };

  if (loading && inventoryItems.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="ml-3 text-muted-foreground">
            Loading inventory items...
          </p>
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
            <Package className="h-5 w-5 text-slate-600" />
            Inventory Items
          </h2>
          <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cogs")}
              disabled={loading && inventoryItems.length === 0}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to COGS Dashboard
            </Button>
            <Link to="/cogs/inventory-items/new">
              <Button size="sm" className="flex items-center">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                <span>Add New Inventory Item</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 w-full sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search inventory items..."
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
                Error Loading Inventory Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={fetchInventoryItems}
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
              <Package className="h-5 w-5" />
              <span>
                Inventory Items List ({filteredItems.length} of{" "}
                {inventoryItems.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && inventoryItems.length > 0 && (
              <div className="text-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            )}
            {!loading && filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No inventory items found matching your search."
                    : "No inventory items created yet."}
                </p>
                {!searchTerm && (
                  <Link to="/cogs/inventory-items/new">
                    <Button className="mt-4" size="sm">
                      Add Your First Item
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Costing Unit</TableHead>
                    <TableHead>Cost per Unit</TableHead>
                    <TableHead>Last Purchase</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={getItemTypeVariant(item.item_type)}>
                          {getItemTypeLabel(item.item_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.costing_unit_details?.abbreviation || "N/A"}
                      </TableCell>
                      <TableCell>
                        $
                        {item.current_cost_per_unit
                          ? Number(item.current_cost_per_unit).toFixed(4)
                          : "0.0000"}
                      </TableCell>
                      <TableCell>
                        {item.latest_purchase_price != null ? (
                          <div className="text-sm">
                            <div>
                              ${Number(item.latest_purchase_price).toFixed(2)}
                            </div>
                            <div className="text-muted-foreground">
                              {item.latest_purchase_quantity}{" "}
                              {item.latest_purchase_unit_details
                                ?.abbreviation ||
                                item.costing_unit_details?.abbreviation ||
                                "units"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Link to={`/cogs/inventory-items/edit/${item.id}`}>
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
                            onClick={() => handleDeleteClick(item)}
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
      </div>
      {showDeleteModal && itemToDelete && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          onConfirm={confirmDeleteItem}
          title="Delete Inventory Item"
          message={`Are you sure you want to delete the item "${itemToDelete.name}"? This action cannot be undone and might affect recipes or product COGS definitions.`}
          confirmButtonText={isDeleting ? "Deleting..." : "Delete"}
          isConfirmDisabled={isDeleting}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </MainLayout>
  );
};

export default InventoryItemsPage;
