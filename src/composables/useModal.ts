import { onMounted, onUnmounted } from "vue"

export function useModal(onClose: () => void) {
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") onClose()
  }

  onMounted(() => {
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKey)
  })

  onUnmounted(() => {
    document.body.style.overflow = ""
    document.removeEventListener("keydown", onKey)
  })
}
