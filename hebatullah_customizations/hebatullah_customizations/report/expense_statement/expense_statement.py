# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

import frappe
from frappe import _
from frappe.utils import flt

from erpnext.accounts.report.financial_statements import (
	compute_growth_view_data,
	compute_margin_view_data,
	get_columns,
	get_data,
	get_filtered_list_for_consolidated_report,
	get_period_list,
)

def execute(filters=None):
	period_list = get_period_list(
		filters.from_fiscal_year,
		filters.to_fiscal_year,
		filters.period_start_date,
		filters.period_end_date,
		filters.filter_based_on,
		filters.periodicity,
		company=filters.company,
	)

	expense = get_data(
		filters.company,
		"Expense",
		"Debit",
		period_list,
		filters=filters,
		accumulated_values=filters.accumulated_values,
		ignore_closing_entries=True,
		ignore_accumulated_values_for_fy=True,
	)

	data = []
	data.extend(expense or [])

	columns = get_columns(filters.periodicity, period_list, filters.accumulated_values, filters.company)

	currency = filters.presentation_currency or frappe.get_cached_value(
		"Company", filters.company, "default_currency"
	)
	chart = get_chart_data(filters, columns, expense, currency)

	report_summary, primitive_summary = get_report_summary(
		period_list, filters.periodicity, expense, currency, filters
	)

	if filters.get("selected_view") == "Growth":
		compute_growth_view_data(data, period_list)

	if filters.get("selected_view") == "Margin":
		compute_margin_view_data(data, period_list, filters.accumulated_values)

	return columns, data, None, chart, report_summary, primitive_summary


def get_report_summary(period_list, periodicity, expense, currency, filters, consolidated=False):
	net_expense = 0.0

	# from consolidated financial statement
	if filters.get("accumulated_in_group_company"):
		period_list = get_filtered_list_for_consolidated_report(filters, period_list)

	if filters.accumulated_values:
		key = period_list[-1].key
		if expense:
			net_expense = expense[-2].get(key)
	else:
		for period in period_list:
			key = period if consolidated else period.key
			if expense:
				net_expense += expense[-2].get(key)

	if len(period_list) == 1 and periodicity == "Yearly":
		expense_label = _("Total Expense This Year")
	else:
		expense_label = _("Total Expense")

	return [
		{"value": net_expense, "label": expense_label, "datatype": "Currency", "currency": currency},
	], net_expense


def get_chart_data(filters, columns, expense, currency):
	labels = [d.get("label") for d in columns[2:]]

	expense_data = []

	for p in columns[2:]:
		if expense:
			expense_data.append(expense[-2].get(p.get("fieldname")))

	datasets = []
	if expense_data:
		datasets.append({"name": _("Expense"), "values": expense_data})

	chart = {"data": {"labels": labels, "datasets": datasets}}

	if not filters.accumulated_values:
		chart["type"] = "bar"
	else:
		chart["type"] = "line"

	chart["fieldtype"] = "Currency"
	chart["options"] = "currency"
	chart["currency"] = currency

	return chart
