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
import { PlusCircle, Search, Edit, Trash2, Package2 } from "lucide-react";
import MainLayout from "../layout/MainLayout";

const ProductCogsDefinitionsPage = () => {
	const [definitions, setDefinitions] = useState([]);
	const [filteredDefinitions, setFilteredDefinitions] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);

	// Mock data for now - replace with actual API call
	useEffect(() => {
		// Simulate API call
		setTimeout(() => {
			const mockDefinitions = [
				{
					id: 1,
					product: { id: 1, name: "Artisan Bread Loaf", sku: "BREAD-001" },
					waste_factor_percentage: 5.0,
					total_cost: 4.25,
					component_count: 3,
					notes: "Standard bread with packaging",
					last_updated: "2024-01-15",
				},
				{
					id: 2,
					product: { id: 2, name: "Margherita Pizza", sku: "PIZZA-MAR" },
					waste_factor_percentage: 8.0,
					total_cost: 6.75,
					component_count: 5,
					notes: "Includes dough, sauce, cheese, and packaging",
					last_updated: "2024-01-12",
				},
			];
			setDefinitions(mockDefinitions);
			setFilteredDefinitions(mockDefinitions);
			setLoading(false);
		}, 1000);
	}, []);

	useEffect(() => {
		const filtered = definitions.filter(
			(def) =>
				def.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				def.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
				def.notes?.toLowerCase().includes(searchTerm.toLowerCase())
		);
		setFilteredDefinitions(filtered);
	}, [searchTerm, definitions]);

	if (loading) {
		return (
			<MainLayout
				title="Product COGS Definitions"
				backTo="/cogs"
			>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">
							Loading product COGS definitions...
						</p>
					</div>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout
			title="Product COGS Definitions"
			backTo="/cogs"
		>
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row gap-4 justify-between">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search product definitions..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Link to="/cogs/product-definitions/new">
						<Button className="flex items-center space-x-2">
							<PlusCircle className="h-4 w-4" />
							<span>Add New Product COGS Definition</span>
						</Button>
					</Link>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center space-x-2">
							<Package2 className="h-5 w-5" />
							<span>
								Product COGS Definitions ({filteredDefinitions.length})
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{filteredDefinitions.length === 0 ? (
							<div className="text-center py-8">
								<Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">
									{searchTerm
										? "No product definitions found matching your search."
										: "No product COGS definitions found."}
								</p>
								{!searchTerm && (
									<Link to="/cogs/product-definitions/new">
										<Button className="mt-4">
											Create Your First Definition
										</Button>
									</Link>
								)}
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Product</TableHead>
										<TableHead>SKU</TableHead>
										<TableHead>Components</TableHead>
										<TableHead>Waste Factor</TableHead>
										<TableHead>Total Cost</TableHead>
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
														{definition.product.name}
													</div>
													{definition.notes && (
														<div className="text-sm text-muted-foreground">
															{definition.notes}
														</div>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{definition.product.sku}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{definition.component_count} items
												</Badge>
											</TableCell>
											<TableCell>
												{definition.waste_factor_percentage}%
											</TableCell>
											<TableCell>
												${definition.total_cost?.toFixed(2) || "0.00"}
											</TableCell>
											<TableCell>
												{new Date(definition.last_updated).toLocaleDateString()}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end space-x-2">
													<Link
														to={`/cogs/product-definitions/edit/${definition.id}`}
													>
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
		</MainLayout>
	);
};

export default ProductCogsDefinitionsPage;
