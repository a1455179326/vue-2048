import { inject, markRaw, reactive, type App, type InjectionKey } from 'vue'
import { Game2048, type GameExtension } from '@/game/Game2048'

const gameKey: InjectionKey<Game2048> = Symbol('Game2048')

export interface Game2048PluginOptions {
  extensions?: GameExtension[]
  random?: () => number
}

/** Each Vue app owns one reactive class instance and its registered extensions. */
export class Game2048Plugin {
  private readonly options: Game2048PluginOptions

  constructor(options: Game2048PluginOptions = {}) {
    this.options = options
  }

  install(app: App): void {
    const game = reactive(new Game2048(this.options.random)) as Game2048
    for (const extension of this.options.extensions ?? []) game.use(markRaw(extension))
    app.provide(gameKey, game)
    app.onUnmount(() => game.dispose())
  }
}

export function useGame2048(): Game2048 {
  const game = inject(gameKey)
  if (!game) throw new Error('Register Game2048Plugin with app.use() before using the game.')
  return game
}
