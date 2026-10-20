# gjiaoyan 教研资源平台

基于 Next.js 15 + React 19 + Tailwind CSS v4 的教研资源应用：支持教学资源的浏览与展示（图片灯箱）、AI 内容生成（Gemini / GoogleGenAI）、PPT 生成（pptxgenjs）、Cloudinary 图片素材托管，并内置管理后台（`/admin`）。数据存储使用 PostgreSQL（Neon）。

## 本地开发

```bash
npm install --legacy-peer-deps
npm run dev
```

访问 http://localhost:3000

## 环境变量

参考 `.env.example`，运行时需要的主要变量：

- `DATABASE_URL`：PostgreSQL 连接串（Neon）
- `GEMINI_API_KEY`：AI 生成功能密钥（缺失时应用可正常启动，仅 AI 生成功能降级）
- `CLOUDINARY_URL` / `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`：图片素材托管

## Docker 部署（Windows + Docker Desktop）

构建采用多阶段方案（builder + runner），依赖按 `package-lock.json` 以 `npm ci --legacy-peer-deps` 精确安装，构建产物为 Next.js standalone，运行镜像不含完整 node_modules。

### 一键本地部署

双击或命令行运行 `redeploy.bat`：

1. 构建 Docker 镜像 `gjiaoyan:latest`（失败自动重试一次）
2. 停止并移除旧容器，清理悬空镜像
3. 启动新容器：宿主机端口 `7854` → 容器端口 `3000`，数据目录挂载 `D:\docker\gjiaoyan\data`
4. 校验容器状态与 HTTP 200

部署成功后访问 http://localhost:7854

### 一键远程部署

运行 `upload2remote.bat`：本地构建镜像 → 导出 tar → scp 上传至远程服务器（172.29.173.42）→ 远程加载并以端口 `7854` 启动，接入 `mynet` 网络。部署成功后访问 http://172.29.173.42:7854

### 锁文件说明

- 依赖安装严格按 `package-lock.json` 执行（`npm ci --legacy-peer-deps`）
- **若删除过锁文件或依赖发生变更，必须先重新生成**（必须带 `--legacy-peer-deps`），再运行部署脚本：

```bash
npm install --legacy-peer-deps --package-lock-only
```

### 相关文件

- `Dockerfile`：生产级多阶段构建文件（`Dockerbak.txt` 为其完全一致的备份）
- `.dockerignore`：缩小构建上下文，排除依赖、缓存、脚本与敏感环境变量
- `skills/myusellm/SKILL.md`：本套部署方案的生成技能（v2）
