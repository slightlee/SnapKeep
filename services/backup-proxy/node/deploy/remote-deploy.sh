#!/usr/bin/env bash

# =============================================================================
# SnapKeep 后端远程部署脚本（Docker 镜像传输）
# 目标：本地构建镜像，通过 SSH 传输到远端，远端仅执行 docker compose 启动
# =============================================================================

set -euo pipefail

# ======================== 配置区域（可通过环境变量覆盖） ========================
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST:-${1:-}}"
PEM_KEY_PATH="${PEM_KEY_PATH:-$HOME/local/ssh/bj-47.pem}"
REMOTE_DIR="${REMOTE_DIR:-/opt/snapkeep/backup-proxy}"
SSH_PORT="${SSH_PORT:-22}"
IMAGE_NAME="${IMAGE_NAME:-snapkeep-backup-proxy}"
TAG="${TAG:-${IMAGE_TAG:-}}"
SYNC_ENV="${SYNC_ENV:-1}"
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_ROOT/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

SSH_CONTROL_PATH="/tmp/ssh-snapkeep-%r@%h:%p"
SSH_OPTS=(
  -i "$PEM_KEY_PATH"
  -p "$SSH_PORT"
  -o StrictHostKeyChecking=no
  -o ControlMaster=auto
  -o ControlPath="$SSH_CONTROL_PATH"
  -o ControlPersist=300
)
SCP_OPTS=(
  -i "$PEM_KEY_PATH"
  -P "$SSH_PORT"
  -o StrictHostKeyChecking=no
  -o ControlMaster=auto
  -o ControlPath="$SSH_CONTROL_PATH"
  -o ControlPersist=300
)

LOCAL_COMPOSE_CMD=()
COMPRESS_CMD=(gzip -1)
DECOMPRESS_CMD="gunzip"
IMAGE_REF=""
LOCAL_ENV_FILE=""
HAS_LOCAL_ENV="0"

ssh_cmd() {
  ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "$@"
}

scp_cmd() {
  scp "${SCP_OPTS[@]}" "$@"
}

cleanup() {
  if [[ -n "${REMOTE_HOST:-}" ]]; then
    ssh -O exit -o ControlPath="$SSH_CONTROL_PATH" "$REMOTE_USER@$REMOTE_HOST" 2>/dev/null || true
  fi
}

get_tag() {
  if git -C "$PROJECT_ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
    git -C "$PROJECT_ROOT" rev-parse --short HEAD
  else
    date +%Y%m%d%H%M%S
  fi
}

detect_local_compose() {
  if docker compose version >/dev/null 2>&1; then
    LOCAL_COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    LOCAL_COMPOSE_CMD=(docker-compose)
  else
    log_error "本地未检测到可用的 Docker Compose（docker compose / docker-compose）"
    exit 1
  fi
}

prepare_tools() {
  if command -v pigz >/dev/null 2>&1; then
    COMPRESS_CMD=(pigz -1)
    log_info "本地压缩工具: pigz -1"
  else
    COMPRESS_CMD=(gzip -1)
    log_info "本地压缩工具: gzip -1"
  fi

  if ssh_cmd "command -v pigz >/dev/null 2>&1"; then
    DECOMPRESS_CMD="pigz -d"
    log_info "远端解压工具: pigz -d"
  else
    DECOMPRESS_CMD="gunzip"
    log_warn "远端未安装 pigz，使用 gunzip 解压"
  fi
}

check_prerequisites() {
  log_step "检查本地环境..."

  [[ -n "$REMOTE_HOST" ]] || { log_error "请提供 REMOTE_HOST（或第一个参数）"; exit 1; }
  [[ -f "$PEM_KEY_PATH" ]] || { log_error "SSH 密钥不存在: $PEM_KEY_PATH"; exit 1; }

  command -v ssh >/dev/null 2>&1 || { log_error "ssh 未安装"; exit 1; }
  command -v scp >/dev/null 2>&1 || { log_error "scp 未安装"; exit 1; }
  command -v docker >/dev/null 2>&1 || { log_error "docker 未安装"; exit 1; }

  [[ -f "$BACKEND_ROOT/Dockerfile" ]] || { log_error "缺少 Dockerfile"; exit 1; }
  [[ -f "$BACKEND_ROOT/docker-compose.yml" ]] || { log_error "缺少 docker-compose.yml"; exit 1; }
  [[ -f "$BACKEND_ROOT/.env.example" ]] || { log_error "缺少 .env.example"; exit 1; }
  LOCAL_ENV_FILE="$BACKEND_ROOT/.env"

  if [[ "$SYNC_ENV" == "1" ]]; then
    if [[ -f "$LOCAL_ENV_FILE" ]]; then
      HAS_LOCAL_ENV="1"
      log_info "检测到本地 .env，部署时将覆盖远端 .env"
    else
      log_warn "SYNC_ENV=1 但本地缺少 .env，本次不会覆盖远端 .env"
    fi
  fi

  chmod 400 "$PEM_KEY_PATH"

  log_step "检查远程 SSH 连通性..."
  ssh_cmd "echo connected >/dev/null" || {
    log_error "远程 SSH 连接失败"
    exit 1
  }

  log_info "环境检查通过"
}

build_image() {
  log_step "本地构建镜像..."

  if [[ -z "$TAG" ]]; then
    TAG="$(get_tag)"
  fi
  IMAGE_REF="${IMAGE_NAME}:${TAG}"

  (
    cd "$BACKEND_ROOT"
    TAG="$TAG" IMAGE_NAME="$IMAGE_NAME" "${LOCAL_COMPOSE_CMD[@]}" -f "$BACKEND_ROOT/docker-compose.yml" build snapkeep-backup-proxy
  )

  log_info "镜像构建完成: $IMAGE_REF"
}

transfer_image() {
  log_step "传输镜像到远程服务器..."

  local image_size
  image_size="$(docker image inspect "$IMAGE_REF" --format '{{.Size}}' 2>/dev/null || echo 0)"

  local remote_load_cmd
  remote_load_cmd="set -euo pipefail; if docker info >/dev/null 2>&1; then ${DECOMPRESS_CMD} | docker load >/dev/null; elif sudo -n docker info >/dev/null 2>&1; then ${DECOMPRESS_CMD} | sudo docker load >/dev/null; else echo '[ERROR] 当前用户无法访问 docker，请配置权限或 sudo 免密' >&2; exit 1; fi"

  if command -v pv >/dev/null 2>&1 && [[ "$image_size" =~ ^[0-9]+$ ]] && (( image_size > 0 )); then
    log_info "使用 pv 显示传输进度"
    docker save "$IMAGE_REF" | "${COMPRESS_CMD[@]}" | pv -s "$image_size" | ssh_cmd "$remote_load_cmd"
  else
    docker save "$IMAGE_REF" | "${COMPRESS_CMD[@]}" | ssh_cmd "$remote_load_cmd"
  fi

  log_info "镜像传输完成"
}

transfer_config() {
  log_step "同步部署文件..."

  ssh_cmd "mkdir -p \"$REMOTE_DIR\""
  scp_cmd "$BACKEND_ROOT/docker-compose.yml" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/docker-compose.yml"
  scp_cmd "$BACKEND_ROOT/.env.example" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env.example"
  if [[ "$SYNC_ENV" == "1" && "$HAS_LOCAL_ENV" == "1" ]]; then
    scp_cmd "$LOCAL_ENV_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env"
    log_info "已覆盖远端 .env"
  fi

  log_info "部署文件同步完成"
}

start_containers() {
  log_step "远端启动容器..."

  ssh_cmd "REMOTE_DIR='$REMOTE_DIR' IMAGE_NAME='$IMAGE_NAME' TAG='$TAG' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

cd "$REMOTE_DIR"

if [[ ! -f ".env" && -f ".env.example" ]]; then
  cp ".env.example" ".env"
  echo "[WARN] 远程缺少 .env，已由 .env.example 生成，请尽快补充生产配置"
fi

DOCKER_CMD=(docker)
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then
    DOCKER_CMD=(sudo docker)
  else
    echo "[ERROR] 当前用户无法访问 docker，请配置权限或 sudo 免密"
    exit 1
  fi
fi

if "${DOCKER_CMD[@]}" compose version >/dev/null 2>&1; then
  COMPOSE_CMD=("${DOCKER_CMD[@]}" compose)
elif command -v docker-compose >/dev/null 2>&1; then
  if docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  elif sudo -n docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(sudo docker-compose)
  else
    echo "[ERROR] docker-compose 存在但不可执行"
    exit 1
  fi
else
  echo "[ERROR] 未检测到 Docker Compose（docker compose / docker-compose）"
  exit 1
fi

IMAGE_NAME="$IMAGE_NAME" TAG="$TAG" "${COMPOSE_CMD[@]}" up -d --no-build --remove-orphans
IMAGE_NAME="$IMAGE_NAME" TAG="$TAG" "${COMPOSE_CMD[@]}" ps
REMOTE_SCRIPT

  log_info "远程部署完成"
}

main() {
  trap cleanup EXIT

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║     SnapKeep Backend 远程部署（Docker）          ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  local start_time end_time duration
  start_time="$(date +%s)"

  check_prerequisites
  detect_local_compose
  prepare_tools
  build_image
  transfer_image
  transfer_config
  start_containers

  end_time="$(date +%s)"
  duration="$((end_time - start_time))"

  echo ""
  log_info "部署完成，耗时: ${duration}s"
  log_info "目标主机: ${REMOTE_USER}@${REMOTE_HOST}"
  log_info "部署目录: ${REMOTE_DIR}"
  log_info "镜像版本: ${IMAGE_REF}"
  log_info "建议验证: curl https://<你的域名>/api/backup/health"
}

main "$@"
