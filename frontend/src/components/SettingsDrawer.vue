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
        <div class="drawer-section-title">WebDAV 备份与恢复</div>
        <div class="section-hint">通过同源备份代理服务连接 WebDAV，规避跨域限制。</div>
        <div class="btn-row" style="margin-bottom: 12px">
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
            {{ isBackingUp ? '备份中...' : '一键备份' }}
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
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            {{ isRefreshingList ? '刷新中...' : '刷新列表' }}
          </button>
        </div>
        <ul v-show="backupFiles.length" class="backup-file-list">
          <li v-for="file in backupFiles" :key="file.name" class="backup-file-item">
            <div>
              <div class="file-name">{{ file.name }}</div>
              <div class="file-date">{{ formatBackupTime(file.lastModified) }}</div>
            </div>
            <div style="display: flex; gap: 8px;">
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
        <div class="info-text" style="margin-top: 10px">{{ backupListHint }}</div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">本地导出 / 导入</div>
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
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">网站设置</div>
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
        <div class="drawer-section-title">WebDAV 配置</div>
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
          <div class="form-hint">预置提供方无需手动填写服务器地址。</div>
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
          <label class="form-label" for="encryptPwd">备份数据加密密码</label>
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
        <div class="flex gap-2">
          <button
            class="btn btn-outline btn-block btn-sm"
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
          <button
            class="btn btn-primary btn-block btn-sm"
            type="button"
            @click="$emit('save-config')"
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
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            保存配置
          </button>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">数据统计</div>
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
        <div class="drawer-section-title">隐私与关于</div>
        <p class="info-text">
          SnapKeep
          为本地优先工具，数据默认仅存储于您的浏览器中。WebDAV 配置也仅存储在浏览器中，备份/恢复时经备份代理转发，不做任何云端存储。
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
  defineProps({
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
