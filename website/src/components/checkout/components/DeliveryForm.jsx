// src/components/checkout/components/DeliveryForm.jsx
import React from "react";
import { FaArrowLeft } from "react-icons/fa";

const DeliveryForm = ({
	formData,
	handleChange,
	handleRadioChange,
	prevStep,
	nextStep,
}) => {
	return (
		<div className="bg-white rounded-lg shadow-md p-6">
			<h2 className="text-xl font-semibold mb-6">Delivery Information</h2>

			<div className="mb-6">
				<h3 className="font-medium mb-3">Delivery Method</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div
						className={`border rounded-lg p-4 cursor-pointer transition-colors ${
							formData.delivery_method === "pickup"
								? "border-green-500 bg-green-50"
								: "border-gray-200 hover:border-gray-300"
						}`}
						onClick={() => handleRadioChange("delivery_method", "pickup")}
					>
						<div className="flex items-center">
							<div
								className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
									formData.delivery_method === "pickup"
										? "border-green-500"
										: "border-gray-300"
								}`}
							>
								{formData.delivery_method === "pickup" && (
									<div className="w-3 h-3 rounded-full bg-green-500"></div>
								)}
							</div>
							<div>
								<p className="font-medium">Pickup</p>
								<p className="text-sm text-gray-500">Ready in 15-20 minutes</p>
							</div>
						</div>
					</div>

					<div
						className={`border rounded-lg p-4 cursor-pointer transition-colors ${
							formData.delivery_method === "delivery"
								? "border-green-500 bg-green-50"
								: "border-gray-200 hover:border-gray-300"
						}`}
						onClick={() => handleRadioChange("delivery_method", "delivery")}
					>
						<div className="flex items-center">
							<div
								className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
									formData.delivery_method === "delivery"
										? "border-green-500"
										: "border-gray-300"
								}`}
							>
								{formData.delivery_method === "delivery" && (
									<div className="w-3 h-3 rounded-full bg-green-500"></div>
								)}
							</div>
							<div>
								<p className="font-medium">Delivery</p>
								<p className="text-sm text-gray-500">
									30-45 minutes, $3.99 fee
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
				<div className="mb-4">
					<label className="block text-gray-700 text-sm font-medium mb-2">
						First Name
					</label>
					<input
						type="text"
						name="first_name"
						value={formData.first_name}
						onChange={handleChange}
						required
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
					/>
				</div>

				<div className="mb-4">
					<label className="block text-gray-700 text-sm font-medium mb-2">
						Last Name
					</label>
					<input
						type="text"
						name="last_name"
						value={formData.last_name}
						onChange={handleChange}
						required
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
					/>
				</div>
			</div>

			<div className="mb-4">
				<label className="block text-gray-700 text-sm font-medium mb-2">
					Email
				</label>
				<input
					type="email"
					name="email"
					value={formData.email}
					onChange={handleChange}
					required
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
				/>
			</div>

			<div className="mb-4">
				<label className="block text-gray-700 text-sm font-medium mb-2">
					Phone Number
				</label>
				<input
					type="tel"
					name="phone"
					value={formData.phone}
					onChange={handleChange}
					required
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
				/>
			</div>

			{formData.delivery_method === "delivery" && (
				<>
					<div className="mb-4">
						<label className="block text-gray-700 text-sm font-medium mb-2">
							Address
						</label>
						<input
							type="text"
							name="address"
							value={formData.address}
							onChange={handleChange}
							required={formData.delivery_method === "delivery"}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							placeholder="Street address"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<div>
							<label className="block text-gray-700 text-sm font-medium mb-2">
								City
							</label>
							<input
								type="text"
								name="city"
								value={formData.city}
								onChange={handleChange}
								required={formData.delivery_method === "delivery"}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>

						<div>
							<label className="block text-gray-700 text-sm font-medium mb-2">
								State
							</label>
							<input
								type="text"
								name="state"
								value={formData.state}
								onChange={handleChange}
								required={formData.delivery_method === "delivery"}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>

						<div>
							<label className="block text-gray-700 text-sm font-medium mb-2">
								Zip Code
							</label>
							<input
								type="text"
								name="postalCode"
								value={formData.postalCode}
								onChange={handleChange}
								required={formData.delivery_method === "delivery"}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
								pattern="[0-9]{5}"
								title="Five digit zip code"
							/>
						</div>
					</div>
				</>
			)}

			<div className="mb-4">
				<label className="block text-gray-700 text-sm font-medium mb-2">
					Special Instructions (optional)
				</label>
				<textarea
					name="notes"
					value={formData.notes}
					onChange={handleChange}
					rows="3"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
					placeholder="Allergies, delivery instructions, etc."
				></textarea>
			</div>

			<div className="mt-8 flex justify-between">
				<button
					onClick={prevStep}
					className="text-gray-600 hover:text-gray-800 flex items-center"
				>
					<FaArrowLeft className="mr-2" /> Back to Cart
				</button>
				<button
					onClick={nextStep}
					className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors"
				>
					Continue to Payment
				</button>
			</div>
		</div>
	);
};

export default DeliveryForm;
