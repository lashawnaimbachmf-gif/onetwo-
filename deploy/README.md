# 快速部署（无域名 / IP 直连）

适用于：刚买的 ECS、域名还没备案，但想先把后端跑起来联调。

目标：`http://<公网IP>/health` 返回 JSON，微信开发者工具能直连。

> 已经有备案域名了？直接看 [docs/SELF_HOSTING.md](../docs/SELF_HOSTING.md)。

---

## 0. 控制台操作（需要你点，脚本干不了）

### 0.1 更换操作系统为 Ubuntu

```
ECS 控制台 → 实例 → 全部操作 → 云盘和镜像 → 更换操作系统
→ 公共镜像 → Ubuntu 22.04 / 24.04 / 26.04 均可
→ 设置 root 密码 → 确认
```

系统盘会清空（新机器没数据，无损失），实例重启约 3–5 分钟，**公网 IP 不变**。

> Ubuntu 26.04 这类很新的版本，MongoDB 官方 apt 源可能还没收录。脚本会自动依次尝试系统代号、noble、jammy，都装不上就退回**本地文件存储**（数据写 `data/*.json`），功能不受影响，之后可以再迁 MongoDB。

### 0.2 安全组放行端口

```
网络与安全组 → 安全组 → 配置规则 → 入方向 → 手动添加
```

| 端口 | 授权对象 | 用途 |
| --- | --- | --- |
| 22 | `0.0.0.0/0`（能固定 IP 更好） | SSH |
| 80 | `0.0.0.0/0` | HTTP，现在就要用 |
| 443 | `0.0.0.0/0` | 以后上 HTTPS |

顺手把 3389 删掉，Windows 远程桌面用不上了。

---

## 1. 上传源码包（在你的 Windows 电脑上）

源码包已经打好了：`F:\Z\点餐程序\onetwo-src.tar.gz`（约 0.7MB）。

```powershell
scp "F:\Z\点餐程序\onetwo-src.tar.gz" root@120.27.229.190:/tmp/
```

输入 0.1 里设置的 root 密码。`scp` 报错的话，用 WinSCP 把文件拖到 `/tmp` 也一样。

---

## 2. 部署（在服务器上）

```bash
ssh root@120.27.229.190

mkdir -p /root/onetwo-deploy
tar -xzf /tmp/onetwo-src.tar.gz -C /root/onetwo-deploy
bash /root/onetwo-deploy/deploy/bootstrap.sh
```

脚本依次完成：

1. 加 2GB swap（2G 内存必需）
2. 装 Node.js 20（NodeSource）
3. 装 MongoDB 7（官方源，只监听 127.0.0.1）
4. 建 `onetwo` 运行账户 + `/srv/onetwo/{src,web,uploads,data,backup}`
5. 同步源码、生成 `.env`、`npm ci --omit=dev`
6. 注册 systemd 服务 `onetwo-api`
7. 配 Nginx（80 端口反代 `/fn`、`/upload`、`/uploads`）
8. 自检 `/health`

可重复执行，不会覆盖已有 `.env`。

---

## 3. 验证

浏览器打开：

```
http://120.27.229.190/health
```

应返回：

```json
{"ok":true,"driver":"mongodb (onetwo)","uptime":5,"time":1793264395482}
```

再点一下 `http://120.27.229.190/fn/getWeather` 验证云函数链路。

---

## 4. 接到微信小程序

改 [config/api.js](../config/api.js)：

```js
const DEV_BASE = 'http://120.27.229.190'
const PROD_BASE = 'http://120.27.229.190'   // 有域名后换成 https://你的域名
```

或者不重新编译，运行时覆盖：

```js
uni.setStorageSync('API_BASE', 'http://120.27.229.190')
```

微信开发者工具 → 详情 → 本地设置 → 勾选 **「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**。

> 真机预览/正式发布仍然要备案域名，这里只是开发联调。

---

## 5. 上传 H5（可选）

HBuilderX：`发行` → `网站-PC Web或手机H5` → 产物在 `unpackage/dist/build/h5`。

```powershell
scp -r "F:\Z\点餐程序\onetwo空间\unpackage\dist\build\h5\*" root@120.27.229.190:/srv/onetwo/web/
```

```bash
chown -R www-data:www-data /srv/onetwo/web
```

然后 `http://120.27.229.190/` 就是 H5 版。

---

## 6. 日常运维

| 操作 | 命令 |
| --- | --- |
| 看状态 | `systemctl status onetwo-api` |
| 看日志 | `journalctl -u onetwo-api -f` |
| 重启后端 | `systemctl restart onetwo-api` |
| 重启 Nginx | `systemctl reload nginx` |
| 连数据库 | `mongosh onetwo` |
| 更新代码 | 重新上传源码包 → 重跑 `bootstrap.sh` |
| 备份 | `mongodump --db onetwo --out /srv/onetwo/backup/$(date +%F)` |

---

## 7. 之后拿到备案域名

1. 域名 A 记录指向 `120.27.229.190`
2. 按 [docs/SELF_HOSTING.md](../docs/SELF_HOSTING.md) 第 6 节改 `server_name` + `certbot --nginx -d 你的域名`
3. `.env` 里 `PUBLIC_BASE` 改成 `https://你的域名`，重启后端
4. `config/api.js` 的 `PROD_BASE` 改成 `https://你的域名`，重新编译小程序
5. 微信后台 → 服务器域名 → 加 `request` / `uploadFile`

---

## 8. 注意

- 这台是**按量付费试用实例，2027-01-29 到期释放**，到期前记得转正或把数据迁走
- 数据在 `/var/lib/mongodb`（数据库）和 `/srv/onetwo/uploads`（图片语音），备份这两处就够
- **接口没有服务端鉴权**，别把 IP 发给不相关的人
