# 小包系统 / Small Box WMS

一个基于 `Next.js + Prisma + SQLite` 的小包 WMS MVP，覆盖客户预报、箱唛导出、仓库收货扫描、异常处理、充值审核、资金流水、财务报表和后台管理。

当前仓库已经整理成可交接状态，适合：

- 本地部署联调
- 小范围测试验收
- 交给同事继续开发或接手部署

## 技术栈

- Next.js 15
- React 19
- Prisma 6
- SQLite
- TypeScript

## 主要能力

### 客户端

- 预报填写
- 预报列表
- 箱唛导出
- 提交充值
- 我的对账单

### 仓库端

- 扫描箱唛收货
- 按件客户扫描追踪号
- 连续扫码工作台
- 异常处理
- 异常历史

### 管理端

- 后台总览
- 客户列表与客户详情
- 客户报价中心
- 充值审核
- 资金流水
- 财务报表
- 财务归档中心
- 异常历史
- 内部账号管理

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例：

```bash
cp .env.example .env
```

默认示例：

```env
DATABASE_URL="file:/tmp/xiaobao-wms-dev.db"
SESSION_SECRET="replace-with-a-long-random-string"
```

建议把 `SESSION_SECRET` 改成一串更长的随机字符串。

### 3. 初始化 Prisma Client

```bash
npm run prisma:generate
```

### 4. 初始化数据库

如果本地没有数据库，先执行：

```bash
npx prisma db push
```

### 5. 写入演示数据

```bash
npm run prisma:seed
```

### 6. 启动开发环境

```bash
npm run dev
```

打开：

- [http://localhost:3000/login](http://localhost:3000/login)

## 默认测试账号

种子脚本会创建以下默认账号：

### 管理员

- 账号：`admin`
- 密码：`Admin123!`

### 仓库账号

- 账号：`warehouse`
- 密码：`Warehouse123!`

### 客户账号

- 账号：`demo_customer`
- 密码：`Demo123!`

## 页面入口

### 管理端

- `/admin`
- `/admin/customers`
- `/admin/accounts`
- `/admin/finance`
- `/admin/recharges`
- `/admin/transactions`
- `/admin/reports`
- `/admin/archives`
- `/admin/exceptions`

### 仓库端

- `/warehouse`
- `/warehouse/exceptions`

### 客户端

- `/customer`
- `/customer/forecasts`
- `/customer/recharge`
- `/customer/statements`

## 推荐测试流程

### 1. 管理端准备

- 登录管理员账号
- 创建或检查客户
- 在客户报价中心配置计费方式
  - 按箱
  - 按件
- 在账号管理中创建仓库账号或管理员账号

### 2. 客户端测试

- 用客户账号登录
- 新建预报
- 导出箱唛
- 提交充值申请
- 查看对账单

### 3. 仓库端测试

- 用仓库账号登录
- 扫描箱唛
- 对按件客户继续扫追踪号
- 检查异常提示
- 处理异常并查看异常历史

### 4. 管理端复核

- 审核充值
- 查看资金流水
- 查看财务报表
- 查看归档记录

## 生产/部署注意事项

当前项目使用的是 `SQLite`，适合：

- 本地开发
- 演示
- 单机测试

不太适合：

- 多人同时高频写入
- 长期公网生产环境

如果要正式部署到公网，建议下一步切换到：

- PostgreSQL

同时补齐：

- HTTPS
- 域名
- 对象存储
- 数据库备份
- 日志审计
- 监控告警

## 构建命令

```bash
npm run build
npm run start
```

## 当前已确认

- `npm run build` 可通过
- 三端页面可访问
- GitHub 仓库已上传

## 仓库地址

- [https://github.com/whalejingyu001/small-box-wms](https://github.com/whalejingyu001/small-box-wms)

## 备注

仓库里默认忽略以下本地文件：

- `.env`
- `.next`
- `node_modules`
- `uploads`
- `.snapshots`

如果后续要继续交接，建议再补：

- Vercel / Docker / PM2 部署说明
- PostgreSQL 迁移方案
- 测试用例与验收清单
