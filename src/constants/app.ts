// package.json sits outside src/, so this is the one spot the "@/" alias cannot
// reach. Reading it here keeps that exception to a single file.
// eslint-disable-next-line no-restricted-imports -- see above
import { version } from "../../package.json"

export const APP_VERSION = version
