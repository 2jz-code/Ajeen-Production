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
import { PlusCircle, Search, Edit, Trash2, Package } from "lucide-react";
import MainLayout from "../layout/MainLayout";

const InventoryItemsPage = () => {
	const [inventoryItems, setInventoryItems] = useState([]);
	const [filteredItems, setFilteredItems] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);

	// Mock data for now - replace with actual API call
	useEffect(() => {
		// Simulate API call
		setTimeout(() => {
			const mockItems = [
				{
					id: 1,
					name: "Flour",
					item_type: "RAW_MATERIAL",
					costing_unit: { name: "Kilogram", abbreviation: "kg" },
					current_cost_per_unit: 2.5,
					latest_purchase_price: 25.0,
					latest_purchase_quantity: 10,
				},
				{
					id: 2,
					name: "Plastic Bag",
					item_type: "PACKAGING",
					costing_unit: { name: "Piece", abbreviation: "pc" },
					current_cost_per_unit: 0.15,
					latest_purchase_price: 15.0,
					latest_purchase_quantity: 100,
				},
				{
					id: 3,
					name: "Bread Dough",
					item_type: "PREPARED_GOOD",
					costing_unit: { name: "Kilogram", abbreviation: "kg" },
					current_cost_per_unit: 3.75,
					latest_purchase_price: null,
					latest_purchase_quantity: null,
				},
			];
			setInventoryItems(mockItems);
			setFilteredItems(mockItems);
			setLoading(false);
		}, 1000);
	}, []);

	useEffect(() => {
		const filtered = inventoryItems.filter(
			(item) =>
				item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.item_type.toLowerCase().includes(searchTerm.toLowerCase())
		);
		setFilteredItems(filtered);
	}, [searchTerm, inventoryItems]);

	const getItemTypeLabel = (type) => {
		const types = {
			RAW_MATERIAL: "Raw Material",
			PACKAGING: "Packaging",
			PREPARED_GOOD: "Prepared Good",
			OTHER_DIRECT_COST: "Other Direct Cost",
		};
		return types[type] || type;
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

	if (loading) {
		return (
			<MainLayout
				title="Inventory Items"
				backTo="/cogs"
			>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading inventory items...</p>
					</div>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout
			title="Inventory Items"
			backTo="/cogs"
		>
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row gap-4 justify-between">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search inventory items..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Link to="/cogs/inventory-items/new">
						<Button className="flex items-center space-x-2">
							<PlusCircle className="h-4 w-4" />
							<span>Add New Inventory Item</span>
						</Button>
					</Link>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center space-x-2">
							<Package className="h-5 w-5" />
							<span>Inventory Items ({filteredItems.length})</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{filteredItems.length === 0 ? (
							<div className="text-center py-8">
								<Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground">
									{searchTerm
										? "No inventory items found matching your search."
										: "No inventory items found."}
								</p>
								{!searchTerm && (
									<Link to="/cogs/inventory-items/new">
										<Button className="mt-4">Add Your First Item</Button>
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
											<TableCell>{item.costing_unit.abbreviation}</TableCell>
											<TableCell>
												${item.current_cost_per_unit?.toFixed(4) || "0.0000"}
											</TableCell>
											<TableCell>
												{item.latest_purchase_price ? (
													<div className="text-sm">
														<div>${item.latest_purchase_price.toFixed(2)}</div>
														<div className="text-muted-foreground">
															{item.latest_purchase_quantity}{" "}
															{item.costing_unit.abbreviation}
														</div>
													</div>
												) : (
													<span className="text-muted-foreground">N/A</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end space-x-2">
													<Link to={`/cogs/inventory-items/edit/${item.id}`}>
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
			</div>
		</MainLayout>
	);
};

export default InventoryItemsPage;
