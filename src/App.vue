<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import GameBoard from './components/GameBoard.vue'
import type { Direction } from './game/Game2048'
import { useGame2048 } from './plugins/Game2048Plugin'

const game = useGame2048()
const state = game.state
const highestTile = computed(() => Math.max(...state.board))
const number = (value: number) => value.toLocaleString('zh-CN')
const directions: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  w: 'up',
  d: 'right',
  s: 'down',
  a: 'left',
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (target instanceof HTMLElement &&
      (target.isContentEditable || target.closest('input, textarea, select')))
  ) {
    return
  }
  const direction = directions[event.key] ?? directions[event.key.toLowerCase()]
  if (direction) {
    event.preventDefault()
    game.move(direction)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="./" aria-label="2048 首页">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span>数字游乐场<span class="brand-dot">.</span></span>
      </a>
      <span class="header-note">一个棋盘，无限可能</span>
    </header>

    <main>
      <div class="intro">
        <p class="eyebrow"><span></span> SMALL MOVES, BIG POSSIBILITIES</p>
        <h1>再走一步<span>。</span></h1>
        <p class="intro-description">把相同的数字放在一起，看看你能走多远。</p>
      </div>

      <div class="game-layout">
        <section class="game-panel" aria-label="2048 游戏">
          <div class="game-heading">
            <div class="game-title">2048<span>合并的乐趣</span></div>
            <div class="scoreboard">
              <div class="score-box">
                <span>当前得分</span><strong>{{ number(state.score) }}</strong>
              </div>
              <div class="score-box best-score">
                <span>最高纪录</span><strong>{{ number(state.bestScore) }}</strong>
              </div>
            </div>
          </div>

          <div class="game-toolbar">
            <span class="game-hint">从 <b>2</b> 开始，向 <b>2048</b> 出发</span>
            <div class="toolbar-actions">
              <button class="button button-quiet" :disabled="!game.canUndo" @click="game.undo()">
                <span aria-hidden="true">↶</span> 撤销
              </button>
              <button class="button button-dark" @click="game.restart()">
                新游戏 <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>

          <GameBoard :board="state.board" :status="state.status" @move="game.move($event)">
            <div
              v-if="state.status !== 'playing'"
              class="game-overlay"
              role="group"
              aria-label="游戏结果"
            >
              <span class="result-symbol" aria-hidden="true">{{
                state.status === 'won' ? '✦' : '↶'
              }}</span>
              <h2>{{ state.status === 'won' ? '你做到了！' : '这次，就到这里。' }}</h2>
              <p>
                {{
                  state.status === 'won'
                    ? '2048 只是开始，下一站是 4096。'
                    : `收获了 ${number(state.score)} 分，再来一局吧。`
                }}
              </p>
              <button
                v-if="state.status === 'won'"
                class="button button-dark"
                @click="game.continueGame()"
              >
                继续挑战 →
              </button>
              <button v-else class="button button-dark" @click="game.restart()">再试一次 →</button>
              <button v-if="game.canUndo" class="button button-quiet" @click="game.undo()">
                撤销上一步
              </button>
            </div>
          </GameBoard>

          <div class="board-footer">
            <span
              ><span class="keyboard-icon" aria-hidden="true">⌨</span> 方向键 / WASD ·
              触屏滑动</span
            >
            <span class="move-count">{{ number(state.moves) }} 步</span>
          </div>
          <div class="direction-controls" role="group" aria-label="方向控制">
            <button aria-label="向左移动" @click="game.move('left')">←</button>
            <button aria-label="向上移动" @click="game.move('up')">↑</button>
            <button aria-label="向下移动" @click="game.move('down')">↓</button>
            <button aria-label="向右移动" @click="game.move('right')">→</button>
          </div>
          <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
            得分 {{ state.score }}，已移动 {{ state.moves }} 步。
            {{
              state.status === 'won'
                ? '恭喜达成 2048！可继续挑战。'
                : state.status === 'over'
                  ? '游戏结束。'
                  : ''
            }}
          </p>
        </section>

        <aside class="game-sidebar" aria-label="玩法说明">
          <div class="how-to">
            <p class="eyebrow">HOW TO PLAY</p>
            <h2>简单三步，<br />一点点上瘾。</h2>
            <ol class="instructions">
              <li>
                <span class="step-number">01</span>
                <div>
                  <h3>向一个方向移动</h3>
                  <p>用方向键，或在棋盘上滑动。<br />所有数字会一起向前。</p>
                </div>
              </li>
              <li>
                <span class="step-number">02</span>
                <div>
                  <h3>让相同的数字相遇</h3>
                  <p>两个相同数字合并为它们的和，<br />每次合并都会增加得分。</p>
                </div>
              </li>
              <li>
                <span class="step-number">03</span>
                <div>
                  <h3>向 2048 靠近</h3>
                  <p>留一点空间，想好下一步。<br />棋盘满了且无法合并时结束。</p>
                </div>
              </li>
            </ol>
            <div class="merge-example" aria-label="2 加 2 合并为 4">
              <span>2</span><i>+</i><span>2</span><i>→</i><span class="example-result">4</span>
            </div>
          </div>
          <div class="personal-best">
            <span class="personal-best-icon" aria-hidden="true">✦</span>
            <div>
              <span>本局最大数字</span><strong>{{ number(highestTile) }}</strong>
            </div>
            <span class="personal-best-label">KEEP GOING</span>
          </div>
          <p class="little-tip">小提示：把最大的数字留在角落，<br />给新的可能留出位置。</p>
        </aside>
      </div>
    </main>

    <footer class="site-footer">
      <span>不必着急，下一步也许就有惊喜。</span><span>MADE FOR A LITTLE BREAK</span>
    </footer>
  </div>
</template>
