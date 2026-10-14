import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { Game2048Plugin } from './plugins/Game2048Plugin'
import { LocalStoragePlugin } from './game/plugins/LocalStoragePlugin'
import type { GameExtension } from './game/Game2048'

const extensions: GameExtension[] = []
try {
  extensions.push(new LocalStoragePlugin(window.localStorage))
} catch {
  // Some browser privacy settings block access to localStorage itself.
}

createApp(App).use(new Game2048Plugin({ extensions })).mount('#app')
