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

/** 演示库省级地图 SQL（JOIN regions 取省/市名称） */
export const DEMO_MAP_JOIN_SQL = `SELECT r.name AS region, SUM(s.amount) AS total
FROM sales s
JOIN regions r ON s.region_id = r.id
GROUP BY r.name`;

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
        "region_id 仅支持省级着色（5–9 映射到上海/北京/广东等）。市/区县下钻需 province、city、district 字段，请换用静态演示 SQL。",
      sampleSql: DEMO_MAP_DRILL_SQL,
    };
  }

  return {
    message:
      "省级：34 省离线底图。市：33 省可下钻；区县：仅部分城市已打包边界。请用下方 SQL 配置 province / city / district。",
    sampleSql: DEMO_MAP_DRILL_SQL,
  };
}
