/** 演示库三级地图 SQL（省 → 市 → 区县，对标 DataEase 区域地图下钻） */
export const DEMO_MAP_DRILL_SQL = `SELECT
  r.name AS province,
  c.name AS city,
  d.name AS district,
  SUM(s.amount) AS total
FROM sales s
JOIN regions r ON s.region_id = r.id
LEFT JOIN regions c ON c.parent_id = r.id AND c.level = 2
LEFT JOIN regions d ON d.parent_id = c.id AND d.level = 3
GROUP BY r.name, c.name, d.name`;

/** 演示库省级地图 SQL（JOIN regions 取省/市名称） */
export const DEMO_MAP_JOIN_SQL = `SELECT r.name AS region, SUM(s.amount) AS total
FROM sales s
JOIN regions r ON s.region_id = r.id
GROUP BY r.name`;

export function mapChartFieldHint(columns: string[]): string | null {
  const normalized = columns.map((c) => c.trim()).filter(Boolean);
  if (normalized.length === 0) return null;

  const hasProvince = normalized.some((c) => /province|省份/i.test(c));
  const hasCity = normalized.some((c) => /city|城市|市$/i.test(c) && !/province/i.test(c));
  const hasDistrict = normalized.some((c) => /district|区县|区$|县$/i.test(c));

  if (hasProvince && hasCity) {
    return hasDistrict
      ? "已具备省/市/区县字段：拖入「地理」+「钻取/市级」+「钻取/区县」可实现三级下钻（预览态点击地图）。"
      : "已具备省/市字段：拖入「地理」+「钻取/市级」可实现省→市下钻。";
  }

  const hasGeoName = normalized.some(
    (c) =>
      /(?:^|_)(region|province|city|area|name)(?:$|_)/i.test(c) &&
      !/(?:^|_)(region_id|product_id|customer_id)(?:$|_)/i.test(c),
  );
  if (hasGeoName) return null;

  if (normalized.includes("region_id")) {
    return "演示库可直接拖入 region_id（5–9 会映射到上海/北京/广东等）；省→市下钻请用下方三级 SQL 并配置 province/city 字段。";
  }

  return "地图支持省→市→区县下钻：配置 province、city、district 字段，或使用下方演示 SQL。";
}
