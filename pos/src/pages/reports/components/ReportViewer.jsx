import { useRef } from "react";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	Download,
	FileText,
	AlertTriangle,
	TrendingUp,
	Package,
	CreditCard,
	Clock,
	// Calendar,
	DollarSign,
	// Users, // For order source
	// ShoppingCart, // For avg items per order
} from "lucide-react";

/**
 * ReportViewer Component
 *
 * Displays generated report data with charts and tables. Includes export functionality.
 * Updated to align with new backend data structures from reports/utils.py.
 */
const ReportViewer = ({ data, type, onBack }) => {
	const reportRef = useRef(null);

	const formatCurrency = (amount) => {
		const numAmount = Number(amount);
		if (isNaN(numAmount) || amount === null || amount === undefined) {
			// Added null/undefined check
			return "$ --";
		}
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(numAmount);
	};

	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		try {
			// Handle potential ISO datetime strings from backend
			const date = new Date(
				dateString.includes("T") ? dateString : dateString + "T00:00:00"
			);
			if (isNaN(date.getTime())) return dateString; // Return original if still invalid
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
			//eslint-disable-next-line
		} catch (e) {
			return dateString; // Fallback for unexpected formats
		}
	};

	const exportAsPDF = async () => {
		if (!reportRef.current) return;
		try {
			const canvas = await html2canvas(reportRef.current, {
				scale: 2,
				logging: false,
				useCORS: true,
			});
			const imgData = canvas.toDataURL("image/png");
			const pdf = new jsPDF("p", "mm", "a4");
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();
			const imgWidth = canvas.width;
			const imgHeight = canvas.height;
			const ratio = Math.min(
				(pdfWidth - 20) / imgWidth,
				(pdfHeight - 40) / imgHeight
			);
			const imgX = (pdfWidth - imgWidth * ratio) / 2;
			const imgY = 20;

			pdf.setFontSize(16);
			pdf.text(getReportTitle(type), pdfWidth / 2, 15, { align: "center" });

			pdf.addImage(
				imgData,
				"PNG",
				imgX,
				imgY,
				imgWidth * ratio,
				imgHeight * ratio
			);
			pdf.save(`report-${type}-${new Date().toISOString().split("T")[0]}.pdf`);
		} catch (error) {
			console.error("Error exporting PDF:", error);
			alert("Failed to export as PDF. Please try again.");
		}
	};

	const exportAsCSV = () => {
		let csvContent = "data:text/csv;charset=utf-8,";
		let headers = [];
		let exportData = [];

		if (!data || !data.summary) {
			alert("No data to export.");
			return;
		}

		// Common handling for potentially missing data arrays
		const reportDataItems = data.data || [];
		const productItems = data.products || [];
		// const categoryItems = data.categories || [];
		const hourlyItems = data.hourly_data || [];
		// const dailyItems = data.daily_data || [];

		if (
			type === "sales" ||
			type === "daily_sales" ||
			type === "weekly_sales" ||
			type === "monthly_sales"
		) {
			headers = [
				"Date",
				"Order Count",
				"Subtotal",
				"Discount",
				"Surcharge",
				"Tax",
				"Tip",
				"Total Revenue",
				"Average Order Value",
				"Cumulative Total Revenue",
			];
			exportData = reportDataItems.map((item) => [
				item.date,
				item.order_count,
				item.subtotal,
				item.discount,
				item.surcharge,
				item.tax,
				item.tip,
				item.total_revenue,
				item.avg_order_value,
				item.cumulative_total_revenue,
			]);
		} else if (type === "product" || type === "product_performance") {
			headers = [
				"Product Name",
				"Category",
				"Quantity Sold",
				"Revenue",
				"Average Price Sold",
			];
			exportData = productItems.map((item) => [
				`"${item.product_name.replace(/"/g, '""')}"`,
				item.category,
				item.quantity_sold,
				item.revenue,
				item.avg_price_sold,
			]);
			// Optionally, add categories breakdown to CSV or make it a separate export
		} else if (type === "payment" || type === "payment_analytics") {
			const isPaymentMethodBased = reportDataItems[0]?.payment_method;
			headers = [
				isPaymentMethodBased ? "Payment Method" : "Date",
				"Transaction Count",
				"Total Amount",
				"Refund Count",
				"Failed Count",
				"Voided Count",
				"Success Rate",
			];
			exportData = reportDataItems.map((item) => [
				item.payment_method || item.date,
				item.transaction_count,
				item.total_amount,
				item.refund_count,
				item.failed_count || 0,
				item.void_count || 0,
				item.success_rate,
			]);
		} else if (type === "operational" || type === "operational_insights") {
			// For operational, we can choose to export hourly, daily, or day_of_week_summary
			// Here, exporting hourly_data as per original, but extended with new fields
			headers = [
				"Hour",
				"Order Count",
				"Revenue",
				"Average Order Value",
				"Subtotal",
				"Tax",
				"Discount",
				"Tip",
				"Surcharge",
			];
			exportData = hourlyItems.map((item) => [
				item.hour,
				item.order_count,
				item.revenue,
				item.avg_order_value,
				item.subtotal,
				item.tax,
				item.discount,
				item.tip,
				item.surcharge,
			]);
			// To export daily_data:
			// headers = ["Date", "Day of Week", "Order Count", "Revenue", "Subtotal", "Tax", "Discount", "Tip", "Surcharge", "Avg Items/Order"];
			// exportData = dailyItems.map((item) => [ item.date, item.day_of_week, item.order_count, item.revenue, item.subtotal, item.tax, item.discount, item.tip, item.surcharge, item.avg_items_per_order ]);
		}

		csvContent += headers.join(",") + "\n";
		exportData.forEach((row) => {
			csvContent +=
				row
					.map((val) =>
						typeof val === "string" && val.includes(",") ? `"${val}"` : val
					)
					.join(",") + "\n";
		});

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute(
			"download",
			`report-${type}-${new Date().toISOString().split("T")[0]}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const COLORS = [
		"#3b82f6",
		"#10b981",
		"#8b5cf6",
		"#f59e0b",
		"#ef4444",
		"#6366f1",
		"#ec4899",
		"#06b6d4",
		"#f97316",
		"#d946ef",
	];

	const getReportTitle = (reportType) => {
		switch (reportType) {
			case "sales":
			case "daily_sales":
			case "weekly_sales":
			case "monthly_sales":
				return "Sales Report";
			case "product":
			case "product_performance":
				return "Product Performance Report";
			case "payment":
			case "payment_analytics":
				return "Payment Analytics Report";
			case "operational":
			case "operational_insights":
				return "Operational Insights Report";
			default:
				return "Report";
		}
	};

	const validateReportData = (reportData) => {
		if (
			!reportData ||
			typeof reportData.summary !== "object" ||
			reportData.summary === null
		) {
			console.error(
				"Invalid report data: missing or invalid summary section",
				reportData
			);
			return false;
		}
		if (!reportData.summary.period_start || !reportData.summary.period_end) {
			console.warn(
				"Report data missing period information",
				reportData.summary
			);
			// Allow rendering if other summary data is present, period is for display
		}
		return true;
	};

	const SummaryCard = ({ title, value, subValue = null, icon: Icon }) => (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<p className="text-sm font-medium text-muted-foreground">{title}</p>
						<p className="text-2xl font-bold">{value ?? "N/A"}</p>
						{subValue && (
							<p className="text-xs text-muted-foreground">{subValue}</p>
						)}
					</div>
					{Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
				</div>
			</CardContent>
		</Card>
	);

	const ChartContainer = ({ children, title }) => (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-lg">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-[300px] w-full">{children}</div>
			</CardContent>
		</Card>
	);

	const CustomTooltipContent = ({
		active,
		payload,
		label,
		formatter,
		nameMap,
	}) => {
		if (active && payload && payload.length) {
			return (
				<div className="rounded-lg border bg-background p-2 shadow-md">
					<p className="font-medium mb-1">{label}</p>
					{payload.map((entry, index) => (
						<p
							key={`item-${index}`}
							style={{ color: entry.color || entry.payload.fill }} // Use fill from payload if direct color not on entry
							className="text-sm"
						>
							{`${
								nameMap && nameMap[entry.name]
									? nameMap[entry.name]
									: entry.name
							}: ${formatter ? formatter(entry.value) : entry.value}`}
						</p>
					))}
				</div>
			);
		}
		return null;
	};

	SummaryCard.propTypes = {
		title: PropTypes.string.isRequired,
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Value can be undefined/null
		subValue: PropTypes.string,
		icon: PropTypes.elementType,
	};

	ChartContainer.propTypes = {
		children: PropTypes.node.isRequired,
		title: PropTypes.string.isRequired,
	};

	CustomTooltipContent.propTypes = {
		active: PropTypes.bool,
		payload: PropTypes.arrayOf(PropTypes.object),
		label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		formatter: PropTypes.func,
		nameMap: PropTypes.object,
	};

	const renderSalesReport = () => (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				<SummaryCard
					title="Total Orders"
					value={data.summary.total_orders ?? 0}
					icon={Package}
				/>
				<SummaryCard
					title="Total Revenue"
					value={formatCurrency(data.summary.total_revenue)}
					icon={DollarSign}
				/>
				<SummaryCard
					title="Total Subtotal"
					value={formatCurrency(data.summary.total_subtotal)}
					icon={DollarSign}
				/>
				<SummaryCard
					title="Total Discounts"
					value={formatCurrency(data.summary.total_discount)}
					icon={DollarSign}
				/>
				<SummaryCard
					title="Total Surcharges"
					value={formatCurrency(data.summary.total_surcharge)}
					icon={DollarSign}
				/>
				<SummaryCard
					title="Total Tax"
					value={formatCurrency(data.summary.total_tax)}
					icon={DollarSign}
				/>
				<SummaryCard
					title="Total Tips"
					value={formatCurrency(data.summary.total_tip)}
					icon={DollarSign}
				/>
				<SummaryCard
					title="Avg. Order Value"
					value={formatCurrency(data.summary.avg_order_value)}
					icon={DollarSign}
				/>
			</div>

			<ChartContainer title="Sales Trend">
				<ResponsiveContainer
					width="100%"
					height="100%"
				>
					<LineChart
						data={data.data}
						margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							className="stroke-muted"
						/>
						<XAxis
							dataKey="date"
							className="text-xs"
							tickFormatter={formatDate}
						/>
						<YAxis
							yAxisId="left"
							orientation="left"
							className="text-xs"
							tickFormatter={formatCurrency}
						/>
						<YAxis
							yAxisId="right"
							orientation="right"
							className="text-xs"
						/>
						<Tooltip
							content={
								<CustomTooltipContent
									formatter={formatCurrency}
									nameMap={{
										total_revenue: "Total Revenue",
										order_count: "Orders",
									}}
								/>
							}
						/>
						<Legend />
						<Line
							yAxisId="left"
							type="monotone"
							dataKey="total_revenue"
							name="Total Revenue"
							stroke={COLORS[0]}
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 6 }}
						/>
						<Line
							yAxisId="right"
							type="monotone"
							dataKey="order_count"
							name="Orders"
							stroke={COLORS[1]}
							strokeWidth={2}
							dot={{ r: 3 }}
							activeDot={{ r: 6 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</ChartContainer>

			<Card>
				<CardHeader>
					<CardTitle>Sales Breakdown</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="border-b bg-muted/50">
								<tr>
									<th className="text-left p-4 font-medium">Date</th>
									<th className="text-right p-4 font-medium">Orders</th>
									<th className="text-right p-4 font-medium">Subtotal</th>
									<th className="text-right p-4 font-medium">Discount</th>
									<th className="text-right p-4 font-medium">Surcharge</th>
									<th className="text-right p-4 font-medium">Tax</th>
									<th className="text-right p-4 font-medium">Tip</th>
									<th className="text-right p-4 font-medium">Total Revenue</th>
									<th className="text-right p-4 font-medium">
										Avg. Order Value
									</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{(data.data || []).map((item, index) => (
									<tr
										key={index}
										className="hover:bg-muted/50"
									>
										<td className="p-4 font-medium">{formatDate(item.date)}</td>
										<td className="p-4 text-right">{item.order_count}</td>
										<td className="p-4 text-right">
											{formatCurrency(item.subtotal)}
										</td>
										<td className="p-4 text-right">
											{formatCurrency(item.discount)}
										</td>
										<td className="p-4 text-right">
											{formatCurrency(item.surcharge)}
										</td>
										<td className="p-4 text-right">
											{formatCurrency(item.tax)}
										</td>
										<td className="p-4 text-right">
											{formatCurrency(item.tip)}
										</td>
										<td className="p-4 text-right font-medium">
											{formatCurrency(item.total_revenue)}
										</td>
										<td className="p-4 text-right">
											{formatCurrency(item.avg_order_value)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const renderProductReport = () => (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<SummaryCard
					title="Total Items Sold"
					value={data.summary.total_items_sold ?? 0}
					icon={Package}
				/>
				<SummaryCard
					title="Total Product Revenue"
					value={formatCurrency(data.summary.total_product_revenue)}
					icon={DollarSign}
				/>
				<SummaryCard
					title="Top Product"
					value={data.summary.top_product_name || "N/A"}
					subValue={`Category: ${data.summary.top_category_name || "N/A"}`}
					icon={TrendingUp}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<ChartContainer title="Top Products (by Revenue)">
					<ResponsiveContainer
						width="100%"
						height="100%"
					>
						<BarChart
							data={(data.products || []).slice(0, 10)}
							layout="vertical"
							margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								className="stroke-muted"
							/>
							<XAxis
								type="number"
								className="text-xs"
								tickFormatter={formatCurrency}
							/>
							<YAxis
								dataKey="product_name"
								type="category"
								width={100}
								className="text-xs"
								interval={0}
							/>
							<Tooltip
								content={
									<CustomTooltipContent
										formatter={formatCurrency}
										nameMap={{ revenue: "Revenue", quantity_sold: "Qty Sold" }}
									/>
								}
							/>
							<Legend />
							<Bar
								dataKey="revenue"
								name="Revenue"
								fill={COLORS[0]}
								barSize={15}
							/>
						</BarChart>
					</ResponsiveContainer>
				</ChartContainer>

				<ChartContainer title="Revenue by Category">
					<ResponsiveContainer
						width="100%"
						height="100%"
					>
						<PieChart>
							<Pie
								data={data.categories || []}
								cx="50%"
								cy="50%"
								labelLine={false}
								//eslint-disable-next-line
								label={({ name, percent, revenue }) =>
									`${name} (${(percent * 100).toFixed(0)}%)`
								}
								outerRadius={85}
								fill={COLORS[1]}
								dataKey="revenue"
								nameKey="category"
							>
								{(data.categories || []).map((entry, index) => (
									<Cell
										key={`cell-${index}`}
										fill={COLORS[index % COLORS.length]}
									/>
								))}
							</Pie>
							<Tooltip
								content={<CustomTooltipContent formatter={formatCurrency} />}
							/>
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</ChartContainer>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Product Details</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="border-b bg-muted/50">
								<tr>
									<th className="text-left p-4 font-medium">Product</th>
									<th className="text-left p-4 font-medium">Category</th>
									<th className="text-right p-4 font-medium">Qty Sold</th>
									<th className="text-right p-4 font-medium">
										Avg. Price Sold
									</th>
									<th className="text-right p-4 font-medium">Revenue</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{(data.products || []).map((product) => (
									<tr
										key={product.product_id}
										className="hover:bg-muted/50"
									>
										<td className="p-4 font-medium">{product.product_name}</td>
										<td className="p-4">
											<Badge variant="outline">{product.category}</Badge>
										</td>
										<td className="p-4 text-right">{product.quantity_sold}</td>
										<td className="p-4 text-right">
											{formatCurrency(product.avg_price_sold)}
										</td>
										<td className="p-4 text-right font-medium">
											{formatCurrency(product.revenue)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const renderPaymentReport = () => {
		const reportDataItems = data.data || [];
		const isPaymentMethodBased = reportDataItems[0]?.payment_method;
		return (
			<div className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<SummaryCard
						title="Total Transactions"
						value={data.summary.total_transactions ?? 0}
						icon={CreditCard}
					/>
					<SummaryCard
						title="Total Amount"
						value={formatCurrency(data.summary.total_amount)}
						icon={DollarSign}
					/>
					<SummaryCard
						title="Total Refunds"
						value={data.summary.total_refunds ?? 0}
						subValue={`Rate: ${data.summary.refund_rate?.toFixed(2) ?? 0}%`}
						icon={AlertTriangle}
					/>
					<SummaryCard
						title="Success Rate"
						value={`${data.summary.success_rate?.toFixed(2) ?? 100}%`}
						subValue={`Failed: ${data.summary.total_failed ?? 0} Voided: ${
							data.summary.total_voided ?? 0
						}`}
						icon={TrendingUp}
					/>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{isPaymentMethodBased ? (
						<>
							<ChartContainer title="Distribution by Amount">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<PieChart>
										<Pie
											data={reportDataItems}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ name, percent }) =>
												`${name} (${(percent * 100).toFixed(0)}%)`
											}
											outerRadius={85}
											fill={COLORS[0]}
											dataKey="total_amount"
											nameKey="payment_method"
										>
											{reportDataItems.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip
											content={
												<CustomTooltipContent formatter={formatCurrency} />
											}
										/>{" "}
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>
							<ChartContainer title="Transaction Counts">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<BarChart
										data={reportDataItems}
										margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											className="stroke-muted"
										/>
										<XAxis
											dataKey="payment_method"
											className="text-xs"
										/>
										<YAxis className="text-xs" />
										<Tooltip content={<CustomTooltipContent />} /> <Legend />
										<Bar
											dataKey="transaction_count"
											name="Transactions"
											fill={COLORS[0]}
											barSize={20}
										/>
										<Bar
											dataKey="refund_count"
											name="Refunds"
											fill={COLORS[4]}
											barSize={20}
										/>
										<Bar
											dataKey="failed_count"
											name="Failed"
											fill={COLORS[8]}
											barSize={20}
										/>
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</>
					) : (
						<div className="lg:col-span-2">
							<ChartContainer title="Payment Trend">
								<ResponsiveContainer
									width="100%"
									height="100%"
								>
									<LineChart
										data={reportDataItems}
										margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											className="stroke-muted"
										/>
										<XAxis
											dataKey="date"
											className="text-xs"
											tickFormatter={formatDate}
										/>
										<YAxis
											yAxisId="left"
											orientation="left"
											className="text-xs"
											tickFormatter={formatCurrency}
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
											className="text-xs"
										/>
										<Tooltip
											content={
												<CustomTooltipContent
													formatter={formatCurrency}
													nameMap={{
														total_amount: "Total Amount",
														transaction_count: "Transactions",
													}}
												/>
											}
										/>
										<Legend />
										<Line
											yAxisId="left"
											type="monotone"
											dataKey="total_amount"
											name="Total Amount"
											stroke={COLORS[0]}
											strokeWidth={2}
											dot={{ r: 3 }}
											activeDot={{ r: 6 }}
										/>
										<Line
											yAxisId="right"
											type="monotone"
											dataKey="transaction_count"
											name="Transactions"
											stroke={COLORS[1]}
											strokeWidth={2}
											dot={{ r: 3 }}
											activeDot={{ r: 6 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</ChartContainer>
						</div>
					)}
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Payment Details</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="border-b bg-muted/50">
									<tr>
										<th className="text-left p-4 font-medium">
											{isPaymentMethodBased ? "Payment Method" : "Date"}
										</th>
										<th className="text-right p-4 font-medium">Transactions</th>
										<th className="text-right p-4 font-medium">Total Amount</th>
										<th className="text-right p-4 font-medium">Refunds</th>
										<th className="text-right p-4 font-medium">Failed</th>
										<th className="text-right p-4 font-medium">Voided</th>
										<th className="text-right p-4 font-medium">Success Rate</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{reportDataItems.map((item, index) => (
										<tr
											key={index}
											className="hover:bg-muted/50"
										>
											<td className="p-4 font-medium">
												{isPaymentMethodBased
													? item.payment_method
													: formatDate(item.date)}
											</td>
											<td className="p-4 text-right">
												{item.transaction_count}
											</td>
											<td className="p-4 text-right font-medium">
												{formatCurrency(item.total_amount)}
											</td>
											<td className="p-4 text-right">{item.refund_count}</td>
											<td className="p-4 text-right">
												{item.failed_count ?? 0}
											</td>
											<td className="p-4 text-right">{item.void_count ?? 0}</td>
											<td className="p-4 text-right">
												{item.success_rate?.toFixed(2)}%
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	};

	const renderOperationalReport = () => {
		const hourlyItems = data.hourly_data || [];
		const dailyItems = data.daily_data || [];
		const dayOfWeekSummary = data.day_of_week_summary || [];
		const peakHoursDetail = data.summary?.peak_hours_detail || [];
		// const busiestDaysDetail = data.summary?.busiest_days_detail || []; // Use if needed
		const orderSourceBreakdown = data.summary?.order_source_breakdown || [];

		return (
			<div className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<SummaryCard
						title="Total Orders"
						value={data.summary.total_orders ?? 0}
						icon={Package}
					/>
					<SummaryCard
						title="Total Revenue"
						value={formatCurrency(data.summary.total_revenue)}
						icon={DollarSign}
					/>
					<SummaryCard
						title="Avg. Daily Orders"
						value={data.summary.avg_orders_per_day?.toFixed(1) ?? 0}
						icon={TrendingUp}
					/>
					<SummaryCard
						title="Peak Hour #1"
						value={
							peakHoursDetail[0]
								? `${peakHoursDetail[0].hour} (${peakHoursDetail[0].order_count} orders)`
								: "N/A"
						}
						subValue={
							peakHoursDetail[0]
								? `Revenue: ${formatCurrency(peakHoursDetail[0].revenue)}`
								: ""
						}
						icon={Clock}
					/>
				</div>
				{/* Order Source Breakdown Table/Chart */}
				{orderSourceBreakdown.length > 0 && (
					<ChartContainer title="Order Source Breakdown">
						<ResponsiveContainer
							width="100%"
							height="100%"
						>
							<BarChart
								data={orderSourceBreakdown}
								layout="vertical"
								margin={{ top: 5, right: 20, left: 70, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-muted"
								/>
								<XAxis
									type="number"
									tickFormatter={formatCurrency}
									name="Revenue"
									className="text-xs"
								/>
								<YAxis
									type="category"
									dataKey="source"
									width={70}
									className="text-xs"
									interval={0}
								/>
								<Tooltip
									content={
										<CustomTooltipContent
											formatter={formatCurrency}
											nameMap={{
												total_revenue: "Revenue",
												order_count: "Orders",
											}}
										/>
									}
								/>
								<Legend />
								<Bar
									dataKey="total_revenue"
									name="Revenue"
									fill={COLORS[5]}
									barSize={20}
								/>
								{/* <Bar dataKey="order_count" name="Orders" fill={COLORS[6]} barSize={20} /> Optional second bar */}
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<ChartContainer title="Hourly Trend">
						<ResponsiveContainer
							width="100%"
							height="100%"
						>
							<BarChart
								data={hourlyItems}
								margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-muted"
								/>
								<XAxis
									dataKey="hour"
									className="text-xs"
								/>
								<YAxis
									yAxisId="left"
									orientation="left"
									className="text-xs"
								/>
								<YAxis
									yAxisId="right"
									orientation="right"
									className="text-xs"
									tickFormatter={formatCurrency}
								/>
								<Tooltip
									content={
										<CustomTooltipContent
											formatter={formatCurrency}
											nameMap={{ order_count: "Orders", revenue: "Revenue" }}
										/>
									}
								/>
								<Legend />
								<Bar
									yAxisId="left"
									dataKey="order_count"
									name="Orders"
									fill={COLORS[0]}
									barSize={15}
								/>
								<Bar
									yAxisId="right"
									dataKey="revenue"
									name="Revenue"
									fill={COLORS[1]}
									barSize={15}
								/>
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>

					<ChartContainer title="Day of Week Performance">
						<ResponsiveContainer
							width="100%"
							height="100%"
						>
							<BarChart
								data={dayOfWeekSummary}
								margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-muted"
								/>
								<XAxis
									dataKey="day_of_week"
									className="text-xs"
								/>
								<YAxis
									yAxisId="left"
									orientation="left"
									className="text-xs"
								/>
								<YAxis
									yAxisId="right"
									orientation="right"
									className="text-xs"
									tickFormatter={formatCurrency}
								/>
								<Tooltip
									content={
										<CustomTooltipContent
											formatter={formatCurrency}
											nameMap={{
												avg_order_count: "Avg Orders",
												avg_revenue: "Avg Revenue",
											}}
										/>
									}
								/>
								<Legend />
								<Bar
									yAxisId="left"
									dataKey="avg_order_count"
									name="Avg Orders"
									fill={COLORS[2]}
									barSize={15}
								/>
								<Bar
									yAxisId="right"
									dataKey="avg_revenue"
									name="Avg Revenue"
									fill={COLORS[3]}
									barSize={15}
								/>
							</BarChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Daily Performance</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="border-b bg-muted/50">
									<tr>
										<th className="text-left p-4 font-medium">Date</th>
										<th className="text-left p-4 font-medium">Day</th>
										<th className="text-right p-4 font-medium">Orders</th>
										<th className="text-right p-4 font-medium">Revenue</th>
										<th className="text-right p-4 font-medium">Subtotal</th>
										<th className="text-right p-4 font-medium">Tax</th>
										<th className="text-right p-4 font-medium">Discount</th>
										<th className="text-right p-4 font-medium">Tip</th>
										<th className="text-right p-4 font-medium">Surcharge</th>
										<th className="text-right p-4 font-medium">
											Avg Items/Order
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{dailyItems.map((day, index) => (
										<tr
											key={index}
											className="hover:bg-muted/50"
										>
											<td className="p-4 font-medium">
												{formatDate(day.date)}
											</td>
											<td className="p-4">{day.day_of_week}</td>
											<td className="p-4 text-right">{day.order_count}</td>
											<td className="p-4 text-right font-medium">
												{formatCurrency(day.revenue)}
											</td>
											<td className="p-4 text-right">
												{formatCurrency(day.subtotal)}
											</td>
											<td className="p-4 text-right">
												{formatCurrency(day.tax)}
											</td>
											<td className="p-4 text-right">
												{formatCurrency(day.discount)}
											</td>
											<td className="p-4 text-right">
												{formatCurrency(day.tip)}
											</td>
											<td className="p-4 text-right">
												{formatCurrency(day.surcharge)}
											</td>
											<td className="p-4 text-right">
												{day.avg_items_per_order?.toFixed(2)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	};

	const renderReport = () => {
		// Ensure data and data.summary exist before trying to render specific reports
		if (!data || !data.summary) {
			if (validateReportData(data)) {
				// This will console.error if summary is missing
				// Fallback or specific handling if summary is missing but data might partially exist
				// For now, we rely on the main validation check below.
			}
		}

		switch (type) {
			case "sales":
			case "daily_sales":
			case "weekly_sales":
			case "monthly_sales":
				return renderSalesReport();
			case "product":
			case "product_performance":
				return renderProductReport();
			case "payment":
			case "payment_analytics":
				return renderPaymentReport();
			case "operational":
			case "operational_insights":
				return renderOperationalReport();
			default:
				console.warn("Unknown report type:", type);
				return (
					<div className="text-center py-12">
						<AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Unknown Report Type</h3>
						<p className="text-muted-foreground">
							Cannot display report with type: &quot;{type}&quot;.
						</p>
					</div>
				);
		}
	};

	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<Button
					variant="ghost"
					onClick={onBack}
					className="self-start"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Report Selection
				</Button>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={exportAsPDF}
						disabled={!data || !data.summary}
					>
						<Download className="h-4 w-4 mr-2" />
						Export PDF
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={exportAsCSV}
						disabled={!data || !data.summary}
					>
						<FileText className="h-4 w-4 mr-2" />
						Export CSV
					</Button>
				</div>
			</div>

			{validateReportData(data) ? (
				<>
					<Card>
						<CardContent className="pt-6">
							<div className="text-center space-y-2">
								<h1 className="text-3xl font-bold">{getReportTitle(type)}</h1>
								<p className="text-muted-foreground">
									Period: {formatDate(data.summary.period_start) || "Unknown"}{" "}
									to {formatDate(data.summary.period_end) || "Unknown"}
								</p>
							</div>
						</CardContent>
					</Card>
					<div ref={reportRef}>{renderReport()}</div>
				</>
			) : (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-12">
							<AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								Invalid Report Data
							</h3>
							<p className="text-muted-foreground mb-4">
								The report data structure is invalid, incomplete, or the report
								type is unrecognized.
							</p>
							<Button onClick={onBack}>Back to Reports</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

ReportViewer.propTypes = {
	data: PropTypes.object, // data can be null or undefined if report fails to load
	type: PropTypes.string,
	onBack: PropTypes.func.isRequired,
};

export default ReportViewer;
