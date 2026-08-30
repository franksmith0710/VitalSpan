# Evolution State

> 自我演化**单一状态账本**。Automations 读写；人工可审计。

## 当前轮次

| 字段 | 值 |
|------|----|
| phase | **A8_CLOSE** |
| status | **DONE** |
| request | IM 投递改方案 2（用户委托 + device-code，规避备案/企业应用） |
| type | feature |
| goal | delivery_mode=user_delegated；飞书 device-code 绑定 + owner token 发信；测试绿 |
| plan | `docs/automate/plans/2026-08-30-im-user-delegated-delivery.md` |
| last_verified_command | `pytest tests/test_im_user_delegated.py -q` |
| last_verified_exit_code | 0 |
| repair_rounds | 0 |
| started_at | 2026-08-30 |
| completed_at | 2026-08-30 |

## 当前需求契约

- **request**: /dev-autopilot 改成方案2制定计划并完成
- **type**: feature
- **goal**: 方案 2 用户委托 IM 投递（飞书首期）；无需回调域名备案；调度 owner 发信
- **scope_include**: delivery_mode、device-code、token 存储、work_notice 分支、FE 绑定、调度 UI IM 通道
- **scope_exclude**: CLI spawn、企微钉钉 user_delegated 二期、自动 commit
- **acceptance**: `pytest tests/test_im_user_delegated.py -q` 绿；绑定/发信契约测试通过
- **risk_level**: medium
- **autonomy_policy**: auto_accept_low_risk
- **assumptions**: 飞书 OAuth 应用可由管理员创建（仅需 AppId/Secret，无备案回调）；调度 owner 须先完成带发信 scope 的绑定

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-08-30 | IM 方案 2（user_delegated）实现完成；迁移 0060；9 项单测绿 |
| 2026-08-30 | 启动 IM 方案 2 Headless Plan + 执行 |
| 2026-08-24 | 报表域收尾复验 DONE |
