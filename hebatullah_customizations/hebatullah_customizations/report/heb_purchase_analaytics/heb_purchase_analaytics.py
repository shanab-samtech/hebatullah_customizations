# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


from hebatullah_customizations.hebatullah_customizations.report.heb_sales_analytics.heb_sales_analytics import Analytics


def execute(filters=None):
	return Analytics(filters).run()
