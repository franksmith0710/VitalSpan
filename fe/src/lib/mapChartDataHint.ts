/** 演示库三级地图 SQL（静态示例，可直接下钻省→市→区县） */
export const DEMO_MAP_DRILL_SQL = `SELECT province, city, district, total
FROM (
  SELECT '广东省' AS province, '广州市' AS city, '天河区' AS district, 1200 AS total
  UNION ALL SELECT '广东省', '广州市', '越秀区', 860
  UNION ALL SELECT '广东省', '深圳市', '南山区', 980
  UNION ALL SELECT '广东省', '深圳市', '福田区', 720
  UNION ALL SELECT '浙江省', '杭州市', '西湖区', 760
  UNION ALL SELECT '浙江省', '杭州市', '余杭区', 540
  UNION ALL SELECT '北京市', '北京市', '朝阳区', 640
  UNION ALL SELECT '北京市', '北京市', '海淀区', 580
  UNION ALL SELECT '四川省', '成都市', '武侯区', 430
) AS demo_geo`;

/** 演示库 sales 表：省→市→区县下钻（需已执行 docker/demo-mysql/tables.sql） */
export const DEMO_MAP_SALES_DRILL_SQL = `SELECT province, city, district, SUM(amount) AS total
FROM v_sales_geo
GROUP BY province, city, district`;

/** 演示库省级地图 SQL（v_sales_geo 聚合到省） */
export const DEMO_MAP_JOIN_SQL = `SELECT province AS region, SUM(amount) AS total
FROM v_sales_geo
GROUP BY province`;

export type MapChartFieldHint = {
  message: string;
  /** 右栏展示的示例 SQL；null 表示仅文案、不展示代码块 */
  sampleSql: string | null;
};

export function mapChartFieldHint(columns: string[]): MapChartFieldHint | null {
  const normalized = columns.map((c) => c.trim()).filter(Boolean);
  if (normalized.length === 0) return null;

  const hasProvince = normalized.some((c) => /province|省份|^region$/i.test(c));
  const hasCity = normalized.some((c) => /^(city|城市)$/i.test(c) || /city$/i.test(c));
  const hasDistrict = normalized.some((c) => /district|区县/i.test(c));

  if (hasProvince && hasCity) {
    return {
      message: hasDistrict
        ? "已具备省/市/区县字段：拖入对应槽位，预览态点击地图下钻。"
        : "已具备省/市字段：预览态点击省可下钻到市级地图。",
      sampleSql: null,
    };
  }

  const hasGeoName = normalized.some(
    (c) =>
      /(?:^|_)(region|province|city|area|name)(?:$|_)/i.test(c) &&
      !/(?:^|_)(region_id|product_id|customer_id)(?:$|_)/i.test(c),
  );
  if (hasGeoName) return null;

  if (normalized.includes("region_id")) {
    return {
      message:
        "region_id 为区县级 ID，不能直接下钻。请改用 SQL 查询 v_sales_geo（province/city/district），或使用下方示例。",
      sampleSql: DEMO_MAP_SALES_DRILL_SQL,
    };
  }

  return {
    message:
      "省级：34 省离线底图。市：33 省可下钻；区县：仅部分城市已打包边界。请用下方 SQL 配置 province / city / district。",
    sampleSql: DEMO_MAP_DRILL_SQL,
  };
}
