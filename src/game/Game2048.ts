export const BOARD_SIZE = 4

export type Direction = 'up' | 'right' | 'down' | 'left'
export type GameStatus = 'playing' | 'won' | 'over'

export interface GameSnapshot {
  board: number[]
  score: number
  bestScore: number
  moves: number
  hasWon: boolean
  keepPlaying: boolean
}

export interface GameState extends GameSnapshot {
  status: GameStatus
}

/** Extensions register once and return a cleanup function if needed. */
export interface GameExtension {
  readonly name: string
  install(game: Game2048): (() => void) | void
}

export class Game2048 {
  readonly state: GameState = {
    board: Array<number>(BOARD_SIZE ** 2).fill(0),
    score: 0,
    bestScore: 0,
    moves: 0,
    hasWon: false,
    keepPlaying: false,
    status: 'playing',
  }

  private previous: GameSnapshot | null = null
  private readonly random: () => number
  private readonly listeners = new Set<() => void>()
  private readonly extensions = new Map<string, (() => void) | void>()

  constructor(random: () => number = Math.random) {
    this.random = random
    this.restart()
  }

  get canUndo(): boolean {
    return this.previous !== null
  }

  use(extension: GameExtension): this {
    if (this.extensions.has(extension.name)) {
      throw new Error(`Game extension "${extension.name}" is already registered.`)
    }
    this.extensions.set(extension.name, extension.install(this))
    return this
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    for (const cleanup of [...this.extensions.values()].reverse()) cleanup?.()
    this.extensions.clear()
    this.listeners.clear()
  }

  restart(): void {
    Object.assign(this.state, {
      board: Array<number>(BOARD_SIZE ** 2).fill(0),
      score: 0,
      moves: 0,
      hasWon: false,
      keepPlaying: false,
      status: 'playing',
    })
    this.previous = null
    this.spawnTile()
    this.spawnTile()
    this.notify()
  }

  move(direction: Direction): boolean {
    if (this.state.status !== 'playing') return false

    const board = [...this.state.board]
    let earned = 0

    for (let line = 0; line < BOARD_SIZE; line++) {
      const indices = this.lineIndices(direction, line)
      const values = indices.map((index) => board[index] ?? 0).filter(Boolean)
      const merged: number[] = []

      for (let index = 0; index < values.length; index++) {
        const value = values[index]!
        if (value === values[index + 1]) {
          merged.push(value * 2)
          earned += value * 2
          index++
        } else {
          merged.push(value)
        }
      }

      indices.forEach((index, offset) => {
        board[index] = merged[offset] ?? 0
      })
    }

    // A blocked move must not spawn a tile, replace undo, or notify extensions.
    if (board.every((value, index) => value === this.state.board[index])) return false

    this.previous = this.snapshot()
    this.state.board = board
    this.state.score += earned
    this.state.bestScore = Math.max(this.state.bestScore, this.state.score)
    this.state.moves++
    this.spawnTile()
    this.updateStatus()
    this.notify()
    return true
  }

  undo(): boolean {
    if (!this.previous) return false
    const bestScore = this.state.bestScore
    Object.assign(this.state, this.previous, { bestScore })
    this.previous = null
    this.updateStatus()
    this.notify()
    return true
  }

  continueGame(): void {
    if (this.state.status !== 'won') return
    this.state.keepPlaying = true
    this.updateStatus()
    this.notify()
  }

  snapshot(): GameSnapshot {
    const { board, score, bestScore, moves, hasWon, keepPlaying } = this.state
    return { board: [...board], score, bestScore, moves, hasWon, keepPlaying }
  }

  /** Validate persisted data before replacing a live game. */
  restore(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false
    const saved = value as Partial<GameSnapshot>
    if (
      !Array.isArray(saved.board) ||
      saved.board.length !== BOARD_SIZE ** 2 ||
      !saved.board.some((tile) => tile !== 0) ||
      !Array.from(saved.board).every(
        (tile) =>
          typeof tile === 'number' &&
          Number.isSafeInteger(tile) &&
          (tile === 0 || (tile >= 2 && 2 ** Math.round(Math.log2(tile)) === tile)),
      ) ||
      !this.isCounter(saved.score) ||
      !this.isCounter(saved.bestScore) ||
      !this.isCounter(saved.moves) ||
      typeof saved.hasWon !== 'boolean' ||
      typeof saved.keepPlaying !== 'boolean'
    ) {
      return false
    }

    const hasWon = saved.board.some((tile) => tile >= 2048)
    Object.assign(this.state, {
      board: [...saved.board],
      score: saved.score,
      bestScore: Math.max(this.state.bestScore, saved.bestScore, saved.score),
      moves: saved.moves,
      hasWon,
      keepPlaying: hasWon && saved.keepPlaying,
    })
    this.previous = null
    this.updateStatus()
    this.notify()
    return true
  }

  private isCounter(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
  }

  private lineIndices(direction: Direction, line: number): number[] {
    return Array.from({ length: BOARD_SIZE }, (_, offset) => {
      switch (direction) {
        case 'left':
          return line * BOARD_SIZE + offset
        case 'right':
          return line * BOARD_SIZE + BOARD_SIZE - 1 - offset
        case 'up':
          return offset * BOARD_SIZE + line
        case 'down':
          return (BOARD_SIZE - 1 - offset) * BOARD_SIZE + line
      }
    })
  }

  private spawnTile(): void {
    const empty = this.state.board.flatMap((value, index) => (value === 0 ? [index] : []))
    if (!empty.length) return
    const index = empty[Math.floor(this.random() * empty.length)]!
    this.state.board[index] = this.random() < 0.9 ? 2 : 4
  }

  private updateStatus(): void {
    this.state.hasWon = this.state.board.some((value) => value >= 2048)
    if (this.state.hasWon && !this.state.keepPlaying) {
      this.state.status = 'won'
    } else {
      this.state.status = this.hasAvailableMove() ? 'playing' : 'over'
    }
  }

  private hasAvailableMove(): boolean {
    return this.state.board.some((value, index, board) => {
      if (value === 0) return true
      const right = index % BOARD_SIZE < BOARD_SIZE - 1 && value === board[index + 1]
      const down = index < BOARD_SIZE * (BOARD_SIZE - 1) && value === board[index + BOARD_SIZE]
      return right || down
    })
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
