"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
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
import axiosInstance from "../../api/config/axiosConfig";
import { COGS_API_ENDPOINTS } from "../../api/config/apiEndpoints";
import MainLayout from "../layout/MainLayout";

const UnitsOfMeasurePage = () => {
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

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [formError, setFormError] = useState(null);

	const fetchUnits = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await axiosInstance.get(
				COGS_API_ENDPOINTS.UNITS_OF_MEASURE
			);
			setUnits(response.data);
			setFilteredUnits(response.data);
		} catch (err) {
			setError(
				err.response?.data?.detail || err.message || "Failed to fetch units."
			);
			console.error("Failed to fetch units:", err);
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
		setLoading(true);
		setFormError(null);
		const dataToSubmit = {
			...formData,
			base_unit_equivalent:
				Number.parseFloat(formData.base_unit_equivalent) || 1.0,
		};

		try {
			if (currentUnit) {
				await axiosInstance.put(
					`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${currentUnit.id}/`,
					dataToSubmit
				);
			} else {
				await axiosInstance.post(
					COGS_API_ENDPOINTS.UNITS_OF_MEASURE,
					dataToSubmit
				);
			}
			fetchUnits();
			closeModal();
		} catch (err) {
			setFormError(
				err.response?.data || { detail: err.message } || {
						detail: "Failed to save unit.",
					}
			);
			console.error("Failed to save unit:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (currentUnit) {
			setLoading(true);
			setFormError(null);
			try {
				await axiosInstance.delete(
					`${COGS_API_ENDPOINTS.UNITS_OF_MEASURE}${currentUnit.id}/`
				);
				fetchUnits();
				closeDeleteConfirm();
			} catch (err) {
				setError(
					err.response?.data?.detail || err.message || "Failed to delete unit."
				);
				console.error("Failed to delete unit:", err);
			} finally {
				setLoading(false);
			}
		}
	};

	if (loading && units.length === 0) {
		return (
			<MainLayout
				title="Units of Measure"
				backTo="/cogs"
			>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading units of measure...</p>
					</div>
				</div>
			</MainLayout>
		);
	}

	if (error && units.length === 0) {
		return (
			<MainLayout
				title="Units of Measure"
				backTo="/cogs"
			>
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<p className="text-red-600">
							Error loading units:{" "}
							{typeof error === "string" ? error : JSON.stringify(error)}
						</p>
					</CardContent>
				</Card>
			</MainLayout>
		);
	}

	return (
		<MainLayout
			title="Units of Measure"
			backTo="/cogs"
		>
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row gap-4 justify-between">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search units..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Button
						onClick={() => openModal()}
						className="flex items-center space-x-2"
					>
						<PlusCircle className="h-4 w-4" />
						<span>Add New Unit</span>
					</Button>
				</div>

				{error && units.length > 0 && (
					<Card className="border-red-200 bg-red-50">
						<CardContent className="pt-6">
							<p className="text-red-600">
								Error:{" "}
								{typeof error === "string" ? error : JSON.stringify(error)}
							</p>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Units of Measure ({filteredUnits.length})</CardTitle>
					</CardHeader>
					<CardContent>
						{filteredUnits.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-muted-foreground">
									{searchTerm
										? "No units found matching your search."
										: "No units of measure found."}
								</p>
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
											<TableCell className="font-medium">{unit.name}</TableCell>
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
												<div className="flex justify-end space-x-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => openModal(unit)}
													>
														<Edit className="h-4 w-4" />
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => openDeleteConfirm(unit)}
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

				{isModalOpen && (
					<Modal
						isOpen={isModalOpen}
						onClose={closeModal}
						title={currentUnit ? "Edit Unit" : "Add New Unit"}
					>
						<form
							onSubmit={handleSubmit}
							className="space-y-4"
						>
							<div>
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									name="name"
									value={formData.name}
									onChange={handleInputChange}
									required
								/>
							</div>
							<div>
								<Label htmlFor="abbreviation">Abbreviation</Label>
								<Input
									id="abbreviation"
									name="abbreviation"
									value={formData.abbreviation}
									onChange={handleInputChange}
									required
								/>
							</div>
							<div>
								<Label htmlFor="base_unit_equivalent">
									Base Unit Equivalent (e.g., 1000 for kg if base is g)
								</Label>
								<Input
									id="base_unit_equivalent"
									name="base_unit_equivalent"
									type="number"
									step="0.0001"
									value={formData.base_unit_equivalent}
									onChange={handleInputChange}
									required
								/>
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
								<Label htmlFor="is_base_unit">
									Is this a base unit itself?
								</Label>
							</div>
							{formError && (
								<Card className="border-red-200 bg-red-50">
									<CardContent className="pt-4">
										<p className="text-red-600 text-sm">
											Error: {formError.detail || "Could not save unit."}
										</p>
										{typeof formError === "object" &&
											!formError.detail &&
											Object.entries(formError).map(([key, value]) => (
												<p
													key={key}
													className="text-red-600 text-sm"
												>
													{key}:{" "}
													{Array.isArray(value) ? value.join(", ") : value}
												</p>
											))}
									</CardContent>
								</Card>
							)}
							<div className="flex justify-end space-x-2 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={closeModal}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={loading}
								>
									{loading ? "Saving..." : "Save Unit"}
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
						title="Confirm Delete"
						message={`Are you sure you want to delete the unit "${currentUnit.name}"? This action cannot be undone.`}
						confirmText="Delete"
						cancelText="Cancel"
						isLoading={loading}
					/>
				)}
			</div>
		</MainLayout>
	);
};

export default UnitsOfMeasurePage;
