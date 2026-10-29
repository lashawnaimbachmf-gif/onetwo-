# 部署到自己的服务器（阿里云 ECS）

目标：把「恋爱小窝」的后端和前端全部搬到自己的 ECS 上，不再依赖 uniCloud 服务空间。

- 后端：`server/`（Node + Express + MongoDB）
- 前端：H5 由 Nginx 直接托管；微信小程序重新编译后上传
- 入口：Nginx 统一 443，`/fn`、`/upload` 反代到 Node，`/uploads` 直出文件

> 只想先看看效果？在本地 `cd server && npm i && npm start`，然后把 `config/api.js` 的 `DEV_BASE` 指向本机即可，不需要域名和备案。

---

## 0. 前置条件

| 项 | 要求 | 说明 |
| --- | --- | --- |
| ECS | 1 核 2G 起，Ubuntu 22.04 / Debian 12 | MongoDB 占内存，1G 机器建议加 swap |
| 域名 | 已完成 **ICP 备案** | 微信小程序硬性要求，不能是 IP、不能用非 443 端口 |
| 小程序 | 已注册 + 完成**小程序备案** | 2023 年起强制 |
| 微信 | AppID / AppSecret | 公众平台 → 开发管理 → 开发设置 |

境内 ECS 未备案域名访问 80/443 会被拦截，这是最常见的卡点，先办备案再往下走。

---

## 1. 安全组

只放行必要端口：

| 端口 | 来源 | 用途 |
| --- | --- | --- |
| 22 | 你的固定 IP | SSH |
| 80 | 0.0.0.0/0 | 签证书 / 跳转 HTTPS |
| 443 | 0.0.0.0/0 | 业务 |

**不要**放行 3000（Node）和 27017（MongoDB），它们只监听本机。

---

## 2. 装环境

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Shanghai

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # 应 >= v18

# MongoDB 7（官方源）
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
  | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# Nginx + 证书
sudo apt install -y nginx certbot python3-certbot-nginx
```

MongoDB 默认只监听 `127.0.0.1`，不要改。确认一下：

```bash
ss -lntp | grep 27017   # 应显示 127.0.0.1:27017
```

---

## 3. 建目录与运行账户

```bash
sudo useradd -r -m -d /srv/onetwo -s /usr/sbin/nologin onetwo 2>/dev/null || true
sudo mkdir -p /srv/onetwo/{src,web,uploads,data,backup}
sudo chown -R onetwo:onetwo /srv/onetwo
```

| 目录 | 用途 |
| --- | --- |
| `/srv/onetwo/src` | 代码仓库 |
| `/srv/onetwo/web` | H5 静态产物 |
| `/srv/onetwo/uploads` | 用户上传的图片/语音 |
| `/srv/onetwo/data` | 文件存储模式的数据（用 Mongo 时为空） |
| `/srv/onetwo/backup` | 备份 |

---

## 4. 部署后端

```bash
sudo -u onetwo git clone https://github.com/lashawnaimbachmf-gif/onetwo-.git /srv/onetwo/src
cd /srv/onetwo/src/server
sudo -u onetwo npm ci --omit=dev
sudo -u onetwo cp .env.example .env
sudo -u onetwo vi .env
```

`.env` 至少改成这样：

```ini
PORT=3000
HOST=127.0.0.1
MONGO_URL=mongodb://127.0.0.1:27017
MONGO_DB=onetwo
PUBLIC_BASE=https://your-domain.com
UPLOAD_DIR=/srv/onetwo/uploads
WX_APP_ID=wx开头的AppID
WX_APP_SECRET=你的AppSecret
```

> `HOST=127.0.0.1` 让 Node 只接受本机连接，外部一律经过 Nginx。

先手工跑一次，确认能连上数据库：

```bash
sudo -u onetwo node app.js
# 另开一个窗口
curl -s http://127.0.0.1:3000/health
# {"ok":true,"driver":"mongodb (onetwo)",...}
```

按 `Ctrl+C` 停掉，换 systemd 托管：

```bash
sudo tee /etc/systemd/system/onetwo-api.service > /dev/null <<'EOF'
[Unit]
Description=onetwo api
After=network.target mongod.service

[Service]
Type=simple
User=onetwo
WorkingDirectory=/srv/onetwo/src/server
EnvironmentFile=/srv/onetwo/src/server/.env
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now onetwo-api
sudo systemctl status onetwo-api --no-pager
sudo journalctl -u onetwo-api -f     # 看日志
```

想用 pm2 也行，systemd 更省心，二选一。

---

## 5. 部署 H5（可选）

```bash
cd /srv/onetwo/src
sudo -u onetwo npm ci
sudo -u onetwo npm run build:h5
sudo rsync -a --delete unpackage/dist/build/h5/ /srv/onetwo/web/
sudo chown -R www-data:www-data /srv/onetwo/web
```

`config/api.js` 里 H5 生产环境走同域（`base` 为空），所以构建时不用改任何地址。

---

## 6. Nginx 与 HTTPS

```bash
sudo tee /etc/nginx/sites-available/onetwo > /dev/null <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    root /srv/onetwo/web;
    index index.html;
    client_max_body_size 25m;

    # 云函数
    location /fn/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # 上传
    location /upload {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location = /health {
        proxy_pass http://127.0.0.1:3000;
    }

    # 上传的文件
    location /uploads/ {
        alias /srv/onetwo/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # H5 单页应用
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/onetwo /etc/nginx/sites-enabled/onetwo
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 免费证书（自动改写成 443 + 跳转）
sudo certbot --nginx -d your-domain.com
sudo systemctl status certbot.timer   # 自动续期
```

验证：

```bash
curl -s https://your-domain.com/health
curl -s https://your-domain.com/fn/getWeather
```

---

## 7. 微信小程序侧

### 7.1 改配置并编译

1. `config/api.js` 把 `PROD_BASE` 改成 `https://your-domain.com`
2. `manifest.json` → `mp-weixin.appid` 换成自己的 AppID
3. `project.config.json` 的 `appid` 同步修改
4. HBuilderX：`发行` → `小程序-微信`，或命令行 `npm run build:mp-weixin`
5. 微信开发者工具导入 `unpackage/dist/build/mp-weixin`，上传代码、提交审核

### 7.2 后台配置

| 位置 | 配置 |
| --- | --- |
| 开发管理 → 开发设置 → 服务器域名 | `request` 合法域名：`https://your-domain.com`；`uploadFile` 合法域名：`https://your-domain.com` |
| 设置 → 服务内容声明 → 用户隐私保护指引 | 声明「位置信息」「麦克风」 |
| 功能 → 订阅消息 | 模板 ID 与 `server/functions/sendMessage.js` 里的字段一致 |
| 开发管理 → 开发设置 | AppSecret 填入服务器 `.env` |

注意事项：

- 域名必须 HTTPS、已备案，**不能用 IP、不能带端口**；每月只能改 5 次，一次配对好。
- 新备案域名要等约 24 小时才能在小程序后台保存。
- 开发阶段可在开发者工具勾「不校验合法域名」，用 `http://127.0.0.1:3000` 直连调试；真机必须走域名。

---

## 8. 数据迁移（原 uniCloud → 自建 MongoDB）

如果之前已经在 uniCloud 上有数据：

1. uniCloud 控制台 → 云数据库 → 选择集合 → 导出 JSON（每行一个文档）
2. 上传到服务器后导入：

```bash
for c in users invite_codes anniversary capsule tree leaf dish order photo pair; do
  if [ -f "$c.json" ]; then
    mongoimport --db onetwo --collection "$c" --file "$c.json" --jsonArray
  fi
done
```

3. `_id` 是 24 位十六进制字符串，导入后保持不变，前端按 `_id` 更新不会失效。
4. 图片是 uniCloud 云存储的临时链接，过期会失效，需要重新上传（或把原文件下载后放到 `/srv/onetwo/uploads/`，再把库里的 URL 批量替换成 `https://your-domain.com/uploads/...`）。

---

## 9. 备份

```bash
sudo mkdir -p /srv/onetwo/backup
sudo crontab -u root -e
```

加入：

```cron
# 每天 3:10 备份数据库，保留 14 天
10 3 * * * mongodump --db onetwo --out /srv/onetwo/backup/$(date +\%F) && find /srv/onetwo/backup -maxdepth 1 -type d -mtime +14 -exec rm -rf {} \;
# 每天 3:30 打包上传文件
30 3 * * * tar czf /srv/onetwo/backup/uploads-$(date +\%F).tar.gz -C /srv/onetwo uploads
```

图片和语音在磁盘上，**ECS 快照也要开**，磁盘挂了只能靠快照。

---

## 10. 更新流程

```bash
cd /srv/onetwo/src
sudo -u onetwo git pull
cd server && sudo -u onetwo npm ci --omit=dev
sudo systemctl restart onetwo-api

# H5 有改动才需要
cd /srv/onetwo/src && sudo -u onetwo npm run build:h5 \
  && sudo rsync -a --delete unpackage/dist/build/h5/ /srv/onetwo/web/
```

小程序改动要重新编译并上传代码、提交审核。

---

## 11. 排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `curl /health` 不通 | 服务没起 / 端口不对 | `systemctl status onetwo-api`、`journalctl -u onetwo-api -n 50` |
| 502 Bad Gateway | Node 没监听或 `HOST` 写错 | 确认 `.env` 是 `127.0.0.1`，`curl 127.0.0.1:3000/health` |
| 上传 413 | Nginx 体积限制 | `client_max_body_size 25m;` |
| 小程序报「不在合法域名列表」 | 域名没配或没备案 | 后台加 request/uploadFile 域名，等生效 |
| 小程序报「request:fail ssl hand shake」 | 证书链不完整 | 用 `certbot` 签发的 fullchain，不要用裸 cert |
| 图片打不开 | `PUBLIC_BASE` 没配 | `.env` 设成 `https://your-domain.com` 后重启 |
| 登录 openid 是 `openid_xxx` | 没配 AppSecret | 填 `WX_APP_SECRET`，重启服务 |
| MongoDB 连不上 | 没起 / 端口没开 | `systemctl status mongod`，`ss -lntp | grep 27017` |

---

## 12. 安全提醒

原项目的接口是**没有服务端鉴权**的：token 由客户端自己生成，服务端从不校验，数据靠前端传的 `openid` 区分。自建后端保持了同样的行为，这意味着知道地址的人可以直接读写数据。

自用没问题，但如果要公开，至少补三件事：

1. `wxLogin` 改为服务端签发 JWT，其余接口校验 `Authorization`
2. 服务端从 token 里取 `openid`，不再信任 body 里的 `openid`
3. 加上请求频率限制和 Schema 校验

需要的话可以在这个基础上继续加，`server/lib/` 已经留好了扩展位置。
