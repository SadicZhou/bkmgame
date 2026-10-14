import { defineConfig } from 'vite'

/**
 * Vite 开发服务器配置：绑定非常见端口，避免与默认端口冲突。
 * @author zjh
 * @date 2026-10-14
 */
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 45321,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 45322,
    strictPort: true,
  },
})
