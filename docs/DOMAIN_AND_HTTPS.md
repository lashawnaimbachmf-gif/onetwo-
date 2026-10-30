# 域名、ICP 备案与 HTTPS（国内落地完整流程）

小程序对后端域名有三条硬要求：**HTTPS、已备案、不能是 IP / 不能带端口**。
本文按「买域名 → 备案 → 解析 → 证书 → Nginx → 微信白名单」的顺序走一遍，全部做完 `config/api.js` 里的 `PROD_BASE` 才有东西可填。

> 服务器：阿里云 ECS（本文以阿里云为例，腾讯云流程几乎一样，换成腾讯云备案系统即可）。

---

## 0. 先分清四件事

| 事项 | 在哪办 | 大概耗时 | 费用 |
| --- | --- | --- | --- |
| 买域名 | 阿里云万网 / 腾讯云 | 10 分钟 | `.com` 首年约 60–80 元，`.cn` 约 30 元 |
| **ICP 备案**（网站/域名） | 阿里云备案系统 | 1–3 周（管局最长 20 个工作日） | 免费 |
| **小程序备案** | 微信公众平台后台 | 1–2 周 | 免费 |
| HTTPS 证书 | 阿里云免费证书 / Let's Encrypt | 10 分钟 – 1 天 | 免费 |

ICP 备案和「小程序备案」是**两件独立的事**，都要做：前者是域名/网站，后者是小程序主体（2023 年 9 月起新小程序不备案无法发布）。

---

## 1. 买域名

1. 阿里云 → 域名注册，选短一点、好念的（如 `xxx.com` / `xxx.cn`）。
2. 立即做**实名认证**（个人：身份证 + 人脸），1–2 个工作日通过；未实名的域名不能备案、也不能解析到大陆服务器。
3. 域名注册商必须能开「域名证书」，备案时会用（阿里云控制台可下载）。

注意事项：

- 不要买 `.top` / `.xyz` 之类低价后缀做正式项目，管局对部分后缀审核更严格。
- 域名持有人信息必须和备案主体（你的身份证）一致。

---

## 2. ICP 备案（最关键的一步）

### 2.1 前提条件

- 服务器在**中国大陆**（阿里云 ECS 香港/海外节点不能备案）。
- ECS 必须是**包年包月**且剩余时长 ≥ 3 个月（按量付费的实例不给备案服务号）。
- 一台 ECS 可申请 **5 个备案服务号**，一个服务号对应一个网站（一个域名算一个网站）。

### 2.2 申请备案服务号

阿里云控制台 → 云服务器 ECS → 实例 → 更多 → **备案 → 申请备案服务号**，复制服务号备用。

### 2.3 提交备案

1. 打开 <https://beian.aliyun.com>，用同一账号登录 → 开始备案。
2. **主体信息**：身份证正反面、手机号、应急联系电话、通信地址（精确到门牌）。
3. **网站信息**：
   - 网站名称：个人备案要 3 个字以上，不能含「中国/国家/政府」等，不能纯英文/纯数字；
   - 服务内容：选「其他」或与真实用途一致；
   - 网站负责人：可与主体是同一人。
4. **人脸核验**：用阿里云 App 扫码做活体检测（已取代以前的幕布拍照）。
5. 阿里云初审（1–2 个工作日，会打电话核实）→ 提交管局。
6. **工信部短信核验**：提交后 24 小时内手机会收到 12381 短信，必须在 24 小时内点链接完成核验，否则备案被退回。
7. 管局审核：一般 1–7 个工作日，最长 20 个工作日。通过后拿到 **ICP 备案号**（如 `浙ICP备2026xxxxxx号-1`）。

### 2.4 两个容易踩的坑

- **个人备案不能做经营性内容**。如果小程序涉及在线点单、收款、外卖配送等经营行为，个人备案可能被驳回，需要企业主体 + 相关资质（餐饮类还涉及食品经营许可）。纯自用/记录类的功能（如本项目当前的纪念日、胶囊、相册）用个人备案没问题。
- **备案期间不要对外提供服务**：域名可以先解析，但备案下来前访问会被运营商/云厂商拦截（出现 403 或跳转提示页），这是正常现象。

---

## 3. 域名解析

阿里云 → 云解析 DNS → 域名 → 添加记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
| --- | --- | --- | --- |
| A | `@` | `120.27.229.190` | 600 |
| A | `www` | `120.27.229.190` | 600 |

验证：`ping your-domain.com` 或 `nslookup your-domain.com` 应返回服务器 IP。

---

## 4. HTTPS 证书

### 方案 A：阿里云免费证书（个人测试证书 · 免费版）

- 每个账号每年 20 张，单域名，**有效期 90 天**，到期要重新申请安装；想要 12 个月有效期的 pro 版需付费（约 200 元/年）。
- 路径：数字证书管理服务 → SSL 证书 → 个人测试证书（原免费证书）→ 创建证书 → 填域名 → DNS 验证 → 签发后**下载 Nginx 格式**，得到 `xxx.pem` 和 `xxx.key`。
- 不支持给 IP 申请证书，必须是域名（这也是必须买域名的原因之一）。

参考：[阿里云个人测试证书申请流程](https://developer.aliyun.com/article/1690858)

### 方案 B：Let's Encrypt（推荐，自动续期）

```bash
sudo apt install -y certbot python3-certbot-nginx   # Debian/Ubuntu
# 或 CentOS: sudo dnf install -y certbot python3-certbot-nginx

# 先把 nginx 的 server_name 改成你的域名，reload 后执行：
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo systemctl status certbot.timer    # 自动续期（默认每天检查）
```

certbot 会自动改写成 443 + HTTP 跳转，证书 90 天有效但**自动续期**，不用管。

> 小程序要求 TLS 1.2 及以上，证书链必须完整（用 `fullchain.pem`，不要只用 `cert.pem`）。

---

## 5. Nginx 443 配置

把 `deploy/nginx-onetwo.conf` 里的 `server_name _;` 改成你的域名，并加一个 443 的 server 块：

```nginx
# HTTP：只用于跳转 + 证书续期验证
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    root /srv/onetwo/web;
    index index.html;
    charset utf-8;
    client_max_body_size 25m;

    location /fn/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /upload {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health { proxy_pass http://127.0.0.1:3000; }

    location /uploads/ {
        alias /srv/onetwo/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / { try_files $uri $uri/ /index.html; }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

服务端也要同步改一处：`server/.env` 里 `PUBLIC_BASE=https://your-domain.com`（用于把上传文件拼成绝对地址），改完重启 `systemctl restart onetwo`。

---

## 6. 验证

```bash
curl -sI https://your-domain.com | head -1          # 200 / 301
curl -s  https://your-domain.com/health             # {"ok":true,"driver":"mongodb ..."}
curl -s  https://your-domain.com/fn/getWeather      # 云函数可访问
openssl s_client -connect your-domain.com:443 -servername your-domain.com </dev/null 2>/dev/null | openssl x509 -noout -dates
```

小程序真机报 `request:fail url not in domain list` 时，先确认这三条都满足：域名已备案、证书有效、后台白名单已保存。

---

## 7. 微信小程序后台

| 位置 | 填什么 |
| --- | --- |
| 开发管理 → 开发设置 → 服务器域名 → `request` | `https://your-domain.com` |
| 同上 → `uploadFile` / `downloadFile` | `https://your-domain.com` |
| 同上 → `socket` | 用不到可留空 |
| 设置 → 基本设置 → **小程序备案** | 按引导提交主体/服务内容，1–2 周 |

规则：

- 只能填域名，**不能填 IP、不能带端口**，必须 HTTPS。
- 每个类目每月最多修改 5 次，一次性配对好。
- 新备案域名在微信后台可能提示「域名未备案」，等 24 小时左右再试。
- 开发阶段可以在开发者工具里勾「不校验合法域名」，继续用 `http://127.0.0.1:3000` 或 `http://120.27.229.190` 调试；**真机预览必须走域名**。

最后一步：把 `config/api.js` 的 `PROD_BASE` 改成 `https://your-domain.com`，重新编译小程序。

---

## 8. 时间线参考

| 天 | 做什么 |
| --- | --- |
| D0 | 买域名 + 实名认证；确认 ECS 是包年包月且剩余 ≥ 3 个月 |
| D1 | 申请备案服务号，提交备案；用 IP 先把后端跑起来（现在就是可用状态） |
| D1–D2 | 阿里云初审，接电话 + 完成工信部短信核验 |
| D2–D10 | 管局审核（此期间可继续用 IP 调试） |
| 拿到备案号 | 解析域名 → 申请证书 → 配 443 → 改 `PROD_BASE` → 小程序后台加白名单 |
| 之后 | 提交小程序审核；记得做「小程序备案」 |

---

## 9. 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 浏览器访问域名出现「该网站未备案」拦截页 | 备案没下来或备案接入商不是当前服务器厂商；用 IP 访问测试 |
| `curl` 报 `SSL certificate verify failed` | 用了 `cert.pem` 而非 `fullchain.pem`，证书链不全 |
| 小程序提示 `url not in domain list` | 白名单没加 / 加了带端口的地址 / 域名非 HTTPS |
| 证书 90 天到期后小程序全挂 | 阿里云免费证书需手动换；用 certbot 可自动续期 |
| 备案被退回「网站名称不合规」 | 个人备案改名成中性名称（如「XX 的笔记」），不要带行业词 |
| 备案期间域名无法访问 | 正常，备案通过后自动恢复 |

---

## 参考

- [微信小程序网络能力说明（服务器域名要求）](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- [阿里云个人测试证书（免费 SSL）申请攻略](https://developer.aliyun.com/article/1690858)
- [阿里云备案系统](https://beian.aliyun.com)
