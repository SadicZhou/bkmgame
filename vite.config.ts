import { defineConfig } from 'vite'

/**
 * Vite 配置：开发服务器绑定非常见端口；构建时把 Phaser 拆成独立 chunk，
 * 游戏代码更新时浏览器可继续使用缓存的引擎文件。
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
  build: {
    // Phaser 是预打包的单体库（压缩后约 1.2 MB），无法再细拆；阈值只为它放宽
    chunkSizeWarningLimit: 1300,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }],
        },
      },
    },
  },
})
