# AgentLink - 跨企业智能体自动结算协议

## 项目简介

AgentLink 是企业级 AI 智能体协同结算的底层基础设施，构建去中心化、自主化的价值流转网络，实现跨组织智能体间的无摩擦商业协作。

## 核心功能

### 1. 智能合约层
- **AgentRegistry**: 智能体注册与身份管理
- **SettlementContract**: 跨智能体自动结算
- **PaymentChannel**: 高频小额支付通道
- **SubscriptionManager**: 周期性订阅管理
- **KPIVerifier**: 基于KPI的效果验证

### 2. API 服务层
- 智能体管理（注册、更新、激活/停用）
- 结算管理（发起交易、验证结算）
- 订阅管理（创建订阅、处理支付）
- 服务管理（注册服务、定价管理）
- KPI 验证（提交报告、验证结算）

### 3. 前端管理界面
- 仪表盘（系统概览）
- 智能体管理（CRUD操作）
- 结算管理（交易记录、验证）
- 订阅管理（订阅列表、计费）
- 服务管理（服务注册、定价）

## 技术栈

### 后端
- **运行时**: Node.js + TypeScript
- **框架**: Express
- **数据库**: PostgreSQL
- **缓存**: Redis
- **区块链**: Ethereum (Hardhat)
- **消息队列**: Bull (Redis)

### 前端
- **框架**: React + TypeScript
- **路由**: React Router
- **组件库**: TDesign
- **状态管理**: Zustand
- **HTTP客户端**: Axios
- **数据可视化**: Recharts
- **构建工具**: Vite

### 智能合约
- **开发框架**: Hardhat
- **语言**: Solidity ^0.8.19
- **库**: OpenZeppelin

## 项目结构

```
agentlink/
├── contracts/              # 智能合约
│   ├── AgentRegistry.sol
│   ├── SettlementContract.sol
│   ├── PaymentChannel.sol
│   ├── SubscriptionManager.sol
│   └── KPIVerifier.sol
├── src/                    # 后端代码
│   ├── config/            # 配置
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── contracts.ts
│   ├── controllers/       # 控制器
│   │   ├── agent.controller.ts
│   │   ├── settlement.controller.ts
│   │   └── subscription.controller.ts
│   ├── services/          # 服务层
│   │   ├── agent.service.ts
│   │   ├── settlement.service.ts
│   │   └── subscription.service.ts
│   ├── routes/            # 路由
│   │   ├── agents.ts
│   │   ├── settlements.ts
│   │   └── subscriptions.ts
│   ├── middleware/        # 中间件
│   │   ├── errorHandler.ts
│   │   └── validator.ts
│   ├── utils/            # 工具
│   │   ├── logger.ts
│   │   └── blockchain.ts
│   └── index.ts          # 入口
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── package.json
├── tsconfig.json
├── hardhat.config.js
├── docker-compose.yml
└── README.md
```

## 快速开始

### 前置要求
- Node.js >= 18
- PostgreSQL >= 13
- Redis >= 6
- Docker & Docker Compose (可选)

### 1. 安装依赖

```bash
# 后端
npm install

# 前端
cd frontend
npm install
cd ..
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

关键配置项：
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - 数据库配置
- `REDIS_HOST`, `REDIS_PORT` - Redis 配置
- `ETH_RPC_URL`, `ETH_PRIVATE_KEY` - 区块链配置
- `JWT_SECRET` - JWT 密钥

### 3. 使用 Docker 启动服务

```bash
docker-compose up -d
```

这将启动：
- PostgreSQL (端口 5432)
- Redis (端口 6379)
- Ganache (本地以太坊节点，端口 8545)

### 4. 部署智能合约

```bash
# 编译合约
npm run contract:compile

# 部署到本地网络
npm run contract:deploy
```

### 5. 启动后端服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

API 文档: `http://localhost:3000/api/v1`

### 6. 启动前端服务

```bash
cd frontend
npm run dev
```

前端界面: `http://localhost:3001`

## API 接口

### 智能体管理

- `POST /api/v1/agents/register` - 注册智能体
- `GET /api/v1/agents` - 获取智能体列表
- `GET /api/v1/agents/:id` - 获取智能体详情
- `GET /api/v1/agents/wallet/:walletAddress` - 根据钱包地址查询
- `PUT /api/v1/agents/:id` - 更新智能体
- `POST /api/v1/agents/:id/activate` - 激活智能体
- `POST /api/v1/agents/:id/deactivate` - 停用智能体
- `POST /api/v1/agents/:id/deposit` - 存款
- `POST /api/v1/agents/:id/withdraw` - 取款
- `GET /api/v1/agents/:id/balance` - 查询余额

### 结算管理

- `POST /api/v1/settlements/initiate` - 发起结算
- `POST /api/v1/settlements/verify` - 验证并结算
- `GET /api/v1/settlements/:id` - 获取交易详情
- `GET /api/v1/settlements/agent/:agentId` - 获取智能体交易列表
- `GET /api/v1/settlements/statistics` - 获取统计信息
- `GET /api/v1/settlements/services` - 获取服务列表
- `GET /api/v1/settlements/services/:id` - 获取服务详情

### 订阅管理

- `POST /api/v1/subscriptions/create` - 创建订阅
- `GET /api/v1/subscriptions/:id` - 获取订阅详情
- `GET /api/v1/subscriptions/subscriber/:subscriberId` - 获取订阅者列表
- `GET /api/v1/subscriptions/provider/:providerId` - 获取提供者列表
- `PUT /api/v1/subscriptions/:id` - 更新订阅
- `POST /api/v1/subscriptions/:id/cancel` - 取消订阅
- `POST /api/v1/subscriptions/:id/payment` - 处理支付
- `GET /api/v1/subscriptions/statistics` - 获取统计信息

## 核心业务逻辑

### 1. 服务即结算
营销智能体调用素材/生成/算力服务时，任务完成即触发链上微支付，消除审批延迟。

### 2. 效果导向订阅
基于预设KPI（如线索量、转化率）的智能核验机制，实现绩效自动结算与分成。

### 3. 自治合约执行
商业规则链上配置 → 智能体自主履约 → 自动清分结算，构建端到端无人化协作生态。

## 开发指南

### 添加新功能

1. 在 `contracts/` 中添加智能合约
2. 在 `src/controllers/` 中添加控制器
3. 在 `src/services/` 中添加服务层
4. 在 `src/routes/` 中添加路由
5. 在 `frontend/src/pages/` 中添加前端页面

### 运行测试

```bash
# 后端测试
npm test

# 智能合约测试
npm run contract:test
```

## 部署

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 手动部署

1. 部署智能合约到测试网/主网
2. 配置 `.env` 文件
3. 启动数据库和 Redis
4. 部署后端服务
5. 构建前端并部署

## 许可证

MIT License

## 联系方式

- 项目地址: [GitHub Repository]
- 文档: [Documentation]
- 问题反馈: [Issues]
