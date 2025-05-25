import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "../../components/ui/card";
import {
	Ruler,
	Archive,
	BookOpen,
	PackageSearch,
	TrendingUp,
} from "lucide-react";
import MainLayout from "../layout/MainLayout";

const cogsSections = [
	{
		title: "Units of Measure",
		description: "Manage units like kg, g, L, piece.",
		link: "/cogs/units-of-measure",
		icon: Ruler,
		color: "bg-blue-50 text-blue-600 border-blue-200",
	},
	{
		title: "Inventory Items",
		description: "Manage raw materials, packaging, and prepared goods.",
		link: "/cogs/inventory-items",
		icon: Archive,
		color: "bg-green-50 text-green-600 border-green-200",
	},
	{
		title: "Recipes",
		description: "Define recipes for prepared goods/sub-assemblies.",
		link: "/cogs/recipes",
		icon: BookOpen,
		color: "bg-purple-50 text-purple-600 border-purple-200",
	},
	{
		title: "Product COGS Definitions",
		description: "Define COGS for final sellable products.",
		link: "/cogs/product-definitions",
		icon: PackageSearch,
		color: "bg-orange-50 text-orange-600 border-orange-200",
	},
];

const CogsDashboardPage = () => {
	return (
		<MainLayout
			title="Cost of Goods Sold (COGS) Management"
			showBackButton={true}
			backTo="/dashboard"
		>
			<div className="space-y-6">
				<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
					<div className="flex items-start space-x-4">
						<div className="bg-blue-100 p-3 rounded-lg">
							<TrendingUp className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-blue-900 mb-2">
								COGS Management Overview
							</h2>
							<p className="text-blue-700 leading-relaxed">
								Manage all aspects of your cost of goods sold, from basic units
								and inventory items to complex recipes and final product
								costings. Accurate COGS data is crucial for understanding
								profitability and making informed pricing decisions.
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
					{cogsSections.map((section) => (
						<Card
							key={section.title}
							className="hover:shadow-lg transition-shadow duration-200"
						>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
								<div className="space-y-1">
									<CardTitle className="text-xl font-semibold">
										{section.title}
									</CardTitle>
									<CardDescription className="text-sm">
										{section.description}
									</CardDescription>
								</div>
								<div className={`p-3 rounded-lg border ${section.color}`}>
									<section.icon className="h-6 w-6" />
								</div>
							</CardHeader>
							<CardContent>
								<Link to={section.link}>
									<Button
										variant="outline"
										className="w-full"
									>
										Manage {section.title}
									</Button>
								</Link>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
					<div className="flex items-center space-x-2">
						<div className="bg-amber-100 p-2 rounded">
							<TrendingUp className="h-4 w-4 text-amber-600" />
						</div>
						<div>
							<h3 className="font-medium text-amber-900">Getting Started</h3>
							<p className="text-sm text-amber-700">
								Start by setting up your Units of Measure, then add Inventory
								Items, create Recipes for prepared goods, and finally define
								Product COGS.
							</p>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default CogsDashboardPage;
