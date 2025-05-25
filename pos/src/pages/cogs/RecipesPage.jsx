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
  ChefHat,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import * as cogsService from "../../api/services/cogsService";
import { toast } from "react-toastify";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import ConfirmationModal from "../../components/ConfirmationModal";

// Helper to safely parse and format currency
const formatCurrency = (value, digits = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return (0).toFixed(digits);
  }
  return num.toFixed(digits);
};

const RecipesPage = () => {
  useDocumentTitle("COGS | Recipes");
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cogsService.getRecipes();
      // Ensure data is an array before setting
      const recipesArray = Array.isArray(data) ? data : [];
      setRecipes(recipesArray);
      setFilteredRecipes(recipesArray); // Initialize filteredRecipes with all recipes
    } catch (err) {
      console.error("Error fetching recipes:", err);
      const errorMsg =
        err.response?.data?.detail || err.message || "Failed to load recipes.";
      setError(errorMsg);
      toast.error(errorMsg);
      setRecipes([]); // Set to empty array on error
      setFilteredRecipes([]); // Also clear filtered recipes
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    if (!Array.isArray(recipes)) {
      // Guard against recipes not being an array
      setFilteredRecipes([]);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = recipes.filter(
      (recipe) =>
        recipe.name?.toLowerCase().includes(lowerSearchTerm) ||
        (recipe.description &&
          recipe.description.toLowerCase().includes(lowerSearchTerm)) ||
        // Ensure produces_item and its name exist before trying to access them
        (recipe.produces_item_details?.name && // Check produces_item_details from API response
          recipe.produces_item_details.name
            .toLowerCase()
            .includes(lowerSearchTerm))
    );
    setFilteredRecipes(filtered);
  }, [searchTerm, recipes]);

  const handleDeleteClick = (recipe) => {
    setRecipeToDelete(recipe);
    setShowDeleteModal(true);
  };

  const confirmDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    setIsDeleting(true);
    try {
      await cogsService.deleteRecipe(recipeToDelete.id);
      toast.success(`Recipe "${recipeToDelete.name}" deleted successfully.`);
      fetchRecipes();
    } catch (err) {
      console.error("Error deleting recipe:", err);
      const errorMsg =
        err.response?.data?.detail || err.message || "Failed to delete recipe.";
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setRecipeToDelete(null);
    }
  };

  // Display for Yield Unit - uses implicit_yield_unit_details
  const getYieldUnitDisplay = (recipe) => {
    if (recipe.implicit_yield_unit_details) {
      return (
        recipe.implicit_yield_unit_details.abbreviation ||
        recipe.implicit_yield_unit_details.name ||
        "unit"
      );
    }
    // Fallback if produces_item_details.costing_unit_details is not available directly as implicit_yield_unit_details
    if (recipe.produces_item_details?.costing_unit_details) {
      return (
        recipe.produces_item_details.costing_unit_details.abbreviation ||
        recipe.produces_item_details.costing_unit_details.name ||
        "unit"
      );
    }
    return "unit";
  };

  if (loading && recipes.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="ml-3 text-muted-foreground">Loading recipes...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-slate-600" />
            Recipes
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
            <Link to="/cogs/recipes/new">
              <Button size="sm" className="flex items-center">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                <span>Add New Recipe</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative flex-1 w-full sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search recipes..."
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
                Error Loading Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={fetchRecipes}
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
              <ChefHat className="h-5 w-5" />
              <span>
                Recipes List ({filteredRecipes.length} of {recipes.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && recipes.length > 0 && (
              <div className="text-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            )}
            {!loading && filteredRecipes.length === 0 && !error ? (
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No recipes found matching your search."
                    : "No recipes created yet."}
                </p>
                {!searchTerm && (
                  <Link to="/cogs/recipes/new">
                    <Button className="mt-4" size="sm">
                      Create Your First Recipe
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              !error &&
              filteredRecipes.length > 0 && ( // Only render table if no error and recipes exist
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipe Name</TableHead>
                      <TableHead>Produces</TableHead>
                      <TableHead>Yield</TableHead>
                      <TableHead>Components</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Cost per Unit</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.map((recipe) => (
                      <TableRow key={recipe.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{recipe.name}</div>
                            {recipe.description && (
                              <div
                                className="text-sm text-muted-foreground line-clamp-2"
                                title={recipe.description}
                              >
                                {recipe.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {recipe.produces_item_details?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(recipe.yield_quantity, 3)}{" "}
                          {getYieldUnitDisplay(recipe)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {/* Assuming components is an array in the response */}
                            {recipe.components?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ${formatCurrency(recipe.total_components_cost, 2)}
                        </TableCell>
                        <TableCell>
                          $
                          {formatCurrency(
                            recipe.calculated_cost_per_produced_unit,
                            4
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Link to={`/cogs/recipes/edit/${recipe.id}`}>
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
                              onClick={() => handleDeleteClick(recipe)}
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
              <ChefHat className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">
                  About Recipes
                </h3>
                <p className="text-sm text-blue-700">
                  Recipes define how to create prepared goods from raw materials
                  and other components. The cost of the produced item is
                  automatically calculated based on the recipe components and
                  their quantities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {showDeleteModal && recipeToDelete && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setRecipeToDelete(null);
          }}
          onConfirm={confirmDeleteRecipe}
          title="Delete Recipe"
          message={`Are you sure you want to delete the recipe "${recipeToDelete.name}"? This action cannot be undone.`}
          confirmButtonText={isDeleting ? "Deleting..." : "Delete"}
          isConfirmDisabled={isDeleting}
        />
      )}
    </MainLayout>
  );
};

export default RecipesPage;
