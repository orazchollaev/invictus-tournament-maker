import { createApp } from "vue"
import "@/assets/style/index.css"
import App from "./App.vue"

// The app's tokens, themed the way the device is.
const dark = window.matchMedia("(prefers-color-scheme: dark)")
const applyTheme = () => (document.documentElement.dataset.theme = dark.matches ? "dark" : "light")
applyTheme()
dark.addEventListener("change", applyTheme)

createApp(App).mount("#app")
