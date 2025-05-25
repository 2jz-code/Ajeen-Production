"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { PlusCircle, Search, Edit, Trash2, ChefHat } from "lucide-react";
import MainLayout from "../layout/MainLayout";

const RecipesPage = () => {
	const [recipes, setRecipes] = useState([]);
	const [filteredRecipes, setFilteredRecipes] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);

	// Mock data for now - replace with actual API call
	useEffect(() => {
		// Simulate API call
		setTimeout(() => {
			const mockRecipes = [
				{
					id: 1,
					name: "Basic Bread Dough",
					description: "Standard bread dough recipe",
					produces_item: { name: "Bread Dough", id: 3 },
					yield_quantity: 2.5,
					yield_unit: { name: "Kilogram", abbreviation: "kg" },
					total_cost: 7.25,
					cost_per_unit: 2.9,
					component_count: 4,
				},
				{
					id: 2,
					name: "Pizza Sauce",
					description: "Homemade pizza sauce",
					produces_item: { name: "Pizza Sauce", id: 4 },
					yield_quantity: 1.0,
					yield_unit: { name: "Liter", abbreviation: "L" },
					total_cost: 3.5,
					cost_per_unit: 3.5,
					component_count: 6,
				},
			];
			setRecipes(mockRecipes);
			setFilteredRecipes(mockRecipes);
			setLoading(false);
		}, 1000);
	}, []);

	useEffect(() => {
		const filtered = recipes.filter(
			(recipe) =>
				recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				recipe.produces_item.name
					.toLowerCase()
					.includes(searchTerm.toLowerCase())
		);
		setFilteredRecipes(filtered);
	}, [searchTerm, recipes]);

	if (loading) {
		return (
			<MainLayout
				title="Recipes"
				backTo="/cogs"
			>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading recipes...</p>
					</div>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout
			title="Recipes"
			backTo="/cogs"
		>
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row gap-4 justify-between">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search recipes..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>

					<Link to="/cogs/recipes/new">
						<Button className="flex items-center space-x-2">
							<PlusCircle className="h-4 w-4" />
							<span>Add New Recipe</span>
						</Button>
					</Link>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center space-x-2">
							<ChefHat className="h-5 w-5" />
							<span>Recipes ({filteredRecipes.length})</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{filteredRecipes.length === 0 ? (
							<div className="text-center py-8">
								<ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">
									{searchTerm
										? "No recipes found matching your search."
										: "No recipes found."}
								</p>
								{!searchTerm && (
									<Link to="/cogs/recipes/new">
										<Button className="mt-4">Create Your First Recipe</Button>
									</Link>
								)}
							</div>
						) : (
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
														<div className="text-sm text-muted-foreground">
															{recipe.description}
														</div>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{recipe.produces_item.name}
												</Badge>
											</TableCell>
											<TableCell>
												{recipe.yield_quantity} {recipe.yield_unit.abbreviation}
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{recipe.component_count} items
												</Badge>
											</TableCell>
											<TableCell>
												${recipe.total_cost?.toFixed(2) || "0.00"}
											</TableCell>
											<TableCell>
												${recipe.cost_per_unit?.toFixed(4) || "0.0000"}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end space-x-2">
													<Link to={`/cogs/recipes/edit/${recipe.id}`}>
														<Button
															variant="outline"
															size="sm"
														>
															<Edit className="h-4 w-4" />
														</Button>
													</Link>
													<Button
														variant="destructive"
														size="sm"
													>
														<Trash2 className="h-4 w-4" />
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
		</MainLayout>
	);
};

export default RecipesPage;
