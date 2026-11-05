import test from "node:test"
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { HOME_CONTENT as content } from "../lib/content/home.ts"

// next build doesn't check image paths: a renamed file in /public only shows up
// as a 404 in the browser, so the paths in the content file are checked here.
test("every home page image exists in /public", () => {
    const sources = [
        content.hero.background.src,
        content.hero.object.src,
        ...content.expertise.cards.map((card) => card.image.src),
        ...content.vision.steps.map((step) => step.image.src),
        content.leadership.portrait.src,
    ]
    for (const src of sources) {
        assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), `missing: public${src}`)
    }
})
