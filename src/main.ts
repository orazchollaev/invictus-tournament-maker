import { createApp } from "vue"
import { createPinia } from "pinia"
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2"
import { MotionPlugin } from "@vueuse/motion"

import router from "./router"
import App from "./App.vue"
import i18n from "./i18n"

import "./assets/style/index.css"

const pinia = createPinia()
const persistedStatePlugin = createPersistedStatePlugin({
  storage: window.localStorage,
})
pinia.use(persistedStatePlugin)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(MotionPlugin)
app.mount("#app")
