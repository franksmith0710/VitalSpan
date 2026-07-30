"""政企模板演示 SQL 常量（列别名面向预览图例，使用中文显示名）。"""

from __future__ import annotations

SQL_GOV_KPI = (
    "SELECT metric_name AS 指标, AVG(value) AS 数值\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code IN ('cases_handled', 'online_rate', 'response_time')\n"
    "  AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)\n"
    "GROUP BY metric_name"
)
SQL_GOV_DEPT_SAT = (
    "SELECT department AS 部门, AVG(value) AS 满意度\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'\n"
    "GROUP BY department\n"
    "ORDER BY 满意度 DESC"
)
SQL_GOV_SAT_TREND = (
    "SELECT stat_date AS 日期, AVG(value) AS 满意度\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'\n"
    "GROUP BY stat_date\n"
    "ORDER BY 日期"
)
SQL_GOV_GAUGE_SAT = (
    "SELECT ROUND(AVG(value), 1) AS 指数\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'"
)
SQL_GOV_GAUGE_WATER = (
    "SELECT ROUND(AVG(index_value), 1) AS 指数\n"
    "FROM gov_eco_monitor\n"
    "WHERE index_code = 'water'\n"
    "  AND monitor_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
)
SQL_GOV_BUDGET = (
    "SELECT category AS 类别, spent_amount AS 支出金额\n"
    "FROM gov_budget_items\n"
    "WHERE fiscal_year = YEAR(CURDATE())\n"
    "ORDER BY 支出金额 DESC"
)
SQL_GOV_BUDGET_COMPARE = (
    "SELECT category AS 类别, budget_amount AS 预算, spent_amount AS 已支出\n"
    "FROM gov_budget_items\n"
    "WHERE fiscal_year = YEAR(CURDATE())"
)
SQL_GOV_INCIDENT = (
    "SELECT incident_type AS 事件类型, SUM(count) AS 数量\n"
    "FROM gov_incidents\n"
    "GROUP BY incident_type\n"
    "ORDER BY 数量 DESC"
)
SQL_GOV_REGION = (
    "SELECT province AS 省份, city AS 城市, district AS 区县, SUM(service_volume) AS 服务量\n"
    "FROM v_gov_region_service\n"
    "GROUP BY province, city, district"
)
SQL_GOV_GRID = (
    "SELECT grid_name AS 网格, event_count AS 事件数, resolved_count AS 已办结\n"
    "FROM gov_grid_stats\n"
    "ORDER BY 事件数 DESC\n"
    "LIMIT 10"
)
SQL_GOV_INVEST = (
    "SELECT industry AS 产业, SUM(investment_amount) AS 投资额\n"
    "FROM gov_investment\n"
    "GROUP BY industry\n"
    "ORDER BY 投资额 DESC"
)
SQL_GOV_ECO = (
    "SELECT monitor_point AS 监测点, AVG(index_value) AS 指数\n"
    "FROM gov_eco_monitor\n"
    "WHERE monitor_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)\n"
    "GROUP BY monitor_point"
)
SQL_GOV_ECO_TREND = (
    "SELECT monitor_date AS 日期, AVG(index_value) AS 指数\n"
    "FROM gov_eco_monitor\n"
    "WHERE index_code = 'aqi'\n"
    "  AND monitor_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)\n"
    "GROUP BY monitor_date\n"
    "ORDER BY 日期"
)
SQL_GOV_HOTWORDS = (
    "SELECT word AS 热词, weight AS 权重\n"
    "FROM gov_hotwords\n"
    "ORDER BY 权重 DESC\n"
    "LIMIT 20"
)
SQL_GOV_ISSUES = (
    "SELECT issue_type AS 问题类型, location AS 地点, unit AS 责任单位, "
    "status AS 状态, progress AS 进度\n"
    "FROM gov_issues\n"
    "ORDER BY seq\n"
    "LIMIT 10"
)
SQL_GOV_ALERTS = (
    "SELECT alert_time AS 告警时间, location AS 地点, content AS 内容, status AS 状态\n"
    "FROM gov_alerts\n"
    "ORDER BY sort_order\n"
    "LIMIT 8"
)
