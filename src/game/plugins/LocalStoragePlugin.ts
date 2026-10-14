import type { Game2048, GameExtension } from '../Game2048'

export const SAVE_KEY = 'vue-2048:save:v1'

/** Optional persistence: unavailable storage never interrupts the game. */
export class LocalStoragePlugin implements GameExtension {
  readonly name = 'local-storage'
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>
  private readonly key: string

  constructor(storage: Pick<Storage, 'getItem' | 'setItem'>, key = SAVE_KEY) {
    this.storage = storage
    this.key = key
  }

  install(game: Game2048): () => void {
    try {
      const saved = this.storage.getItem(this.key)
      if (saved) game.restore(JSON.parse(saved))
    } catch {
      // Corrupt data and blocked browser storage fall back to a fresh game.
    }

    const save = () => {
      try {
        this.storage.setItem(this.key, JSON.stringify(game.snapshot()))
      } catch {
        // Gameplay remains available when storage is full or disabled.
      }
    }
    save()
    return game.subscribe(save)
  }
}
