import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Game2048 } from '../src/game/Game2048.ts'
import { LocalStoragePlugin, SAVE_KEY } from '../src/game/plugins/LocalStoragePlugin.ts'

function load(board, extra = {}) {
  const game = new Game2048(() => 0)
  assert.equal(
    game.restore({
      board: [...board, ...Array(16 - board.length).fill(0)],
      score: 0,
      bestScore: 0,
      moves: 0,
      hasWon: false,
      keepPlaying: false,
      ...extra,
    }),
    true,
  )
  return game
}

test('starts with two tiles and no undo history', () => {
  const game = new Game2048(() => 0)
  assert.equal(game.state.board.filter(Boolean).length, 2)
  assert.equal(game.state.score, 0)
  assert.equal(game.canUndo, false)
})

test('merges each tile at most once: 2,2,2,2 becomes 4,4', () => {
  const game = load([2, 2, 2, 2])
  assert.equal(game.move('left'), true)
  assert.deepEqual(game.state.board.slice(0, 4), [4, 4, 2, 0])
  assert.equal(game.state.score, 8)
  assert.equal(game.state.moves, 1)
})

test('compacts gaps before merging without merging the result again', () => {
  const game = load([2, 0, 2, 4])
  game.move('left')
  assert.deepEqual(game.state.board.slice(0, 4), [4, 4, 2, 0])
  assert.equal(game.state.score, 4)
})

test('right moves use the rightmost pair first', () => {
  const game = load([2, 2, 2, 0])
  game.move('right')
  assert.deepEqual(game.state.board.slice(0, 4), [2, 0, 2, 4])
  assert.equal(game.state.score, 4)
})

test('up and down merge in their own direction', () => {
  const board = [2, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0]
  const up = load(board)
  up.move('up')
  assert.deepEqual(
    [0, 4, 8, 12].map((index) => up.state.board[index]),
    [4, 8, 0, 0],
  )
  assert.equal(up.state.score, 12)
  const down = load(board)
  down.move('down')
  assert.deepEqual(
    [0, 4, 8, 12].map((index) => down.state.board[index]),
    [2, 0, 4, 8],
  )
  assert.equal(down.state.score, 12)
})

test('blocked moves leave tiles, score, events, and undo history untouched', () => {
  const game = load([4, 8, 16, 0])
  let events = 0
  game.subscribe(() => events++)
  const before = game.snapshot()
  assert.equal(game.move('left'), false)
  assert.deepEqual(game.snapshot(), before)
  assert.equal(events, 0)
  assert.equal(game.canUndo, false)
  game.move('right')
  assert.equal(game.canUndo, true)
  const after = game.snapshot()
  assert.equal(game.move('right'), false)
  assert.deepEqual(game.snapshot(), after)
  assert.equal(events, 1)
  assert.equal(game.undo(), true)
  assert.deepEqual(game.snapshot(), before)
})

test('undo restores the exact board and score once, preserving the best score', () => {
  const game = load([2, 2, 0, 0])
  const board = [...game.state.board]
  game.move('left')
  assert.equal(game.undo(), true)
  assert.deepEqual(game.state.board, board)
  assert.equal(game.state.score, 0)
  assert.equal(game.state.moves, 0)
  assert.equal(game.state.bestScore, 4)
  assert.equal(game.undo(), false)
})

test('a full board with no adjacent matches is over, including row boundaries', () => {
  const game = load([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2])
  assert.equal(game.state.status, 'over')
  assert.equal(game.move('left'), false)
})

test('a full board with a horizontal or vertical match is still playable', () => {
  const horizontal = load([2, 2, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32, 64])
  assert.equal(horizontal.state.status, 'playing')
  const vertical = load([2, 4, 8, 16, 2, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32, 64])
  assert.equal(vertical.state.status, 'playing')
})

test('detects game over after the new tile fills the board', () => {
  const game = load([0, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32, 64])
  assert.equal(game.move('left'), true)
  assert.equal(game.state.status, 'over')
  assert.equal(game.undo(), true)
  assert.equal(game.state.status, 'playing')
})

test('2048 pauses the game until continue, and never pauses again', () => {
  const game = load([1024, 1024])
  game.move('left')
  assert.equal(game.state.status, 'won')
  assert.equal(game.state.score, 2048)
  assert.equal(game.move('right'), false)
  game.continueGame()
  assert.equal(game.state.status, 'playing')
  assert.equal(game.move('right'), true)
  assert.equal(game.state.status, 'playing')
})

test('restart resets the game and undo but retains the record', () => {
  const game = load([2, 2])
  game.move('left')
  game.restart()
  assert.equal(game.state.bestScore, 4)
  assert.equal(game.state.score, 0)
  assert.equal(game.state.moves, 0)
  assert.equal(game.state.status, 'playing')
  assert.equal(game.state.board.filter(Boolean).length, 2)
  assert.equal(game.canUndo, false)
})

test('restore and snapshots do not share mutable board arrays', () => {
  const game = load([2, 4])
  const snapshot = game.snapshot()
  snapshot.board[0] = 64
  assert.equal(game.state.board[0], 2)
  assert.equal(game.restore(snapshot), true)
  snapshot.board[0] = 128
  assert.equal(game.state.board[0], 64)
})

test('rejects invalid saves without replacing the current game', () => {
  const game = load([2, 4])
  const before = game.snapshot()
  for (const invalid of [
    null,
    {},
    { ...before, board: [] },
    { ...before, board: Array(16).fill(0) },
    { ...before, board: Array(16).fill(3) },
    { ...before, board: Array(16).fill(-2) },
    { ...before, board: Array(16).fill(Number.NaN) },
    { ...before, board: Array(16).fill(Number.MAX_SAFE_INTEGER) },
    { ...before, board: Array(16).fill('2') },
    { ...before, score: -1 },
    { ...before, moves: 0.5 },
    { ...before, keepPlaying: 'true' },
  ]) {
    assert.equal(game.restore(invalid), false)
    assert.deepEqual(game.snapshot(), before)
  }
})

test('restored flags cannot skip the first victory or corrupt the status', () => {
  const game = load([1024, 1024], { keepPlaying: true, status: 'over' })
  assert.equal(game.state.keepPlaying, false)
  assert.equal(game.state.status, 'playing')
  game.move('left')
  assert.equal(game.state.status, 'won')
})

test('extensions register once and clean up their subscriptions', () => {
  const game = load([2, 2])
  let events = 0
  let cleanups = 0
  const extension = {
    name: 'test',
    install(engine) {
      const unsubscribe = engine.subscribe(() => events++)
      return () => {
        unsubscribe()
        cleanups++
      }
    },
  }
  assert.equal(game.use(extension), game)
  assert.throws(() => game.use(extension), /already registered/)
  game.move('left')
  assert.equal(events, 1)
  game.dispose()
  game.restart()
  assert.equal(events, 1)
  assert.equal(cleanups, 1)
})

test('local storage persists and restores the board, score, record, and win state', () => {
  const data = new Map()
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }
  const game = load([1024, 1024])
  game.use(new LocalStoragePlugin(storage))
  game.move('left')
  const restored = new Game2048(() => 0).use(new LocalStoragePlugin(storage))
  assert.deepEqual(restored.snapshot(), game.snapshot())
  assert.equal(restored.state.status, 'won')
  assert.equal(restored.canUndo, false)
  restored.continueGame()
  assert.equal(JSON.parse(data.get(SAVE_KEY)).keepPlaying, true)
})

test('corrupt or unavailable storage does not break gameplay', () => {
  for (const storage of [
    { getItem: () => '{broken', setItem: () => {} },
    {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
    },
  ]) {
    const game = new Game2048(() => 0)
    assert.doesNotThrow(() => game.use(new LocalStoragePlugin(storage)))
    assert.equal(game.move('left'), true)
  }
})
