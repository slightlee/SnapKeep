<template>
  <div class="drawer-overlay" :class="{ open: isOpen }" @click="$emit('close')"></div>
  <aside class="drawer" :class="{ open: isOpen }" aria-label="设置面板">
    <div class="drawer-header">
      <h2>设置</h2>
      <button
        class="icon-btn"
        type="button"
        title="关闭"
        aria-label="关闭设置面板"
        @click="$emit('close')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <div class="drawer-body">
      <div class="drawer-section">
        <div class="drawer-section-title">常用操作</div>
        <div class="compact-stack">
          <div class="compact-item primary">
            <div class="compact-head">
              <div>
                <div class="compact-title">云端备份</div>
                <div class="compact-desc">
                  {{ hasCloudConfig ? `已配置 · 上次备份 ${lastBackupTime}` : '未配置 · 需先完成云端连接' }}
                </div>
              </div>
              <span class="strategy-badge" :class="hasCloudConfig ? 'success' : 'manual'">
                {{ hasCloudConfig ? '已配置' : '待配置' }}
              </span>
            </div>
            <div class="compact-meta">
              <span>{{ backupFiles.length ? `最近 ${backupFiles.length} 份` : '暂无备份列表' }}</span>
              <span>上传前加密</span>
            </div>
            <div class="btn-row" style="margin-top: 10px">
              <button
                class="btn btn-primary"
                style="flex: 1"
                type="button"
                :disabled="isBackingUp"
                @click="$emit('backup')"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style="width: 15px; height: 15px"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {{ isBackingUp ? '备份中...' : '立即备份' }}
              </button>
              <button
                class="btn btn-outline"
                style="flex: 1"
                type="button"
                :disabled="isRefreshingList"
                @click="$emit('refresh-backups')"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style="width: 15px; height: 15px"
                  aria-hidden="true"
                >
                  <path d="M8 6h13" />
                  <path d="M8 12h13" />
                  <path d="M8 18h13" />
                  <path d="M3 6h.01" />
                  <path d="M3 12h.01" />
                  <path d="M3 18h.01" />
                </svg>
                {{ isRefreshingList ? '加载中...' : '查看备份' }}
              </button>
            </div>
            <ul v-if="backupFiles.length" class="backup-file-list compact-list">
              <li v-for="file in backupFiles" :key="file.name" class="backup-file-item">
                <div>
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-date">{{ formatBackupTime(file.lastModified) }}</div>
                </div>
                <div style="display: flex; gap: 8px">
                  <button
                    class="btn btn-outline btn-sm"
                    type="button"
                    @click="$emit('restore', file.name)"
                  >
                    恢复
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    type="button"
                    @click="$emit('delete-backup', file.name)"
                  >
                    删除
                  </button>
                </div>
              </li>
            </ul>
            <div v-else-if="shouldShowBackupHint" class="info-text compact-info">{{ backupListHint }}</div>
          </div>

          <div class="compact-item">
            <div class="compact-head">
              <div>
                <div class="compact-title">本地迁移</div>
                <div class="compact-desc">手动导出或导入</div>
              </div>
              <span class="strategy-badge manual">手动</span>
            </div>
            <div class="btn-row">
              <button class="btn btn-outline" style="flex: 1" type="button" @click="$emit('export')">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style="width: 15px; height: 15px"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出 JSON
              </button>
              <button class="btn btn-outline" style="flex: 1" type="button" @click="$emit('import')">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style="width: 15px; height: 15px"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                导入 JSON
              </button>
            </div>
            <div class="inline-note">
              <span class="hint-badge">注意</span>
              <span>导入会覆盖本地数据</span>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">个性化</div>
        <div class="form-group">
          <label class="form-label" for="siteName">网站名称</label>
          <input
            id="siteName"
            class="form-input"
            type="text"
            :value="siteName"
            placeholder="SnapKeep "
            @input="$emit('update:site-name', $event.target.value)"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="siteIcon">图标</label>
          <input
            id="siteIcon"
            class="form-input"
            type="text"
            :value="siteIcon"
            placeholder="🔖 或 https://example.com/icon.png"
            @input="$emit('update:site-icon', $event.target.value)"
          />
          <div class="form-hint">支持 emoji 或图片 URL。</div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="section-toolbar">
          <div>
            <div class="drawer-section-title section-toolbar-title">云端连接</div>
            <div class="toolbar-meta">{{ cloudProviderSummary }}</div>
          </div>
          <button class="btn btn-outline btn-sm" type="button" @click="toggleCloudConfig">
            {{ isCloudConfigExpanded ? '收起连接' : '管理连接' }}
          </button>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">服务器地址</div>
            <div class="summary-value">{{ cloudServerValue }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">用户名</div>
            <div class="summary-value">{{ webdavUser || '未设置' }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">加密密码</div>
            <div class="summary-value">{{ encryptPwd ? '已设置' : '未设置' }}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">代理地址</div>
            <div class="summary-value">{{ backupProxyUrl?.trim() || '默认代理' }}</div>
          </div>
        </div>
        <div class="inline-note cloud-summary-note">
          <span class="hint-badge">状态</span>
          <span>连接信息已保存</span>
          <span>修改或测试请进入管理连接</span>
        </div>
        <div v-if="isCloudConfigExpanded" class="expanded-config">
          <div class="form-group">
            <label class="form-label" for="backupProxyUrl">备份代理地址</label>
            <input
              id="backupProxyUrl"
              class="form-input"
              type="url"
              :value="backupProxyUrl"
              placeholder="https://api.example.com/api/backup（留空使用默认）"
              @input="$emit('update:backup-proxy-url', $event.target.value)"
            />
            <div class="form-hint">填写你自己的代理地址；留空时自动使用默认代理地址。</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="webdavProvider">提供方</label>
            <select
              id="webdavProvider"
              class="form-input"
              :value="webdavProvider"
              @change="$emit('update:webdav-provider', $event.target.value)"
            >
              <option v-for="provider in providers" :key="provider.key" :value="provider.key">
                {{ provider.label }}
              </option>
            </select>
          </div>
          <div v-show="!isCustomProvider" class="form-group">
            <div class="preset-address">
              服务器地址已预置：<code>{{ presetServerAddress || '—' }}</code>
            </div>
          </div>
          <div v-show="isCustomProvider" class="form-group">
            <label class="form-label" for="webdavServer">服务器地址</label>
            <input
              id="webdavServer"
              class="form-input"
              type="url"
              :value="webdavServer"
              placeholder="https://dav.jianguoyun.com/dav/"
              @input="$emit('update:webdav-server', $event.target.value)"
            />
            <div class="form-hint">自定义时填写完整地址（含路径）。</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="webdavUser">用户名</label>
            <input
              id="webdavUser"
              class="form-input"
              type="text"
              :value="webdavUser"
              placeholder="输入 WebDAV 用户名"
              @input="$emit('update:webdav-user', $event.target.value)"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="webdavPwd">密码</label>
            <div class="password-wrapper">
              <input
                id="webdavPwd"
                class="form-input"
                :type="showWebdavPwd ? 'text' : 'password'"
                :value="webdavPwd"
                placeholder="输入 WebDAV 密码"
                @input="$emit('update:webdav-pwd', $event.target.value)"
              />
              <button
                class="password-toggle"
                type="button"
                title="显示/隐藏密码"
                aria-label="显示或隐藏 WebDAV 密码"
                @click="$emit('toggle-webdav-pwd')"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="encryptPwd">云端备份加密密码</label>
            <div class="password-wrapper">
              <input
                id="encryptPwd"
                class="form-input"
                :type="showEncryptPwd ? 'text' : 'password'"
                :value="encryptPwd"
                placeholder="用于备份文件加密/解密（请牢记）"
                @input="$emit('update:encrypt-pwd', $event.target.value)"
              />
              <button
                class="password-toggle"
                type="button"
                title="显示/隐藏密码"
                aria-label="显示或隐藏数据加密密码"
                @click="$emit('toggle-encrypt-pwd')"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
          <div class="btn-row">
            <button
              class="btn btn-outline"
              style="flex: 1"
              type="button"
              :disabled="isTestingWebdav"
              @click="$emit('test-webdav')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="width: 14px; height: 14px"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {{ isTestingWebdav ? '测试中...' : '测试连接' }}
            </button>
            <button class="btn btn-primary" style="flex: 1" type="button" @click="$emit('save-config')">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="width: 14px; height: 14px"
                aria-hidden="true"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              保存配置
            </button>
          </div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">数据与存储</div>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">{{ notesCount }}</div>
            <div class="stat-label">记录总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ usedStorage }}</div>
            <div class="stat-label">已用存储</div>
          </div>
          <div class="stat-card full">
            <div class="stat-value" style="font-size: 15px">{{ lastBackupTime }}</div>
            <div class="stat-label">上次备份时间</div>
          </div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">帮助与关于</div>
        <p class="info-text">
          数据默认仅存储于浏览器中。仅在你主动备份或恢复时，经备份代理转发，不做云端托管。
        </p>
        <p class="version-text">{{ versionText }}</p>
        <div style="margin-top: 12px">
          <button class="btn btn-outline btn-sm" type="button">部署说明</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
  import { computed, ref } from 'vue';

  const props = defineProps({
    isOpen: { type: Boolean, default: false },
    webdavProvider: { type: String, default: '' },
    providers: { type: Array, default: () => [] },
    isCustomProvider: { type: Boolean, default: false },
    presetServerAddress: { type: String, default: '' },
    webdavServer: { type: String, default: '' },
    webdavUser: { type: String, default: '' },
    webdavPwd: { type: String, default: '' },
    encryptPwd: { type: String, default: '' },
    backupProxyUrl: { type: String, default: '' },
    showWebdavPwd: { type: Boolean, default: false },
    showEncryptPwd: { type: Boolean, default: false },
    isTestingWebdav: { type: Boolean, default: false },
    isBackingUp: { type: Boolean, default: false },
    isRefreshingList: { type: Boolean, default: false },
    backupFiles: { type: Array, default: () => [] },
    formatBackupTime: { type: Function, required: true },
    backupListHint: { type: String, default: '' },
    siteName: { type: String, default: '' },
    siteIcon: { type: String, default: '' },
    notesCount: { type: [Number, String], default: '—' },
    usedStorage: { type: String, default: '—' },
    lastBackupTime: { type: String, default: '—' },
    versionText: { type: String, default: '' }
  });

  const DEFAULT_BACKUP_HINT = '通过同源备份代理服务连接 WebDAV，规避跨域限制。';
  const isCloudConfigExpanded = ref(false);

  const hasCloudConfig = computed(() =>
    Boolean(
      props.webdavUser ||
        props.encryptPwd ||
        props.backupProxyUrl?.trim() ||
        (props.isCustomProvider && props.webdavServer)
    )
  );

  const shouldShowBackupHint = computed(
    () =>
      !props.backupFiles.length &&
      Boolean(props.backupListHint) &&
      props.backupListHint !== DEFAULT_BACKUP_HINT
  );

  const cloudProviderSummary = computed(() => {
    const provider = props.providers.find((item) => item.key === props.webdavProvider);
    return provider?.label ? `${provider.label} · ${hasCloudConfig.value ? '已配置' : '待配置'}` : '未配置';
  });

  const cloudServerValue = computed(() =>
    props.isCustomProvider ? props.webdavServer || '未设置' : props.presetServerAddress || '未设置'
  );

  const toggleCloudConfig = () => {
    isCloudConfigExpanded.value = !isCloudConfigExpanded.value;
  };

  defineEmits([
    'close',
    'update:webdav-provider',
    'update:webdav-server',
    'update:webdav-user',
    'update:webdav-pwd',
    'update:encrypt-pwd',
    'update:backup-proxy-url',
    'toggle-webdav-pwd',
    'toggle-encrypt-pwd',
    'test-webdav',
    'save-config',
    'backup',
    'refresh-backups',
    'restore',
    'delete-backup',
    'export',
    'import',
    'update:site-name',
    'update:site-icon'
  ]);
</script>
