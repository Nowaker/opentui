import { afterEach, expect, test } from "bun:test"
import { createTestRenderer, type TestRenderer } from "../testing.js"
import { ManualClock } from "../testing/manual-clock.js"
import { TextRenderable } from "../renderables/Text.js"

let renderer: TestRenderer | undefined
afterEach(() => renderer?.destroy())

async function setup(unfocusedFps?: number) {
  const clock = new ManualClock()
  const config = { width: 30, height: 3, targetFps: 20, maxFps: 60, unfocusedFps, clock }
  const rig = await createTestRenderer(config)
  renderer = rig.renderer
  const text = new TextRenderable(rig.renderer, { content: "initial" })
  rig.renderer.root.add(text)
  await rig.renderOnce()
  rig.renderer.pause()
  let frames = 0
  rig.renderer.on("frame", () => frames++)
  const advance = async (milliseconds: number) => {
    for (let time = 0; time < milliseconds; time++) {
      clock.advance(1)
      await new Promise<void>((resolve) => process.nextTick(resolve))
    }
  }
  const focus = async (value: boolean) => {
    rig.renderer.stdin.emit("data", Buffer.from(value ? "\x1b[I" : "\x1b[O"))
    await advance(1)
  }
  return { ...rig, text, advance, focus, frames: () => frames }
}

test("unfocused continuous animations render once per second and regain their normal cadence on focus-in", async () => {
  const rig = await setup(1)
  await rig.focus(false)
  rig.renderer.start()
  await rig.advance(999)
  expect(rig.frames()).toBe(1)
  await rig.advance(2)
  expect(rig.frames()).toBe(2)
  await rig.focus(true)
  const resumed = rig.frames()
  await rig.advance(100)
  expect(rig.frames() - resumed).toBeGreaterThanOrEqual(2)
})

test("a content mutation preempts the unfocused animation timer within a normal frame", async () => {
  const rig = await setup(1)
  await rig.focus(false)
  rig.renderer.start()
  await rig.advance(100)

  rig.text.content = "streamed content"
  await rig.advance(17)

  expect(rig.captureCharFrame()).toContain("streamed content")
  const rendered = rig.frames()
  await rig.advance(900)
  expect(rig.frames()).toBe(rendered)
})

test("focus reports preserve the normal continuous cadence without an unfocused limit", async () => {
  const rig = await setup()
  await rig.focus(false)
  rig.renderer.start()
  await rig.advance(200)
  expect(rig.frames()).toBeGreaterThanOrEqual(4)
})

test("destroying an unfocused renderer cancels its pending animation", async () => {
  const rig = await setup(1)
  await rig.focus(false)
  rig.renderer.start()
  await rig.advance(100)
  const rendered = rig.frames()

  rig.renderer.destroy()
  await rig.advance(2000)

  expect(rig.frames()).toBe(rendered)
})
