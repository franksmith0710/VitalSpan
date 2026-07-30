"""政企模板演示 SQL 常量。"""

from __future__ import annotations

SQL_GOV_KPI = (
    "SELECT metric_name, AVG(value) AS avg_value\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code IN ('cases_handled', 'online_rate', 'response_time')\n"
    "  AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)\n"
    "GROUP BY metric_name"
)
SQL_GOV_DEPT_SAT = (
    "SELECT department, AVG(value) AS avg_score\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'\n"
    "GROUP BY department\n"
    "ORDER BY avg_score DESC"
)
SQL_GOV_SAT_TREND = (
    "SELECT stat_date AS day, AVG(value) AS avg_score\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'\n"
    "GROUP BY stat_date\n"
    "ORDER BY day"
)
SQL_GOV_GAUGE_SAT = (
    "SELECT ROUND(AVG(value), 1) AS value\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'"
)
SQL_GOV_GAUGE_WATER = (
    "SELECT ROUND(AVG(index_value), 1) AS value\n"
    "FROM gov_eco_monitor\n"
    "WHERE index_code = 'water'\n"
    "  AND monitor_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
)
SQL_GOV_BUDGET = (
    "SELECT category, spent_amount AS total\n"
    "FROM gov_budget_items\n"
    "WHERE fiscal_year = YEAR(CURDATE())\n"
    "ORDER BY total DESC"
)
SQL_GOV_BUDGET_COMPARE = (
    "SELECT category, budget_amount AS budget, spent_amount AS spent\n"
    "FROM gov_budget_items\n"
    "WHERE fiscal_year = YEAR(CURDATE())"
)
SQL_GOV_INCIDENT = (
    "SELECT incident_type, SUM(count) AS total\n"
    "FROM gov_incidents\n"
    "GROUP BY incident_type\n"
    "ORDER BY total DESC"
)
SQL_GOV_REGION = (
    "SELECT province, city, district, SUM(service_volume) AS total\n"
    "FROM v_gov_region_service\n"
    "GROUP BY province, city, district"
)
SQL_GOV_GRID = (
    "SELECT grid_name, event_count, resolved_count\n"
    "FROM gov_grid_stats\n"
    "ORDER BY event_count DESC\n"
    "LIMIT 10"
)
SQL_GOV_INVEST = (
    "SELECT industry, SUM(investment_amount) AS total\n"
    "FROM gov_investment\n"
    "GROUP BY industry\n"
    "ORDER BY total DESC"
)
SQL_GOV_ECO = (
    "SELECT monitor_point, AVG(index_value) AS avg_index\n"
    "FROM gov_eco_monitor\n"
    "WHERE monitor_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)\n"
    "GROUP BY monitor_point"
)
SQL_GOV_ECO_TREND = (
    "SELECT monitor_date AS day, AVG(index_value) AS avg_index\n"
    "FROM gov_eco_monitor\n"
    "WHERE index_code = 'aqi'\n"
    "  AND monitor_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)\n"
    "GROUP BY monitor_date\n"
    "ORDER BY day"
)
SQL_GOV_HOTWORDS = (
    "SELECT word, weight\n"
    "FROM gov_hotwords\n"
    "ORDER BY weight DESC\n"
    "LIMIT 20"
)
SQL_GOV_ISSUES = (
    "SELECT issue_type, location, unit, status, progress\n"
    "FROM gov_issues\n"
    "ORDER BY seq\n"
    "LIMIT 10"
)
SQL_GOV_ALERTS = (
    "SELECT alert_time, location, content, status\n"
    "FROM gov_alerts\n"
    "ORDER BY sort_order\n"
    "LIMIT 8"
)
