<script setup lang="ts">
import { computed, ref } from 'vue'
import { BOARD_SIZE, type Direction, type GameStatus } from '@/game/Game2048'

const props = defineProps<{ board: number[]; status: GameStatus }>()
const emit = defineEmits<{ move: [direction: Direction] }>()
const rows = computed(() =>
  Array.from({ length: BOARD_SIZE }, (_, row) =>
    props.board.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE),
  ),
)
const pointerStart = ref<{ x: number; y: number; id: number } | null>(null)

function onPointerDown(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0 || props.status !== 'playing') return
  pointerStart.value = { x: event.clientX, y: event.clientY, id: event.pointerId }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerUp(event: PointerEvent) {
  const start = pointerStart.value
  if (!start || start.id !== event.pointerId) return
  pointerStart.value = null
  const x = event.clientX - start.x
  const y = event.clientY - start.y
  if (Math.max(Math.abs(x), Math.abs(y)) < 24) return
  emit('move', Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up')
}

function tileClass(value: number) {
  return value > 2048 ? 'tile-super' : `tile-${value}`
}
</script>

<template>
  <div class="board-container">
    <div
      class="board"
      role="grid"
      aria-label="2048 棋盘，四行四列。使用方向键移动数字。"
      :aria-rowcount="BOARD_SIZE"
      :aria-colcount="BOARD_SIZE"
      tabindex="0"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="pointerStart = null"
      @lostpointercapture="pointerStart = null"
    >
      <div
        v-for="(row, rowIndex) in rows"
        :key="rowIndex"
        class="board-row"
        role="row"
        :aria-rowindex="rowIndex + 1"
      >
        <div
          v-for="(value, columnIndex) in row"
          :key="columnIndex"
          class="board-cell"
          role="gridcell"
          :aria-colindex="columnIndex + 1"
          :aria-label="value ? String(value) : '空格'"
        >
          <span
            v-if="value"
            :key="`${rowIndex}:${columnIndex}:${value}`"
            class="tile"
            :class="[
              tileClass(value),
              { 'tile-small': value >= 1024, 'tile-tiny': value >= 16384 },
            ]"
            aria-hidden="true"
            >{{ value }}</span
          >
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>
