# reports/utils.py
from datetime import datetime, timedelta, date
import json
from django.db.models import (
    Sum,
    Count,
    Avg,
    F,
    Q,
    ExpressionWrapper,
    DecimalField,
    Value,
)
from django.db.models.functions import TruncDate, TruncDay, TruncWeek, TruncMonth
from orders.models import Order, OrderItem  #
from products.models import Product, Category  #
from payments.models import Payment  #
from decimal import Decimal  # Added for consistent decimal calculations


def serialize_report_parameters(params):
    """Convert date objects to ISO format strings in a dictionary."""
    serialized = {}
    for key, value in params.items():
        if isinstance(value, (date, datetime)):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized


class DateTimeEncoder(json.JSONEncoder):
    """JSON encoder that can handle datetime.date and datetime.datetime objects."""

    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


def generate_sales_report(
    start_date,
    end_date,
    group_by="day",
    include_tax=True,
    include_refunds=True,
    date_field="updated_at",
):
    # Convert string dates to datetime if needed
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
        end_date = end_date.replace(hour=23, minute=59, second=59)

    date_filter = {
        f"{date_field}__gte": start_date,
        f"{date_field}__lte": end_date,
        "status": "completed",  #
    }

    query = Order.objects.filter(**date_filter)  #

    if not include_refunds:
        query = query.exclude(payment_status__in=["refunded", "partially_refunded"])  #

    if group_by == "day":
        trunc_func = TruncDay(date_field)  #
        date_format = "%Y-%m-%d"  #
    elif group_by == "week":
        trunc_func = TruncWeek(date_field)  #
        date_format = "Week of %Y-%m-%d"  #
    elif group_by == "month":
        trunc_func = TruncMonth(date_field)  #
        date_format = "%Y-%m"  #
    else:  # Default to day if group_by is invalid
        trunc_func = TruncDay(date_field)
        date_format = "%Y-%m-%d"

    sales_data = (
        query.annotate(
            date_group=trunc_func  # Renamed to avoid conflict with a potential 'date' field in Order model if we switch date_field
        )
        .values("date_group")
        .annotate(
            order_count=Count("id"),
            # Gross Sales (Total Price collected)
            total_revenue_gross=Sum("total_price"),
            # Sum of subtotals from frontend (preferred source for subtotal)
            total_subtotal_frontend=Sum("subtotal_from_frontend"),
            # Sum of tax from frontend (preferred source for tax)
            total_tax_frontend=Sum("tax_amount_from_frontend"),
            total_discount=Sum("discount_amount"),  #
            total_tip=Sum("tip_amount"),  #
            total_surcharge=Sum("surcharge_amount"),  #
        )
        .order_by("date_group")
    )

    formatted_data = []
    cumulative_gross_revenue = Decimal("0.00")
    cumulative_net_revenue = Decimal("0.00")

    for entry in sales_data:
        date_str = entry["date_group"].strftime(date_format)

        order_count = entry["order_count"] or 0
        gross_revenue = Decimal(entry["total_revenue_gross"] or "0.00")

        # Use frontend tax if available, otherwise assume it's part of total_price and needs calculation if include_tax is False
        # For simplicity here, if tax_from_frontend is None, we can't reliably extract net sales without more complex logic
        # or assumptions. The Order model's calculate_total_price prioritizes frontend values.
        tax_amount = Decimal(entry["total_tax_frontend"] or "0.00")  #

        # Subtotal: Use subtotal_from_frontend if available.
        # Otherwise, net revenue (total_price - tax) could be an approximation of subtotal before discounts/tips/surcharges,
        # but this is complex due to the order of operations.
        # The Order model itself calculates total_price = amount_before_tax + tax_amount + current_tip
        # where amount_before_tax = subtotal_after_discount + surcharge_amount
        # and subtotal_after_discount = subtotal - discount_amount.
        # For reporting, `subtotal_from_frontend` is the most direct representation of pre-tax, pre-surcharge, pre-discount sum of items.
        subtotal = Decimal(entry["total_subtotal_frontend"] or "0.00")  #

        discount = Decimal(entry["total_discount"] or "0.00")
        tip = Decimal(entry["total_tip"] or "0.00")
        surcharge = Decimal(entry["total_surcharge"] or "0.00")

        # Net revenue calculation:
        # If total_price includes tax, then net revenue = total_price - tax_amount.
        # However, total_price from the model is the final amount paid.
        # A common definition of "net sales" is revenue after discounts, before tax.
        # Let's define net_revenue as (subtotal_from_frontend - discount_amount + surcharge_amount)
        # Or, if using total_price: (total_price - tax_amount - tip_amount)
        # Let's use the latter as total_price is the sum being aggregated.
        net_revenue = (
            gross_revenue - tax_amount - tip
        )  # Tip is often not part of net revenue for the business
        # Surcharges might be, discounts definitely reduce it.
        # This definition needs to be aligned with business requirements.
        # A more robust net_revenue: subtotal_frontend - discount + surcharge

        # For this example, let's define net_revenue for the report as total_price - tax_amount (if include_tax is false, this would be the value)
        # If include_tax is true, total_revenue in the report is gross_revenue.
        # If include_tax is false, total_revenue in the report is gross_revenue - tax_amount.
        reported_total_revenue = (
            gross_revenue if include_tax else (gross_revenue - tax_amount)
        )

        cumulative_gross_revenue += gross_revenue
        cumulative_net_revenue += (
            reported_total_revenue  # Accumulate the reported revenue
        )

        avg_order_value_calc = (
            reported_total_revenue / order_count if order_count > 0 else Decimal("0.00")
        )

        formatted_entry = {
            "date": date_str,
            "order_count": order_count,
            "subtotal": float(subtotal),  # Sum of subtotal_from_frontend
            "discount": float(discount),
            "surcharge": float(surcharge),
            "tax": float(tax_amount),  # Sum of tax_amount_from_frontend
            "tip": float(tip),
            "total_revenue": float(
                reported_total_revenue
            ),  # This is now gross or net based on include_tax
            "avg_order_value": float(avg_order_value_calc),
            "cumulative_total_revenue": float(
                cumulative_net_revenue
            ),  # Cumulative of what's reported
        }
        formatted_data.append(formatted_entry)

    if not formatted_data:
        return {
            "summary": {
                "period_start": start_date.strftime("%Y-%m-%d"),
                "period_end": end_date.strftime("%Y-%m-%d"),
                "total_orders": 0,
                "total_revenue": 0,  # Based on include_tax
                "total_subtotal": 0,
                "total_discount": 0,
                "total_surcharge": 0,
                "total_tax": 0,
                "total_tip": 0,
                "avg_order_value": 0,
            },
            "data": [],
        }

    total_orders_summary = sum(entry["order_count"] for entry in formatted_data)
    total_revenue_summary = sum(
        Decimal(str(entry["total_revenue"])) for entry in formatted_data
    )  # Use the 'total_revenue' already calculated
    total_subtotal_summary = sum(
        Decimal(str(entry["subtotal"])) for entry in formatted_data
    )
    total_discount_summary = sum(
        Decimal(str(entry["discount"])) for entry in formatted_data
    )
    total_surcharge_summary = sum(
        Decimal(str(entry["surcharge"])) for entry in formatted_data
    )
    total_tax_summary = sum(Decimal(str(entry["tax"])) for entry in formatted_data)
    total_tip_summary = sum(Decimal(str(entry["tip"])) for entry in formatted_data)

    summary = {
        "period_start": start_date.strftime("%Y-%m-%d"),
        "period_end": end_date.strftime("%Y-%m-%d"),
        "total_orders": total_orders_summary,
        "total_subtotal": float(total_subtotal_summary),
        "total_discount": float(total_discount_summary),
        "total_surcharge": float(total_surcharge_summary),
        "total_tax": float(total_tax_summary),
        "total_tip": float(total_tip_summary),
        "total_revenue": float(
            total_revenue_summary
        ),  # This sum is based on include_tax
        "avg_order_value": (
            float(total_revenue_summary / total_orders_summary)
            if total_orders_summary > 0
            else 0
        ),
    }

    return {"summary": summary, "data": formatted_data}


def generate_product_report(
    start_date,
    end_date,
    category=None,
    limit=10,
    sort_by="revenue",
    date_field="updated_at",
):
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
        end_date = end_date.replace(hour=23, minute=59, second=59)

    order_date_filter = {
        f"order__{date_field}__gte": start_date,
        f"order__{date_field}__lte": end_date,
        "order__status": "completed",  #
        # Consider order__payment_status if only 'paid' orders should contribute to product revenue
        # 'order__payment_status': 'paid'
    }

    query = OrderItem.objects.filter(**order_date_filter)  #

    if category:
        query = query.filter(product__category__name=category)  #

    # OrderItem.unit_price should be the price at the time of sale.
    # Order.discount_amount is an order-level discount.
    # For product-level revenue, we use (OrderItem.unit_price * OrderItem.quantity).
    # If product-specific discounts were stored per OrderItem, we'd subtract them here.
    # The current model structure implies discounts are applied to the order total.
    annotated_query = query.annotate(
        item_revenue=ExpressionWrapper(
            F("unit_price") * F("quantity"),
            output_field=DecimalField(max_digits=10, decimal_places=2),  #
        )
    )

    product_data = annotated_query.values(
        "product__id", "product__name", "product__category__name"
    ).annotate(
        quantity_sold=Sum("quantity"),  # Renamed for clarity
        revenue=Sum(
            "item_revenue"
        ),  # This is revenue from items before order-level discounts
        avg_price_sold=Avg("unit_price"),  # Renamed for clarity
    )  #

    if sort_by == "quantity":
        product_data = product_data.order_by("-quantity_sold")  #
    else:
        product_data = product_data.order_by("-revenue")  #

    if limit:
        product_data = product_data[:limit]  #

    formatted_products = []
    for entry in product_data:
        formatted_products.append(
            {
                "product_id": entry["product__id"],  #
                "product_name": entry["product__name"],  #
                "category": entry["product__category__name"] or "Uncategorized",  #
                "quantity_sold": entry["quantity_sold"],  #
                "revenue": float(entry["revenue"] or 0),  #
                "avg_price_sold": float(entry["avg_price_sold"] or 0),  #
            }
        )

    # Category breakdown using the same item_revenue logic
    category_data_query = (
        annotated_query.values("product__category__name")
        .annotate(
            total_quantity_sold=Sum("quantity"), total_revenue=Sum("item_revenue")
        )
        .order_by("-total_revenue")
    )  #

    category_breakdown = []
    for entry in category_data_query:
        category_name = entry["product__category__name"] or "Uncategorized"  #
        category_breakdown.append(
            {
                "category": category_name,  #
                "quantity_sold": entry["total_quantity_sold"],  #
                "revenue": float(entry["total_revenue"] or 0),  #
            }
        )

    # Calculate summary metrics from the limited list of top products
    # total_quantity_summary = sum(p['quantity_sold'] for p in formatted_products)
    # total_revenue_summary = sum(p['revenue'] for p in formatted_products)

    # For a true total, we should sum over the entire `annotated_query` before limiting products for display
    overall_summary_agg = annotated_query.aggregate(
        grand_total_quantity=Sum("quantity"), grand_total_revenue=Sum("item_revenue")
    )
    grand_total_quantity = overall_summary_agg["grand_total_quantity"] or 0
    grand_total_revenue = float(overall_summary_agg["grand_total_revenue"] or 0)

    summary = {
        "period_start": start_date.strftime("%Y-%m-%d"),  #
        "period_end": end_date.strftime("%Y-%m-%d"),  #
        "total_items_sold": grand_total_quantity,  # Total items from all sales in period
        "total_product_revenue": grand_total_revenue,  # Total revenue from all items in period
        "top_product_name": (
            formatted_products[0]["product_name"] if formatted_products else None
        ),  #
        "top_category_name": (
            category_breakdown[0]["category"] if category_breakdown else None
        ),  #
    }

    return {
        "summary": summary,
        "products": formatted_products,
        "categories": category_breakdown,
    }


def generate_payment_report(
    start_date, end_date, group_by="payment_method", date_field="updated_at"
):
    # This function already seems to use the Payment model extensively.
    # The key is to ensure `date_field` is correctly applied if filtering Payments by their own timestamp
    # or by their related Order's timestamp. The current `date_field` applies to the Payment model directly.
    # If we need to filter based on Order's date, the query needs to be `Payment.objects.filter(order__date_field=...)`
    # The existing implementation looks reasonable for payment-centric data.
    # One enhancement could be to link back to Order specific data if needed, e.g. total order amounts associated with payment types.

    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
        end_date = end_date.replace(hour=23, minute=59, second=59)

    # date_filter applies to the Payment model's date_field (e.g., Payment.updated_at)
    date_filter = {
        f"{date_field}__gte": start_date,
        f"{date_field}__lte": end_date,
        # Optionally filter by Payment status, though the report already breaks down by status (failed, refunded)
        # 'status__in': ['succeeded', 'pending', 'failed', 'refunded']
    }

    # Ensure we are only considering payments linked to 'completed' or relevant orders
    # This requires a join to the Order table.
    query = Payment.objects.filter(
        Q(order__status="completed")
        | Q(
            order__status="paid"
        ),  # Consider which order statuses are relevant for payments
        **date_filter,
    ).select_related(
        "order"
    )  # Performance improvement

    # The rest of the logic from the original function seems to correctly analyze Payment records.
    # No major changes needed unless specific Order fields are required per payment method.
    # ... (rest of the original generate_payment_report function) ...
    # For brevity, I'm not repeating the entire original function here as the core logic
    # for payment aggregation remains the same. The key change is the initial query modification.

    # --- Integrating the original payment report logic below ---
    if group_by == "payment_method":
        non_split_data = (
            query.filter(is_split_payment=False)
            .values("payment_method")
            .annotate(
                count=Count("id"),
                total_amount=Sum("amount"),
                refund_count=Count("id", filter=Q(status="refunded")),  #
                failed_count=Count("id", filter=Q(status="failed")),  #
                # void_count should refer to order status if payment is linked to a voided order
                void_count=Count("id", filter=Q(order__status="voided")),  #
                successful_count=Count("id", filter=~Q(status="failed")),  #
            )
        )

        split_data = query.filter(is_split_payment=True).aggregate(  #
            count=Count("id"),
            total_amount=Sum("amount"),
            refund_count=Count("id", filter=Q(status="refunded")),  #
            failed_count=Count("id", filter=Q(status="failed")),  #
            void_count=Count("id", filter=Q(order__status="voided")),  #
            successful_count=Count("id", filter=~Q(status="failed")),  #
        )

        formatted_data = []
        for entry in non_split_data:
            payment_method = entry["payment_method"] or "Unknown"  #
            unsuccessful_count = entry["failed_count"]  #
            success_rate = (
                ((entry["count"] - unsuccessful_count) / entry["count"]) * 100
                if entry["count"] > 0
                else 0
            )  #

            formatted_data.append(
                {
                    "payment_method": payment_method.replace("_", " ").title(),  #
                    "transaction_count": entry["count"],  #
                    "total_amount": float(entry["total_amount"] or 0),  #
                    "refund_count": entry["refund_count"],  #
                    "failed_count": entry["failed_count"],  #
                    "void_count": entry["void_count"],  #
                    "success_rate": round(success_rate, 2),  #
                }
            )

        if split_data["count"] > 0:  #
            unsuccessful_count = split_data["failed_count"]  #
            success_rate = (
                ((split_data["count"] - unsuccessful_count) / split_data["count"]) * 100
                if split_data["count"] > 0
                else 0
            )  #
            formatted_data.append(
                {
                    "payment_method": "Split Payment",  #
                    "transaction_count": split_data["count"],  #
                    "total_amount": float(split_data["total_amount"] or 0),  #
                    "refund_count": split_data["refund_count"],  #
                    "failed_count": split_data["failed_count"],  #
                    "void_count": split_data["void_count"],  #
                    "success_rate": round(success_rate, 2),  #
                }
            )
        formatted_data.sort(key=lambda x: x["total_amount"], reverse=True)  #

    else:  # Group by time period
        if group_by == "day":
            trunc_func = TruncDay(date_field)  #
            date_format_str = "%Y-%m-%d"  # Renamed to avoid conflict
        elif group_by == "week":
            trunc_func = TruncWeek(date_field)  #
            date_format_str = "Week of %Y-%m-%d"  #
        elif group_by == "month":
            trunc_func = TruncMonth(date_field)  #
            date_format_str = "%Y-%m"  #
        else:  # Default to day
            trunc_func = TruncDay(date_field)
            date_format_str = "%Y-%m-%d"

        # Combine processing for non-split and split as they share date grouping
        # This part of the original code was a bit complex with separate non_split and split queries then merging.
        # A simpler way if not needing to distinguish them in the time-grouped output:
        time_grouped_data = (
            query.annotate(date_group=trunc_func)
            .values("date_group")
            .annotate(
                count=Count("id"),
                total_amount=Sum("amount"),
                refund_count=Count("id", filter=Q(status="refunded")),
                failed_count=Count("id", filter=Q(status="failed")),
                void_count=Count("id", filter=Q(order__status="voided")),
                successful_count=Count("id", filter=~Q(status="failed")),
            )
            .order_by("date_group")
        )

        formatted_data = []
        for entry in time_grouped_data:
            date_str_val = entry["date_group"].strftime(date_format_str)
            unsuccessful_count = entry["failed_count"]
            success_rate = (
                ((entry["count"] - unsuccessful_count) / entry["count"]) * 100
                if entry["count"] > 0
                else 0
            )

            formatted_data.append(
                {
                    "date": date_str_val,
                    "transaction_count": entry["count"],
                    "total_amount": float(entry["total_amount"] or 0),
                    "refund_count": entry["refund_count"],
                    "failed_count": entry["failed_count"],
                    "void_count": entry["void_count"],
                    "success_rate": round(success_rate, 2),
                }
            )

    total_transactions = sum(entry["transaction_count"] for entry in formatted_data)  #
    total_payment_amount = sum(
        Decimal(str(entry["total_amount"])) for entry in formatted_data
    )  # Renamed to avoid conflict
    total_refunds = sum(entry["refund_count"] for entry in formatted_data)  #
    total_failed = sum(entry.get("failed_count", 0) for entry in formatted_data)  #
    total_voided = sum(entry.get("void_count", 0) for entry in formatted_data)  #

    refund_rate = (
        (total_refunds / total_transactions) * 100 if total_transactions > 0 else 0
    )  #
    overall_unsuccessful_count = total_failed  #
    success_rate_summary = (
        ((total_transactions - overall_unsuccessful_count) / total_transactions) * 100
        if total_transactions > 0
        else 0
    )  #

    summary = {
        "period_start": start_date.strftime("%Y-%m-%d"),  #
        "period_end": end_date.strftime("%Y-%m-%d"),  #
        "total_transactions": total_transactions,  #
        "total_amount": float(total_payment_amount),  #
        "total_refunds": total_refunds,  #
        "total_failed": total_failed,  #
        "total_voided": total_voided,  #
        "refund_rate": round(refund_rate, 2),  #
        "success_rate": round(success_rate_summary, 2),  #
    }

    return {"summary": summary, "data": formatted_data}


def generate_operational_insights(start_date, end_date, date_field="updated_at"):
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
        end_date = end_date.replace(hour=23, minute=59, second=59)

    date_filter = {
        f"{date_field}__gte": start_date,
        f"{date_field}__lte": end_date,
        "status": "completed",  #
    }

    query = Order.objects.filter(**date_filter)  #

    hourly_data = []
    for hour in range(24):  #
        # Note: date_field here applies to the Order model
        hour_filter = {f"{date_field}__hour": hour}  #
        hour_orders = query.filter(**hour_filter)  #
        order_count = hour_orders.count()  #
        # Using specific fields for revenue, tax, tips, etc.
        agg_results = hour_orders.aggregate(
            revenue=Sum("total_price"),  #
            subtotal=Sum("subtotal_from_frontend"),
            tax=Sum("tax_amount_from_frontend"),
            discount=Sum("discount_amount"),
            tip=Sum("tip_amount"),
            surcharge=Sum("surcharge_amount"),
        )
        revenue = Decimal(agg_results["revenue"] or "0.00")

        hourly_data.append(
            {
                "hour": f"{hour:02d}:00",  #
                "order_count": order_count,  #
                "revenue": float(revenue),  #
                "avg_order_value": (
                    float(revenue / order_count) if order_count > 0 else 0
                ),  #
                "subtotal": float(agg_results["subtotal"] or 0),
                "tax": float(agg_results["tax"] or 0),
                "discount": float(agg_results["discount"] or 0),
                "tip": float(agg_results["tip"] or 0),
                "surcharge": float(agg_results["surcharge"] or 0),
            }
        )

    daily_data_query = (
        query.annotate(date_group=TruncDate(date_field))  # renamed from 'date'
        .values("date_group")
        .annotate(
            order_count=Count("id"),  #
            revenue=Sum("total_price"),  #
            subtotal=Sum("subtotal_from_frontend"),
            tax=Sum("tax_amount_from_frontend"),
            discount=Sum("discount_amount"),
            tip=Sum("tip_amount"),
            surcharge=Sum("surcharge_amount"),
            avg_items_per_order=Avg(
                Count("items")
            ),  # Example of new metric: avg items per order
        )
        .order_by("date_group")
    )  #

    formatted_daily_data = []
    for entry in daily_data_query:
        day_of_week = entry["date_group"].strftime("%A")  #
        formatted_daily_data.append(
            {
                "date": entry["date_group"].strftime("%Y-%m-%d"),  #
                "day_of_week": day_of_week,  #
                "order_count": entry["order_count"],  #
                "revenue": float(entry["revenue"] or 0),  #
                "subtotal": float(entry["subtotal"] or 0),
                "tax": float(entry["tax"] or 0),
                "discount": float(entry["discount"] or 0),
                "tip": float(entry["tip"] or 0),
                "surcharge": float(entry["surcharge"] or 0),
                "avg_items_per_order": round(
                    float(entry["avg_items_per_order"] or 0), 2
                ),
            }
        )

    days_of_week = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]  #
    day_of_week_data_agg = {
        day: {"order_count": 0, "revenue": Decimal("0.00"), "days_counted": 0}
        for day in days_of_week
    }  # Renamed from day_of_week_data

    for entry in formatted_daily_data:
        day = entry["day_of_week"]  #
        day_of_week_data_agg[day]["order_count"] += entry["order_count"]  #
        day_of_week_data_agg[day]["revenue"] += Decimal(str(entry["revenue"]))  #
        day_of_week_data_agg[day]["days_counted"] += 1  # Renamed from 'days'

    day_of_week_summary = []
    for day in days_of_week:  #
        data = day_of_week_data_agg[day]  #
        day_occurrences = data["days_counted"] or 1  # Renamed from day_count

        day_of_week_summary.append(
            {
                "day_of_week": day,  #
                "avg_order_count": round(data["order_count"] / day_occurrences, 2),  #
                "avg_revenue": round(float(data["revenue"] / day_occurrences), 2),  #
            }
        )

    # Order source breakdown
    source_data = (
        query.values("source")
        .annotate(order_count=Count("id"), total_revenue=Sum("total_price"))
        .order_by("-total_revenue")
    )

    order_source_summary = []
    for entry in source_data:
        order_source_summary.append(
            {
                "source": entry["source"],  #
                "order_count": entry["order_count"],
                "total_revenue": float(entry["total_revenue"] or 0),
            }
        )

    peak_hours = sorted(hourly_data, key=lambda x: x["order_count"], reverse=True)[
        :3
    ]  #
    peak_hour_summary = [
        f"{hour['hour']} ({hour['order_count']} orders, ${hour['revenue']:.2f})"
        for hour in peak_hours
    ]  #

    busiest_days = sorted(
        formatted_daily_data, key=lambda x: x["order_count"], reverse=True
    )[
        :3
    ]  #
    busiest_day_summary = [
        f"{day['date']} ({day['order_count']} orders, ${day['revenue']:.2f})"
        for day in busiest_days
    ]  #

    total_orders_summary_ops = sum(
        entry["order_count"] for entry in hourly_data
    )  # Renamed
    total_revenue_summary_ops = sum(
        Decimal(str(entry["revenue"])) for entry in hourly_data
    )  # Renamed
    avg_orders_per_day = (
        total_orders_summary_ops / len(formatted_daily_data)
        if formatted_daily_data
        else 0
    )  #

    summary = {
        "period_start": start_date.strftime("%Y-%m-%d"),  #
        "period_end": end_date.strftime("%Y-%m-%d"),  #
        "total_orders": total_orders_summary_ops,  #
        "total_revenue": float(total_revenue_summary_ops),  #
        "avg_orders_per_day": round(avg_orders_per_day, 2),  #
        "peak_hours_detail": peak_hours,  # More detailed peak hours
        "busiest_days_detail": busiest_days,  # More detailed busiest days
        "order_source_breakdown": order_source_summary,
    }

    return {
        "summary": summary,
        "hourly_data": hourly_data,
        "daily_data": formatted_daily_data,
        "day_of_week_summary": day_of_week_summary,
    }
