import { ref, type Ref } from "vue"
import { onBeforeRouteLeave } from "vue-router"

export type LeaveChoice = "leave" | "save-leave" | "stay"

export interface UnsavedChangesGuardOptions {
  /** True while the page holds edits worth warning about. */
  hasChanges: Ref<boolean> | (() => boolean)
  /** Called for the "save and leave" choice, before navigation continues. */
  onSave: () => void
}

/**
 * Blocks route changes while a form is dirty and resolves the prompt's answer.
 *
 * The guard suspends on a promise so navigation is decided by whichever button
 * the user presses; `open` drives the dialog and `choose` resolves it.
 */
export function useUnsavedChangesGuard(options: UnsavedChangesGuardOptions) {
  const open = ref(false)
  let resolveChoice: ((choice: LeaveChoice) => void) | null = null

  function isDirty() {
    const { hasChanges } = options
    return typeof hasChanges === "function" ? hasChanges() : hasChanges.value
  }

  onBeforeRouteLeave(async (_to, _from, next) => {
    if (!isDirty()) {
      next()
      return
    }

    open.value = true
    const choice = await new Promise<LeaveChoice>((resolve) => {
      resolveChoice = resolve
    })
    open.value = false

    if (choice === "stay") {
      next(false)
      return
    }
    if (choice === "save-leave") options.onSave()
    next()
  })

  function choose(choice: LeaveChoice) {
    resolveChoice?.(choice)
    resolveChoice = null
  }

  return { open, choose }
}
