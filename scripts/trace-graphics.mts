// Traces the expertise graphics into the SVGs in public/img/base that ParticleGraphic
// animates. Run it only if a source PNG changes:
//
//     node scripts/trace-graphics.mts
//
// Each PNG is a pixel lattice (about 6.67px a cell) that was later resampled, and
// the lattice shifts by up to 2px across the image. Snapping to one grid would
// misplace whole rows, so every source pixel is traced as it is.
//
// The trace has two tones on purpose. The PNGs' other tones are mostly resampling
// halos: matching them to half the remaining error takes seven tones and 850 KB.

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

// `core` is a point inside a light shape that the animation treats as one piece, so
// that it stays whole. The loops graphic has no such shape: its focus is dark.
const GRAPHICS = [
    { source: "Group 1410188788.png", output: "starburst.svg", core: { x: 364, y: 287 } },
    { source: "Group 1410188789.png", output: "loops.svg", core: null },
    { source: "Group 1410188791.png", output: "target.svg", core: { x: 380, y: 282 } },
]

const median = (values: number[]) => values.sort((a, b) => a - b)[values.length >> 1]
const toHex = (values: number[]) => `#${values.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`

// Merges a mask into rectangles: horizontal runs, grown downwards.
function toRects(mask: Uint8Array, width: number, height: number, originX: number, originY: number) {
    const rects: string[] = []
    let [penX, penY] = [0, 0]
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!mask[y * width + x]) continue
            let runEnd = x + 1
            while (runEnd < width && mask[y * width + runEnd]) runEnd++
            let rowEnd = y + 1
            const rowIsFull = (row: number) => {
                for (let column = x; column < runEnd; column++) if (!mask[row * width + column]) return false
                return true
            }
            while (rowEnd < height && rowIsFull(rowEnd)) rowEnd++
            for (let row = y; row < rowEnd; row++) mask.fill(0, row * width + x, row * width + runEnd)
            const [rectX, rectY] = [originX + x, originY + y]
            rects.push(`m${rectX - penX} ${rectY - penY}h${runEnd - x}v${rowEnd - y}h${x - runEnd}z`)
            ;[penX, penY] = [rectX, rectY]
        }
    }
    return rects.join("")
}

async function trace({ source, output, core }: (typeof GRAPHICS)[number]) {
    const path = fileURLToPath(new URL(`../public/img/base/${source}`, import.meta.url))
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width, height } = info

    // The export's last row is 12% opaque with meaningless colour, so it repeats the row above.
    const luminance = (x: number, y: number) => {
        const offset = (Math.min(y, height - 2) * width + x) * 4
        return (data[offset] + data[offset + 1] + data[offset + 2]) / 3
    }

    // The colours are the medians of the two flat areas, which skips the halos.
    const samples: Record<"dark" | "light", number[][]> = { dark: [[], [], []], light: [[], [], []] }
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width; x++) {
            const level = luminance(x, y)
            const group = level < 80 ? samples.dark : level > 195 ? samples.light : null
            const offset = (y * width + x) * 4
            group?.forEach((channel, index) => channel.push(data[offset + index]))
        }
    }
    const dark = samples.dark.map(median)
    const light = samples.light.map(median)
    const threshold = (dark.reduce((sum, value) => sum + value) + light.reduce((sum, value) => sum + value)) / 6

    const isLight = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) isLight[y * width + x] = luminance(x, y) > threshold ? 1 : 0
    }

    // Flood-fills the core out of the image, so that it isn't cut up with the rest.
    // `data-core` carries its box, which the animation centres on and scales around.
    let corePath = ""
    if (core) {
        const stack = [core.y * width + core.x]
        const pixels: number[] = []
        while (stack.length) {
            const index = stack.pop() as number
            if (!isLight[index]) continue
            isLight[index] = 0
            pixels.push(index)
            stack.push(index - 1, index + 1, index - width, index + width)
        }
        const columns = pixels.map((index) => index % width)
        const rows = pixels.map((index) => Math.floor(index / width))
        const [left, top] = [Math.min(...columns), Math.min(...rows)]
        const [boxWidth, boxHeight] = [Math.max(...columns) - left + 1, Math.max(...rows) - top + 1]
        const mask = new Uint8Array(boxWidth * boxHeight)
        pixels.forEach((_, index) => {
            mask[(rows[index] - top) * boxWidth + columns[index] - left] = 1
        })
        corePath = `<path data-core="${left} ${top} ${boxWidth} ${boxHeight}" fill="${toHex(light)}" d="${toRects(mask, boxWidth, boxHeight, left, top)}"/>\n`
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
<rect width="${width}" height="${height}" fill="${toHex(dark)}"/>
<path fill="${toHex(light)}" d="${toRects(isLight, width, height, 0, 0)}"/>
${corePath}</svg>
`
    writeFileSync(new URL(`../public/img/base/${output}`, import.meta.url), svg)
    console.log(`${output}: ${toHex(dark)} / ${toHex(light)}, ${Math.round(svg.length / 1024)} KB`)
}

for (const graphic of GRAPHICS) await trace(graphic)
