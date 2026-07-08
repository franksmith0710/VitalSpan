-- VitalSpan 统一演示库表结构与种子数据（UTF-8）
-- 供 sample-mysql(3307)、BI mysql-practice(3306) 共用

SET NAMES utf8mb4;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS daily_kpi;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS dirty_orders;

CREATE TABLE IF NOT EXISTS regions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  parent_id INT NULL,
  level TINYINT NOT NULL DEFAULT 1,
  INDEX idx_regions_parent (parent_id)
);

CREATE TABLE IF NOT EXISTS product_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  category_id INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  INDEX idx_products_category (category_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  region_id INT NOT NULL,
  tier VARCHAR(16) NOT NULL,
  register_date DATE NOT NULL,
  contact_phone VARCHAR(20) NULL,
  INDEX idx_customers_region (region_id),
  INDEX idx_customers_tier (tier)
);

CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  emp_no VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  department VARCHAR(64) NOT NULL,
  region_id INT NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(12, 2) NOT NULL,
  INDEX idx_employees_region (region_id),
  INDEX idx_employees_dept (department)
);

CREATE TABLE IF NOT EXISTS sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_date DATE NOT NULL,
  region_id INT NOT NULL,
  product_id INT NOT NULL,
  customer_id INT NULL,
  quantity INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  INDEX idx_sales_date (sale_date),
  INDEX idx_sales_region (region_id),
  INDEX idx_sales_product (product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL UNIQUE,
  order_date DATE NOT NULL,
  customer_id INT NOT NULL,
  region_id INT NOT NULL,
  status VARCHAR(16) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  salesperson_id INT NULL,
  INDEX idx_orders_date (order_date),
  INDEX idx_orders_status (status),
  INDEX idx_orders_customer (customer_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  INDEX idx_order_items_order (order_id)
);

CREATE TABLE IF NOT EXISTS daily_kpi (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  metric_code VARCHAR(32) NOT NULL,
  metric_name VARCHAR(64) NOT NULL,
  region_id INT NULL,
  value DECIMAL(16, 2) NOT NULL,
  UNIQUE KEY uk_daily_kpi (stat_date, metric_code, region_id),
  INDEX idx_daily_kpi_date (stat_date)
);

CREATE TABLE IF NOT EXISTS dirty_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_name VARCHAR(128) NOT NULL,
  amount VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  note VARCHAR(255) NULL
);

-- 重建后无需 TRUNCATE

INSERT INTO regions (id, code, name, parent_id, level) VALUES
  (1, 'EAST', '华东', NULL, 1),
  (2, 'NORTH', '华北', NULL, 1),
  (3, 'SOUTH', '华南', NULL, 1),
  (4, 'SW', '西南', NULL, 1),
  (5, 'SH', '上海', 1, 2),
  (6, 'JS', '江苏', 1, 2),
  (7, 'BJ', '北京', 2, 2),
  (8, 'GD', '广东', 3, 2),
  (9, 'SC', '四川', 4, 2);

INSERT INTO product_categories (id, name) VALUES
  (1, '电脑整机'),
  (2, '显示设备'),
  (3, '外设配件'),
  (4, '办公耗材');

INSERT INTO products (id, sku, name, category_id, unit_price, cost_price, stock_qty) VALUES
  (1, 'NB-001', '商务笔记本电脑', 1, 8999.00, 6200.00, 120),
  (2, 'NB-002', '轻薄笔记本电脑', 1, 7499.00, 5100.00, 85),
  (3, 'TB-001', '平板电脑', 1, 3299.00, 2400.00, 200),
  (4, 'MN-001', '27寸显示器', 2, 1599.00, 980.00, 150),
  (5, 'MN-002', '24寸显示器', 2, 1299.00, 820.00, 180),
  (6, 'KB-001', '机械键盘', 3, 459.00, 260.00, 320),
  (7, 'MS-001', '无线鼠标', 3, 199.00, 95.00, 500),
  (8, 'HS-001', '降噪耳机', 3, 599.00, 350.00, 260),
  (9, 'PP-001', 'A4打印纸(箱)', 4, 89.00, 52.00, 800),
  (10, 'INK-001', '墨盒套装', 4, 299.00, 180.00, 400);

INSERT INTO customers (id, code, name, region_id, tier, register_date, contact_phone) VALUES
  (1, 'C001', '张三', 5, 'VIP', '2024-03-12', '13800010001'),
  (2, 'C002', '李四', 7, '普通', '2024-05-20', '13800010002'),
  (3, 'C003', '王五', 8, '企业', '2024-01-08', '13800010003'),
  (4, 'C004', '赵六', 6, 'VIP', '2024-07-15', '13800010004'),
  (5, 'C005', '钱七', 9, '普通', '2024-09-02', '13800010005'),
  (6, 'C006', '孙八', 5, '企业', '2023-11-30', '13800010006'),
  (7, 'C007', '周九', 7, 'VIP', '2024-02-18', '13800010007'),
  (8, 'C008', '吴十', 8, '普通', '2024-06-25', '13800010008'),
  (9, 'C009', '郑十一', 6, '企业', '2024-04-10', '13800010009'),
  (10, 'C010', '华东科技', 5, '企业', '2023-08-01', '021-88880001');

INSERT INTO employees (id, emp_no, name, department, region_id, hire_date, salary) VALUES
  (1, 'E1001', '陈销售', '销售一部', 5, '2022-04-01', 12000.00),
  (2, 'E1002', '林销售', '销售一部', 7, '2021-09-15', 11500.00),
  (3, 'E1003', '黄销售', '销售二部', 8, '2023-01-10', 10800.00),
  (4, 'E2001', '刘分析', '数据分析', 5, '2020-06-01', 15000.00),
  (5, 'E3001', '何运维', '技术支持', 9, '2019-11-20', 13000.00);

INSERT INTO sales (sale_date, region_id, product_id, customer_id, quantity, amount, channel) VALUES
  ('2025-01-05', 5, 1, 1, 1, 8999.00, '线下门店'),
  ('2025-01-08', 7, 5, 2, 2, 2598.00, '电商平台'),
  ('2025-01-12', 8, 6, 3, 5, 2295.00, '企业直销'),
  ('2025-02-03', 5, 7, 6, 10, 1990.00, '电商平台'),
  ('2025-02-15', 9, 1, 5, 1, 9499.00, '线下门店'),
  ('2025-03-01', 7, 8, 7, 3, 1797.00, '电话销售'),
  ('2025-03-10', 8, 4, 8, 4, 6396.00, '电商平台'),
  ('2025-03-22', 5, 3, 10, 6, 19794.00, '企业直销'),
  ('2025-04-05', 9, 6, 5, 2, 918.00, '线下门店'),
  ('2025-04-18', 7, 2, 4, 1, 7499.00, '企业直销'),
  ('2025-05-02', 6, 9, 9, 20, 1780.00, '企业直销'),
  ('2025-05-20', 8, 10, 3, 8, 2392.00, '电话销售'),
  ('2025-06-08', 5, 4, 1, 2, 3198.00, '线下门店'),
  ('2025-06-25', 7, 1, 2, 1, 8999.00, '电商平台'),
  ('2025-07-01', 9, 7, 5, 15, 2985.00, '电商平台');

INSERT INTO orders (id, order_no, order_date, customer_id, region_id, status, total_amount, salesperson_id) VALUES
  (1, 'ORD-202501-001', '2025-01-10', 1, 5, '已完成', 8999.00, 1),
  (2, 'ORD-202501-002', '2025-01-18', 2, 7, '已完成', 1698.00, 2),
  (3, 'ORD-202502-001', '2025-02-02', 3, 8, '已取消', 399.00, 3),
  (4, 'ORD-202502-002', '2025-02-20', 4, 6, '已完成', 9499.00, 1),
  (5, 'ORD-202503-001', '2025-03-05', 5, 9, '处理中', 599.00, 3),
  (6, 'ORD-202503-002', '2025-03-25', 6, 5, '已完成', 4898.00, 1),
  (7, 'ORD-202504-001', '2025-04-12', 7, 7, '已完成', 8799.00, 2),
  (8, 'ORD-202505-001', '2025-05-08', 8, 8, '待付款', 3299.00, 3),
  (9, 'ORD-202506-001', '2025-06-15', 9, 6, '已完成', 2670.00, 2),
  (10, 'ORD-202507-001', '2025-07-02', 10, 5, '处理中', 19794.00, 1);

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
  (1, 1, 1, 8999.00, 8999.00),
  (2, 5, 1, 1299.00, 1299.00),
  (2, 7, 2, 199.00, 398.00),
  (3, 7, 2, 199.50, 399.00),
  (4, 1, 1, 9499.00, 9499.00),
  (5, 8, 1, 599.00, 599.00),
  (6, 4, 2, 1599.00, 3198.00),
  (6, 6, 4, 425.00, 1700.00),
  (7, 2, 1, 7499.00, 7499.00),
  (7, 8, 2, 650.00, 1300.00),
  (8, 3, 1, 3299.00, 3299.00),
  (9, 9, 10, 89.00, 890.00),
  (9, 10, 6, 296.67, 1780.00),
  (10, 3, 6, 3299.00, 19794.00);

INSERT INTO daily_kpi (stat_date, metric_code, metric_name, region_id, value) VALUES
  ('2025-07-01', 'gmv', '成交额', 5, 125000.00),
  ('2025-07-01', 'gmv', '成交额', 7, 98000.00),
  ('2025-07-01', 'gmv', '成交额', 8, 143500.00),
  ('2025-07-01', 'orders', '订单数', 5, 42),
  ('2025-07-01', 'orders', '订单数', 7, 35),
  ('2025-07-01', 'orders', '订单数', 8, 51),
  ('2025-07-02', 'gmv', '成交额', 5, 118600.00),
  ('2025-07-02', 'gmv', '成交额', 7, 102300.00),
  ('2025-07-02', 'gmv', '成交额', 8, 136800.00),
  ('2025-07-02', 'visitors', '访客数', NULL, 3200),
  ('2025-07-03', 'visitors', '访客数', NULL, 3450),
  ('2025-07-03', 'conversion', '转化率(%)', NULL, 3.25);

INSERT INTO dirty_orders (product_name, amount, status, note) VALUES
  ('Widget A', '12.5', 'active', NULL),
  ('Widget B', 'not-a-number', 'active', '脏金额'),
  ('Widget C', '99', 'deleted', '应过滤'),
  ('Widget D', '0', 'active', NULL),
  ('Widget E', '15.0', 'active', '正常备注');
