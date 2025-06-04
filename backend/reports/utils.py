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
    Subquery,
    OuterRef,
)  # Added Subquery, OuterRef
from django.db.models.functions import TruncDate, TruncDay, TruncWeek, TruncMonth
from orders.models import Order, OrderItem  #
from products.models import Product, Category  #
from payments.models import (
    Payment,
    PaymentTransaction,
)  # Ensure PaymentTransaction is imported
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
    include_tax=True,  # This flag's role might need re-evaluation if revenue is purely from transactions
    include_refunds=True,  # This flag might also be less relevant if Payment status filters are primary
    date_field="updated_at",  # This refers to the Order's date_field
):
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
        end_date = end_date.replace(hour=23, minute=59, second=59)

    # Define the base filter for Orders
    order_filters = Q(
        **{
            f"{date_field}__gte": start_date,
            f"{date_field}__lte": end_date,
            "status": "completed",  # Order.status is "completed"
            "payment__status__in": [
                "completed",
                "partially_refunded",
            ],  # Order.payment.status
        }
    )

    # Original query for order-level details (discounts, tips, etc.)
    # We will add the transaction-based revenue to this.
    query = Order.objects.filter(order_filters)

    if group_by == "day":
        trunc_func = TruncDay(date_field)
        date_format = "%Y-%m-%d"
    elif group_by == "week":
        trunc_func = TruncWeek(date_field)
        date_format = "Week of %Y-%m-%d"
    elif group_by == "month":
        trunc_func = TruncMonth(date_field)
        date_format = "%Y-%m"
    else:
        trunc_func = TruncDay(date_field)
        date_format = "%Y-%m-%d"

    # Subquery to calculate the sum of completed transaction amounts for each payment
    # This assumes Order has a OneToOneField to Payment named 'payment'
    # and Payment has a ForeignKey from PaymentTransaction named 'transactions'
    completed_transaction_amount_subquery = (
        PaymentTransaction.objects.filter(
            parent_payment=OuterRef("payment__pk"),  # Link to the Order's payment
            status="completed",
        )
        .values("parent_payment")
        .annotate(total_paid=Sum("amount"))
        .values("total_paid")
    )

    sales_data = (
        query.annotate(
            date_group=trunc_func,
            # This is the new revenue calculation based on completed transactions
            actual_revenue_from_transactions=Subquery(
                completed_transaction_amount_subquery,
                output_field=DecimalField(max_digits=10, decimal_places=2),
            ),
        )
        .values("date_group")
        .annotate(
            order_count=Count("id"),
            # Summing the new transaction-based revenue
            total_actual_revenue=Sum(
                F("actual_revenue_from_transactions")
            ),  # Use F() if needed, or directly if subquery works
            # Continue summing order-level details for context
            total_subtotal_frontend=Sum("subtotal_from_frontend"),
            total_tax_frontend=Sum("tax_amount_from_frontend"),
            total_discount=Sum("discount_amount"),
            total_tip=Sum("tip_amount"),
            total_surcharge=Sum("surcharge_amount"),
        )
        .order_by("date_group")
    )

    formatted_data = []
    cumulative_actual_revenue = Decimal("0.00")

    for entry in sales_data:
        date_str = entry["date_group"].strftime(date_format)
        order_count = entry["order_count"] or 0

        # This is now the revenue from completed transactions for the orders in this group
        actual_revenue = Decimal(entry["total_actual_revenue"] or "0.00")

        # Order-level details are still valuable for understanding the composition
        subtotal = Decimal(entry["total_subtotal_frontend"] or "0.00")
        tax_amount = Decimal(entry["total_tax_frontend"] or "0.00")  #
        discount = Decimal(entry["total_discount"] or "0.00")
        tip = Decimal(entry["total_tip"] or "0.00")
        surcharge = Decimal(entry["total_surcharge"] or "0.00")

        # The 'include_tax' flag's role changes slightly.
        # If 'actual_revenue' from transactions IS inclusive of tax (depends on how your payment amounts are stored/processed),
        # and you want a pre-tax revenue, you'd subtract tax_amount.
        # Assuming 'actual_revenue' is the gross amount collected via transactions:
        reported_total_revenue = actual_revenue
        if not include_tax:
            # This assumes tax_amount collected here is representative of the tax portion in actual_revenue
            # This part can be tricky if transactions don't break down tax.
            # For simplicity, if actual_revenue IS the final amount paid, and tax_amount is the tax portion of that, this works.
            # If 'actual_revenue_from_transactions' is already pre-tax, then this 'if' block might not be needed or apply differently.
            # Given Stripe usually processes final amounts, 'actual_revenue' is likely post-tax (customer paid this).
            reported_total_revenue -= tax_amount

        cumulative_actual_revenue += reported_total_revenue

        avg_order_value_calc = (
            reported_total_revenue / order_count if order_count > 0 else Decimal("0.00")
        )

        formatted_entry = {
            "date": date_str,
            "order_count": order_count,
            "subtotal": float(subtotal),
            "discount": float(discount),
            "surcharge": float(surcharge),
            "tax": float(tax_amount),  #
            "tip": float(tip),
            "total_revenue": float(
                reported_total_revenue
            ),  # This is now based on completed transactions
            "avg_order_value": float(avg_order_value_calc),
            "cumulative_total_revenue": float(cumulative_actual_revenue),
        }
        formatted_data.append(formatted_entry)

    if not formatted_data:
        # ... (return empty summary as before)
        return {
            "summary": {
                "period_start": start_date.strftime("%Y-%m-%d"),
                "period_end": end_date.strftime("%Y-%m-%d"),
                "total_orders": 0,
                "total_revenue": 0,
                "total_subtotal": 0,
                "total_discount": 0,
                "total_surcharge": 0,
                "total_tax": 0,
                "total_tip": 0,
                "avg_order_value": 0,
            },
            "data": [],
        }

    # Summary calculations will now use the new transaction-based revenue
    total_orders_summary = sum(entry["order_count"] for entry in formatted_data)
    total_revenue_summary = sum(
        Decimal(str(entry["total_revenue"])) for entry in formatted_data
    )
    total_subtotal_summary = sum(
        Decimal(str(entry["subtotal"])) for entry in formatted_data
    )
    total_discount_summary = sum(
        Decimal(str(entry["discount"])) for entry in formatted_data
    )
    total_surcharge_summary = sum(
        Decimal(str(entry["surcharge"])) for entry in formatted_data
    )
    total_tax_summary = sum(Decimal(str(entry["tax"])) for entry in formatted_data)  #
    total_tip_summary = sum(Decimal(str(entry["tip"])) for entry in formatted_data)

    summary = {
        "period_start": start_date.strftime("%Y-%m-%d"),
        "period_end": end_date.strftime("%Y-%m-%d"),
        "total_orders": total_orders_summary,
        "total_subtotal": float(total_subtotal_summary),
        "total_discount": float(total_discount_summary),
        "total_surcharge": float(total_surcharge_summary),
        "total_tax": float(total_tax_summary),  #
        "total_tip": float(total_tip_summary),
        "total_revenue": float(
            total_revenue_summary
        ),  # This sum is based on transaction amounts
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
