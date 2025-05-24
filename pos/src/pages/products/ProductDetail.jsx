// src/pages/products/ProductDetail.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import {
	ArrowLeftIcon,
	ExclamationTriangleIcon,
	PhotoIcon,
	PencilSquareIcon, // Changed from PencilIcon for consistency with EditProduct button
	TagIcon, // For category
	CurrencyDollarIcon, // For price
	Bars3BottomLeftIcon, // For description
	QrCodeIcon,
} from "@heroicons/react/24/outline";
import { PackageIcon } from "lucide-react";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";

export default function ProductDetail() {
	const { name } = useParams();
	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		setError(null);
		axiosInstance
			.get(`products/${encodeURIComponent(name)}/`)
			.then((response) => {
				if (isMounted) setProduct(response.data);
			})
			.catch((err) => {
				console.error("Error fetching product:", err);
				if (isMounted) setError("Failed to load product details.");
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, [name]);

	const pageTitle = product ? product.name : "Product Details";

	if (loading) {
		return (
			<MainLayout pageTitle="Loading Product...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}
	if (error || !product) {
		return (
			<MainLayout pageTitle="Error Loading Product">
				<div className="flex flex-col items-center justify-center h-full p-6 text-center">
					<ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-400" />
					<h1 className="mb-2 text-xl font-semibold text-slate-800">Error</h1>
					<p className="mb-6 text-slate-600">{error || "Product not found."}</p>
					<button
						className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
						onClick={() => navigate("/products")}
					>
						<ArrowLeftIcon className="h-4 w-4" /> Back to Products
					</button>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle={pageTitle}>
			<div className="max-w-3xl mx-auto">
				{" "}
				{/* Centered content */}
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
						<PackageIcon className="h-6 w-6 text-slate-600" />
						{product.name}
					</h2>
					<div className="flex items-center gap-2">
						<button
							onClick={() =>
								navigate(`/products/edit/${encodeURIComponent(product.name)}`)
							}
							className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
						>
							<PencilSquareIcon className="h-4 w-4" /> Edit
						</button>
						<button
							onClick={() => navigate("/products")}
							className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
						>
							<ArrowLeftIcon className="h-4 w-4" /> All Products
						</button>
					</div>
				</div>
				<div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
					<div className="w-full h-60 sm:h-80 bg-slate-200 flex items-center justify-center overflow-hidden">
						{product.image ? (
							<img
								src={product.image}
								alt={product.name}
								className="w-full h-full object-cover"
								onError={(e) => {
									e.target.onerror = null;
									e.target.src = `https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image`;
								}}
							/>
						) : (
							<div className="flex flex-col items-center text-slate-400">
								<PhotoIcon className="h-16 w-16 mb-1" />
								<span className="text-xs">No Image</span>
							</div>
						)}
					</div>
					<div className="p-5 sm:p-6 space-y-4">
						<div>
							<label className="text-xs font-medium text-slate-500 flex items-center gap-1">
								<TagIcon className="h-3.5 w-3.5" />
								Category
							</label>
							<p className="text-sm text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
								{product.category_name || (
									<span className="italic text-slate-400">Uncategorized</span>
								)}
							</p>
						</div>
						<div>
							<label className="text-xs font-medium text-slate-500 flex items-center gap-1">
								<CurrencyDollarIcon className="h-3.5 w-3.5" />
								Price
							</label>
							<p className="text-2xl font-semibold text-blue-600">
								${Number(product.price).toFixed(2)}
							</p>
						</div>
						<div>
							<label className="text-xs font-medium text-slate-500 flex items-center gap-1">
								<Bars3BottomLeftIcon className="h-3.5 w-3.5" />
								Description
							</label>
							<p className="text-sm text-slate-600 leading-relaxed mt-0.5 whitespace-pre-wrap">
								{product.description || (
									<span className="italic text-slate-400">
										No description provided.
									</span>
								)}
							</p>
						</div>
						{product.barcode && (
							<div>
								<label className="text-xs font-medium text-slate-500 flex items-center gap-1">
									<QrCodeIcon className="h-3.5 w-3.5" />
									Barcode
								</label>
								<p className="text-sm text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded inline-block mt-0.5">
									{product.barcode}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
}
// No direct props, PropTypes for the component itself is optional.
