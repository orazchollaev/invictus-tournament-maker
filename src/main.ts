import { createApp } from "vue"
import { createPinia } from "pinia"
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2"

import router from "./router"
import App from "./App.vue"

import "./assets/style/index.css"

const pinia = createPinia()
const persistedStatePlugin = createPersistedStatePlugin({
  storage: window.localStorage,
})
pinia.use(persistedStatePlugin)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount("#app")
