#!/usr/bin/env bash
#
# 恋爱小窝 · ECS 一键部署（Ubuntu 22.04 / 24.04 / 26.04，无域名 / IP 直连版）
#
# 用法（root 身份）：
#   bash deploy/bootstrap.sh
#
# 可选环境变量：
#   PUBLIC_HOST=1.2.3.4        对外 IP（默认自动从阿里云元数据读取）
#   APP_DIR=/srv/onetwo        安装目录
#   SRC_DIR=/root/onetwo-deploy 已上传的源码目录（优先）
#   SRC_TARBALL=/tmp/onetwo-src.tar.gz 源码压缩包（其次）
#   SWAP_MB=2048               swap 大小，2G 内存机器必须加
#
# 脚本是幂等的，可以重复执行。
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/srv/onetwo}"
PUBLIC_HOST="${PUBLIC_HOST:-}"
SRC_DIR="${SRC_DIR:-}"
SRC_TARBALL="${SRC_TARBALL:-/tmp/onetwo-src.tar.gz}"
REPO_URL="${REPO_URL:-https://github.com/lashawnaimbachmf-gif/onetwo-.git}"
DB_NAME="${MONGO_DB:-onetwo}"
SWAP_MB="${SWAP_MB:-2048}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[警告] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[错误] %s\033[0m\n' "$*" >&2; exit 1; }

wait_active() {
  local svc="$1" tries="${2:-20}"
  for _ in $(seq 1 "$tries"); do
    systemctl is-active --quiet "$svc" && return 0
    sleep 1
  done
  return 1
}

[ "$(id -u)" -eq 0 ] || die "请用 root 运行：sudo bash deploy/bootstrap.sh"
[ -f /etc/os-release ] || die "无法识别系统版本"
# shellcheck source=/dev/null
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || warn "当前是 ${ID:-未知} ${VERSION_ID:-}，脚本按 Ubuntu 22.04 编写，继续执行可能有差异"

# ---------------------------------------------------------------- 公网 IP
log "识别公网 IP"
if [ -z "$PUBLIC_HOST" ]; then
  PUBLIC_HOST="$(curl -s --max-time 3 http://100.100.100.200/latest/meta-data/eipv4 || true)"
fi
if [ -z "$PUBLIC_HOST" ]; then
  PUBLIC_HOST="$(curl -s --max-time 5 https://ifconfig.me || true)"
fi
[ -n "$PUBLIC_HOST" ] || die "无法自动识别公网 IP，请用 PUBLIC_HOST=x.x.x.x 指定"
echo "    公网 IP: $PUBLIC_HOST"

# ---------------------------------------------------------------- 基础软件
log "安装基础软件（curl / git / nginx / rsync）"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends curl gnupg ca-certificates git rsync nginx tar

# ---------------------------------------------------------------- swap
log "配置 swap（${SWAP_MB}MB）"
if [ ! -f /swapfile ]; then
  fallocate -l "${SWAP_MB}M" /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count="$SWAP_MB" status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    已创建 ${SWAP_MB}MB swap"
else
  swapon /swapfile 2>/dev/null || true
  echo "    swap 已存在，跳过"
fi

# ---------------------------------------------------------------- Node
log "安装 Node.js（>= 18 即可）"
ensure_node() {
  local major=""
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    if [ "$major" -ge 18 ]; then
      echo "    已有 Node $(node -v)"
      return 0
    fi
  fi

  # 1) 系统自带（Ubuntu 24.04+ 一般是 18/20/22）
  apt-get install -y nodejs npm >/dev/null 2>&1 || true
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    if [ "$major" -ge 18 ]; then
      echo "    使用系统包 Node $(node -v)"
      return 0
    fi
  fi

  # 2) NodeSource（新版本系统可能还没收录，失败就继续）
  echo "    系统包版本过低，尝试 NodeSource"
  if curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | bash - >/dev/null 2>&1; then
    apt-get install -y nodejs >/dev/null 2>&1 || true
    if command -v node >/dev/null 2>&1; then
      major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
      if [ "$major" -ge 18 ]; then
        echo "    NodeSource 安装成功 Node $(node -v)"
        return 0
      fi
    fi
  fi

  # 3) 官方二进制包，跟发行版无关
  echo "    回退到官方二进制包"
  curl -fsSL https://nodejs.org/dist/latest-v20.x/SHASUMS256.txt -o /tmp/node-shasums.txt || return 1
  local tarball
  tarball="$(awk '/linux-x64\.tar\.xz$/ { for (i = 1; i <= NF; i++) if ($i ~ /^node-v20.*linux-x64\.tar\.xz$/) { print $i; exit } }' /tmp/node-shasums.txt)"
  [ -n "$tarball" ] || return 1
  curl -fsSL "https://nodejs.org/dist/latest-v20.x/$tarball" -o /tmp/node.tar.xz || return 1
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
  rm -f /tmp/node.tar.xz /tmp/node-shasums.txt
  hash -r
  command -v node >/dev/null 2>&1 || return 1
  echo "    官方包安装成功 Node $(node -v)"
  return 0
}
ensure_node || die "Node.js 安装失败，请手动装 Node 20 后重跑"

# ---------------------------------------------------------------- MongoDB
# 新版本 Ubuntu（如 26.04）官方仓库可能还没收录，装不上就自动退回本地文件存储
log "安装 MongoDB 7（可选）"
USE_MONGO=1

install_mongodb() {
  local suites=() suite
  [ -n "${VERSION_CODENAME:-}" ] && suites+=("$VERSION_CODENAME")
  suites+=(noble jammy)

  for suite in "${suites[@]}"; do
    rm -f /etc/apt/sources.list.d/mongodb-org-*.list
    if ! curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc 2>/dev/null \
      | gpg --batch --yes --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null; then
      return 1
    fi
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $suite/mongodb-org/7.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
    if apt-get update -y >/dev/null 2>&1 && apt-get install -y mongodb-org >/dev/null 2>&1; then
      echo "    MongoDB 仓库代号: $suite"
      return 0
    fi
    echo "    代号 $suite 不可用，换下一个"
  done

  rm -f /etc/apt/sources.list.d/mongodb-org-*.list
  apt-get update -y >/dev/null 2>&1 || true
  return 1
}

if command -v mongod >/dev/null 2>&1; then
  echo "    MongoDB 已安装"
elif install_mongodb; then
  USE_MONGO=1
else
  USE_MONGO=0
fi

if [ "$USE_MONGO" -eq 1 ]; then
  systemctl enable mongod >/dev/null 2>&1 || true
  systemctl restart mongod
  if ! wait_active mongod 15; then
    USE_MONGO=0
    warn "MongoDB 启动失败，改用本地文件存储"
  fi
fi

if [ "$USE_MONGO" -eq 0 ]; then
  warn "改用本地文件存储：数据写在 $APP_DIR/data/*.json（两个人用完全够，后续可迁到 MongoDB）"
fi

# ---------------------------------------------------------------- 运行账户与目录
log "创建运行账户和目录"
id onetwo >/dev/null 2>&1 || useradd -r -m -d "$APP_DIR" -s /usr/sbin/nologin onetwo
mkdir -p "$APP_DIR"/{src,web,uploads,data,backup}
chown -R onetwo:onetwo "$APP_DIR"
# 新版 Ubuntu 的 useradd -m 会创建 750 的家目录，Nginx 的 www-data 进不去，必须放开
chmod 0755 "$APP_DIR"

# ---------------------------------------------------------------- 源码
log "准备源码到 $APP_DIR/src"
TMP_SRC=""
cleanup() {
  if [ -n "$TMP_SRC" ] && [ -d "$TMP_SRC" ]; then
    rm -rf "$TMP_SRC"
  fi
  return 0
}
trap cleanup EXIT

if [ -n "$SRC_DIR" ]; then
  [ -f "$SRC_DIR/server/app.js" ] || die "SRC_DIR=$SRC_DIR 里没有 server/app.js"
  echo "    使用本地目录：$SRC_DIR"
  rsync -a --delete \
    --exclude 'node_modules' --exclude '.git' --exclude 'unpackage' \
    --exclude 'server/data' --exclude 'server/uploads' --exclude 'server/.env' \
    "$SRC_DIR"/ "$APP_DIR/src"/
elif [ -f "$SRC_TARBALL" ]; then
  echo "    解压源码包：$SRC_TARBALL"
  TMP_SRC="$(mktemp -d)"
  tar -xzf "$SRC_TARBALL" -C "$TMP_SRC"
  if [ -f "$TMP_SRC/server/app.js" ]; then
    SR="$TMP_SRC"
  else
    # 压缩包可能多套了一层目录
    SR=""
    for d in "$TMP_SRC"/*/; do
      if [ -d "$d" ]; then SR="$d"; break; fi
    done
  fi
  if [ -z "$SR" ] || [ ! -f "$SR/server/app.js" ]; then
    die "压缩包里没有找到 server/app.js"
  fi
  rsync -a --delete \
    --exclude 'node_modules' --exclude '.git' --exclude 'unpackage' \
    --exclude 'server/data' --exclude 'server/uploads' --exclude 'server/.env' \
    "$SR"/ "$APP_DIR/src"/
elif [ -d "$APP_DIR/src/.git" ]; then
  echo "    已有 git 仓库，执行 git pull"
  sudo -u onetwo git -C "$APP_DIR/src" pull --ff-only
else
  echo "    未发现本地源码，尝试 git clone（国内可能较慢）"
  sudo -u onetwo git clone --depth 1 "$REPO_URL" "$APP_DIR/src"
fi

[ -f "$APP_DIR/src/server/app.js" ] || die "源码里没有 server/ 目录。仓库远端还没有提交自建后端代码，请用源码包上传方式部署"
chown -R onetwo:onetwo "$APP_DIR/src"

# ---------------------------------------------------------------- .env
ENV_FILE="$APP_DIR/src/server/.env"
if [ "$USE_MONGO" -eq 1 ]; then
  MONGO_URL_LINE="MONGO_URL=mongodb://127.0.0.1:27017"
else
  MONGO_URL_LINE="MONGO_URL="
fi

if [ ! -f "$ENV_FILE" ]; then
  log "生成 server/.env"
  cat > "$ENV_FILE" <<EOF
PORT=3000
HOST=127.0.0.1
$MONGO_URL_LINE
MONGO_DB=$DB_NAME
PUBLIC_BASE=http://$PUBLIC_HOST
UPLOAD_DIR=$APP_DIR/uploads
DATA_DIR=$APP_DIR/data
MAX_UPLOAD_MB=20
LOG_REQUESTS=1
WX_APP_ID=
WX_APP_SECRET=
EOF
  chown onetwo:onetwo "$ENV_FILE"
  chmod 600 "$ENV_FILE"
else
  echo "    .env 已存在，保留原配置"
fi

# ---------------------------------------------------------------- 依赖
log "安装后端依赖"
sudo -u onetwo env HOME="$APP_DIR" bash -c "cd '$APP_DIR/src/server' && npm ci --omit=dev --no-audit --no-fund"

# ---------------------------------------------------------------- systemd
log "配置 systemd 服务"
cat > /etc/systemd/system/onetwo-api.service <<EOF
[Unit]
Description=onetwo api (恋爱小窝后端)
After=network.target mongod.service

[Service]
Type=simple
User=onetwo
WorkingDirectory=$APP_DIR/src/server
EnvironmentFile=$APP_DIR/src/server/.env
ExecStart=$(command -v node) app.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable onetwo-api >/dev/null 2>&1 || true
systemctl restart onetwo-api
wait_active onetwo-api || die "后端启动失败，查看 journalctl -u onetwo-api -n 50"

# ---------------------------------------------------------------- Nginx
log "配置 Nginx"
sed "s#/srv/onetwo#$APP_DIR#g" "$APP_DIR/src/deploy/nginx-onetwo.conf" \
  > /etc/nginx/sites-available/onetwo
ln -sf /etc/nginx/sites-available/onetwo /etc/nginx/sites-enabled/onetwo
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx

if [ ! -f "$APP_DIR/web/index.html" ]; then
  cat > "$APP_DIR/web/index.html" <<EOF
<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>恋爱小窝 · 后端就绪</title>
<style>body{font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#333;line-height:1.7}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}</style>
</head><body>
<h1>后端已部署</h1>
<p>这是一台尚未上传 H5 静态页的服务器，接口已经可用：</p>
<ul>
  <li><a href="/health">/health</a> — 健康检查</li>
  <li><a href="/fn/getWeather">/fn/getWeather</a> — 云函数示例</li>
</ul>
<p>小程序开发时把 <code>config/api.js</code> 的地址改成 <code>http://$PUBLIC_HOST</code>，并在开发者工具勾选「不校验合法域名」。</p>
</body></html>
EOF
  chown www-data:www-data "$APP_DIR/web/index.html"
fi

# ---------------------------------------------------------------- 自检
log "自检"
sleep 1
curl -fsS --max-time 5 http://127.0.0.1:3000/health >/dev/null || die "127.0.0.1:3000/health 不通"
curl -fsS --max-time 5 http://127.0.0.1/health >/dev/null || die "Nginx 反代不通，检查 /etc/nginx/sites-enabled/onetwo"

echo
echo "=================================================="
echo " 部署完成"
echo " 后端健康检查 : http://$PUBLIC_HOST/health"
echo " 云函数示例   : http://$PUBLIC_HOST/fn/getWeather"
echo " 上传目录     : $APP_DIR/uploads"
echo " 服务管理     : systemctl status onetwo-api"
echo " 日志         : journalctl -u onetwo-api -f"
echo "=================================================="
echo
warn "如果浏览器打不开上面的地址，去阿里云安全组放行入方向 80 端口（建议同时放行 22、443，删除 3389）"
