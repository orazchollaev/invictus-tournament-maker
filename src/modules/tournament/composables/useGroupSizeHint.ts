import { computed, toValue, type MaybeRefOrGetter } from "vue"
import { useI18n } from "vue-i18n"
import { groupSizeSplit } from "../utils/groupSizes"

/**
 * The line under the "number of groups" stepper, shared by the create page and
 * the settings page so both describe the same draw the same way.
 *
 * It used to read "~{n} teams per group" off a single `Math.ceil`, which hid
 * the common case: 29 teams in 8 groups is not "~4 per group", it is five
 * groups of 4 and three of 3. Both bands are named now.
 */
export function useGroupSizeHint(
  teamCount: MaybeRefOrGetter<number>,
  groupCount: MaybeRefOrGetter<number>
) {
  const { t } = useI18n()

  return computed(() => {
    const split = groupSizeSplit(toValue(teamCount), toValue(groupCount))
    if (!split) return ""
    if (split.isEven) {
      return t("tournament.create.groupSizeEven", {
        count: split.smaller.count,
        size: split.smaller.size,
      })
    }
    return t("tournament.create.groupSizeSplit", {
      countA: split.larger.count,
      sizeA: split.larger.size,
      countB: split.smaller.count,
      sizeB: split.smaller.size,
    })
  })
}
