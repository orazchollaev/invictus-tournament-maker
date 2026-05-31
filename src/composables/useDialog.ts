import { reactive } from "vue"

interface DialogState {
  visible: boolean
  type: "alert" | "confirm"
  message: string
  confirmLabel: string
  dangerous: boolean
  resolve: ((value: boolean) => void) | null
}

export const dialogState = reactive<DialogState>({
  visible: false,
  type: "alert",
  message: "",
  confirmLabel: "Confirm",
  dangerous: false,
  resolve: null,
})

export function resolveDialog(value: boolean) {
  dialogState.visible = false
  dialogState.resolve?.(value)
  dialogState.resolve = null
}

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    dialogState.type = "alert"
    dialogState.message = message
    dialogState.dangerous = false
    dialogState.confirmLabel = "OK"
    dialogState.resolve = () => resolve()
    dialogState.visible = true
  })
}

export interface ConfirmOptions {
  confirmLabel?: string
  dangerous?: boolean
}

export function showConfirm(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    dialogState.type = "confirm"
    dialogState.message = message
    dialogState.dangerous = opts.dangerous ?? false
    dialogState.confirmLabel = opts.confirmLabel ?? "Confirm"
    dialogState.resolve = resolve
    dialogState.visible = true
  })
}
