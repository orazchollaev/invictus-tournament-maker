/**
 * Player faces drawn with facesjs. A face is a facesjs `FaceConfig` kept on the
 * player; this file draws random ones, lists what the editor can change and turns
 * a config into SVG markup.
 */
import { display, faceToSvgString, generate, svgsIndex, type FaceConfig } from "facesjs"

export type { FaceConfig }

/** A new random (male) face. */
export function randomFace(): FaceConfig {
  return generate(undefined, { gender: "male" })
}

/** Features picked from a list of facesjs ids. */
export const FACE_FEATURES = [
  "hair",
  "head",
  "ear",
  "eye",
  "eyebrow",
  "nose",
  "mouth",
  "facialHair",
  "glasses",
  "eyeLine",
  "smileLine",
  "miscLine",
] as const
export type FaceFeature = (typeof FACE_FEATURES)[number]

/** The ids a feature can take: facesjs's own, without its women's variants. */
export function faceOptions(feature: FaceFeature): string[] {
  return svgsIndex[feature].filter((id) => !id.startsWith("female"))
}

export const SKIN_TONES = [
  "#f2d6cb",
  "#ecc8b4",
  "#ddb7a0",
  "#d1a183",
  "#bb876f",
  "#a67358",
  "#8d5b45",
  "#74453d",
  "#5c3937",
  "#4a2c2a",
]

export const HAIR_COLORS = [
  "#e9c67b",
  "#cc9966",
  "#b55239",
  "#5a3825",
  "#3d2314",
  "#272421",
  "#8c8c8c",
  "#dcdcdc",
]

/** The id a feature currently has on a face. */
export function featureId(face: FaceConfig, feature: FaceFeature): string {
  return face[feature].id
}

/** A copy of the face with one feature set to an id. */
export function withFeature(face: FaceConfig, feature: FaceFeature, id: string): FaceConfig {
  const next = clone(face)
  next[feature].id = id
  // The hair behind the head follows the hair style, as facesjs draws it.
  if (feature === "hair") {
    next.hairBg.id = id === "longHair" ? "longHair" : id.startsWith("shaggy") ? "shaggy" : "none"
  }
  return next
}

export function withSkin(face: FaceConfig, color: string): FaceConfig {
  const next = clone(face)
  next.body.color = color
  return next
}

export function withHairColor(face: FaceConfig, color: string): FaceConfig {
  const next = clone(face)
  next.hair.color = color
  return next
}

export function withFatness(face: FaceConfig, fatness: number): FaceConfig {
  const next = clone(face)
  next.fatness = Math.min(1, Math.max(0, fatness))
  return next
}

let stage: HTMLDivElement | null = null

/**
 * The face as SVG markup. In a browser facesjs draws into a hidden element of the
 * page (it measures its shapes with getBBox); its own string renderer swaps the
 * global document for a fake one, which only works under Node.
 */
function render(face: FaceConfig): string {
  if (typeof document === "undefined") return faceToSvgString(face)
  if (!stage) {
    stage = document.createElement("div")
    stage.setAttribute("aria-hidden", "true")
    stage.style.cssText =
      "position:absolute;left:-10000px;top:0;width:400px;height:600px;visibility:hidden;pointer-events:none"
    document.body.appendChild(stage)
  }
  display(stage, face)
  const svg = stage.innerHTML
  stage.innerHTML = ""
  return svg
}

/** How much of the picture to show: the head in a circle, or all of it. */
export type FaceCrop = "full" | "round"

const ROUND_CROP = 'viewBox="-50 20 500 500" preserveAspectRatio="xMidYMin slice"'

const cache = new Map<string, string>()

/** The face as an SVG string, cached. */
export function faceSvg(face: FaceConfig, crop: FaceCrop = "round"): string {
  const id = `${crop}|${JSON.stringify(face)}`
  let svg = cache.get(id)
  if (!svg) {
    svg = render(face)
    if (crop === "round")
      svg = svg.replace(/viewBox="[^"]*" preserveAspectRatio="[^"]*"/, ROUND_CROP)
    if (cache.size > 500) cache.clear()
    cache.set(id, svg)
  }
  return svg
}

const clone = (face: FaceConfig): FaceConfig => JSON.parse(JSON.stringify(face))

/** A plain copy of a face (safe on Vue's reactive proxies, which structuredClone rejects). */
export const cloneFace = clone
