import { useRoute } from "vue-router"

export function useNavActive() {
  const route = useRoute()

  const isNavActive = (prefix: string) =>
    route.path === prefix || route.path.startsWith(prefix + "/")

  return { isNavActive }
}
