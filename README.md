# 2048 · 再走一步

Vue + TypeScript 的 2048 游戏。使用 class 编写规则，通过 Vue 插件注册游戏实例，通过扩展插件添加功能，不依赖 Pinia 和路由。

## 运行

Node.js `^22.18.0 || >=24.12.0`，pnpm。

```sh
pnpm install
pnpm dev
```

```sh
pnpm test        # 游戏规则、存档和插件生命周期测试
pnpm build       # 类型检查与生产构建
pnpm lint        # Oxlint + ESLint
```

当前项目保留 Vue RC 与 typescript-native-bridge 的 workspace overrides。VS Code 可选择工作区 TypeScript 版本。

## 玩法

- 方向键、WASD、棋盘滑动或方向按钮移动。
- 相同数字合并，每个方块在一次移动中最多合并一次。
- 有效移动后随机生成一个 2（90%）或 4（10%）；无效移动不生成方块。
- 支持撤销一步、新游戏、达到 2048 后继续挑战。
- 自动保存棋盘、得分、最高纪录和继续挑战状态。刷新后恢复进度；撤销历史仅在当前会话保留。浏览器禁用存储时仍可游玩。

## 架构

```text
src/
  game/
    Game2048.ts                  # 纯 TypeScript class、规则、事件与扩展注册
    plugins/LocalStoragePlugin.ts # class 存档扩展
  plugins/Game2048Plugin.ts       # Vue install / provide / inject 与响应式适配
  components/GameBoard.vue        # 棋盘渲染与滑动输入
  App.vue                        # 游戏界面与键盘输入
  main.ts                        # 插件注册入口
```

Vue 插件注册：

```ts
createApp(App)
  .use(
    new Game2048Plugin({
      extensions: [new LocalStoragePlugin(window.localStorage)],
    }),
  )
  .mount('#app')
```

组件内用 `useGame2048()` 获取同一个响应式 class 实例，调用 `move()`、`undo()`、`restart()`、`continueGame()`，通过 `game.state` 读取状态。

游戏扩展实现 `GameExtension`，可通过 `extensions` 注册，也可调用 `game.use()`。用 `subscribe()` 监听有效状态变化；`install()` 返回清理函数，在 Vue 应用卸载时自动执行。例如：

```ts
import type { Game2048, GameExtension } from './src/game/Game2048'

class ScoreLoggerPlugin implements GameExtension {
  readonly name = 'score-logger'

  install(game: Game2048) {
    return game.subscribe(() => console.log(game.state.score))
  }
}
```

扩展名称必须唯一。核心引擎不依赖 Vue 或浏览器，可独立测试，也可接入其他界面。
