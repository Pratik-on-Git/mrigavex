import type { Behaviour, Force, Point, Tile } from "./behaviours"

// The size of a particle, in units: about one CSS pixel on a desktop card, so even a
// single dot of the picture (about 6.67 units) breaks into a dozen or so.
const PARTICLE = 2
// The spacing of the motion grid. Behaviours run here, in JavaScript, and the GPU
// interpolates for the particles between. Their features are all far wider than this.
const NODE = 12

const STIFFNESS = 170
const DAMPING = 17
const REST = 0.03
const INTRO_FADE_MS = 650
const CORE_INTRO_MS = 420
const TAP_REACH = 240
const TAP_SPEED = 0.43 // units per ms
const TAP_WIDTH = 34
const TAP_NUDGE = 12
// How much stronger the base animation runs while the card is hovered or focused.
const ACTIVE_ENERGY = 1.5

// A particle this close to home (in units) stays exactly there. Neighbours a pixel
// apart would otherwise crack solid areas with hairlines, far from any visible motion.
const DEAD_ZONE = "1.5"
// Below full white, so that bright dots stay distinct from their background.
const MAX_GLOW = 0.86
// How far a particle strays from its neighbours, as a share of how far they all move.
// The grid moves smoothly, so this is what makes it read as particles and not a lens.
const STRAY = "0.55"

const VERTEX_SHADER = `#version 300 es
in vec4 rectangle;
in vec2 seed;
uniform vec2 size;
uniform vec2 scale;
uniform vec2 nodeExtent;
uniform highp sampler2D nodes;
uniform bool isCore;
uniform vec4 coreRectangle;
uniform vec4 coreState;
out highp vec2 source;
out float glow;
out float alpha;
void main() {
    vec2 corner = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);
    vec4 box = isCore ? coreRectangle : rectangle;
    source = box.xy + corner * box.zw;
    vec2 position;
    if (isCore) {
        vec2 centre = box.xy + box.zw / 2.0;
        position = centre + (source - centre) * coreState.w + coreState.xy;
        glow = coreState.z;
        alpha = 1.0;
    } else {
        vec2 home = (box.xy + box.zw / 2.0) / scale;
        vec4 node = textureLod(nodes, home / nodeExtent, 0.0);
        float amount = length(node.xy);
        vec2 move = vec2(0.0);
        if (amount >= ${DEAD_ZONE}) {
            move = node.xy * (0.7 + 0.6 * seed.x) + (seed - 0.5) * 2.0 * amount * ${STRAY};
        }
        // Whole device pixels: this is what keeps a particle in flight pixel-sharp.
        position = source + round(move * scale);
        glow = min(${MAX_GLOW.toFixed(2)}, node.z * (0.75 + 0.5 * seed.y));
        // Particles appear at different moments as their part of the grid fades in.
        float threshold = seed.y * 0.8;
        alpha = smoothstep(threshold, threshold + 0.2, node.w);
    }
    source /= size;
    gl_Position = vec4(position.x / size.x * 2.0 - 1.0, 1.0 - position.y / size.y * 2.0, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 source;
in float glow;
in float alpha;
uniform sampler2D coverage;
uniform vec4 channel;
uniform vec3 light;
out vec4 colour;
void main() {
    colour = vec4(mix(light, vec3(1.0), glow), dot(texture(coverage, source), channel) * alpha);
}`

export type Graphic = {
    width: number
    height: number
    dark: string
    light: string
    tiles: string
    core: { path: string; x: number; y: number; width: number; height: number } | null
}

// Reads a file written by scripts/trace-graphics.mts, or returns null if it isn't one.
export function parseGraphic(text: string): Graphic | null {
    const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement
    const background = svg.querySelector("rect")
    const tiles = svg.querySelector("path:not([data-core])")
    const core = svg.querySelector("path[data-core]")
    if (!(svg instanceof SVGSVGElement) || !background || !tiles) return null

    const [x, y, width, height] = (core?.getAttribute("data-core") ?? "").split(" ").map(Number)
    return {
        width: svg.viewBox.baseVal.width,
        height: svg.viewBox.baseVal.height,
        dark: background.getAttribute("fill") as string,
        light: tiles.getAttribute("fill") as string,
        tiles: tiles.getAttribute("d") as string,
        core: core ? { path: core.getAttribute("d") as string, x, y, width, height } : null,
    }
}

const toUnits = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)

function createProgram(gl: WebGL2RenderingContext) {
    const program = gl.createProgram()
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX_SHADER], [gl.FRAGMENT_SHADER, FRAGMENT_SHADER]] as const) {
        const shader = gl.createShader(type)
        if (!shader) return null
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
}

// Draws a graphic on the canvas and brings it to life, and returns the function that
// undoes it, or null if this browser can't, in which case the static image should stay.
//
// It uses WebGL because of what was measured with all three cards running: moving SVG
// nodes took 79ms a frame and 15,000 Canvas 2D copies took 200ms. Even on WebGL, running
// the springs per particle in JavaScript cost 7ms at a 5-unit size, so the particles
// here (over 100,000) only read a small grid of springs from a texture. Each one copies
// its rectangle of a coverage texture, rasterised from the vector paths at the canvas's
// own resolution, to whole device pixels, so nothing is resampled and it stays as sharp
// in flight as at home. The loop stops once the card is out of view and has settled.
export function animateGraphic(
    host: HTMLElement,
    canvas: HTMLCanvasElement,
    graphic: Graphic,
    behaviour: Behaviour,
    callbacks: { onFirstFrame: () => void; onContextLost: () => void },
) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" })
    const program = gl && createProgram(gl)
    if (!gl || !program) return null

    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const sizeUniform = uniform("size")
    const scaleUniform = uniform("scale")
    const isCoreUniform = uniform("isCore")
    const coreRectangleUniform = uniform("coreRectangle")
    const coreStateUniform = uniform("coreState")
    const channelUniform = uniform("channel")

    const [darkRed, darkGreen, darkBlue] = toUnits(graphic.dark)
    const [lightRed, lightGreen, lightBlue] = toUnits(graphic.light)
    gl.useProgram(program)
    gl.uniform3f(uniform("light"), lightRed, lightGreen, lightBlue)
    gl.uniform1i(uniform("coverage"), 0)
    gl.uniform1i(uniform("nodes"), 1)
    gl.clearColor(darkRed, darkGreen, darkBlue, 1)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const createTexture = (unit: number) => {
        const texture = gl.createTexture()
        gl.activeTexture(unit)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    }
    createTexture(gl.TEXTURE0)
    createTexture(gl.TEXTURE1)

    const particleBuffer = gl.createBuffer()
    gl.bindVertexArray(gl.createVertexArray())
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
    const pointAttribute = (name: string, components: number, offset: number) => {
        const location = gl.getAttribLocation(program, name)
        gl.enableVertexAttribArray(location)
        gl.vertexAttribPointer(location, components, gl.FLOAT, false, 24, offset)
        gl.vertexAttribDivisor(location, 1)
    }
    pointAttribute("rectangle", 4, 0)
    pointAttribute("seed", 2, 16)

    const focus: Point = graphic.core
        ? { x: graphic.core.x + graphic.core.width / 2, y: graphic.core.y + graphic.core.height / 2 }
        : (behaviour.focus as Point)

    // The motion grid covers every cell, dark ones too, so that interpolating between
    // two nodes across an empty cell can't pull a particle's movement towards nothing.
    const nodeColumns = Math.ceil(graphic.width / NODE)
    const nodeRows = Math.ceil(graphic.height / NODE)
    const tiles: Tile[] = []
    for (let row = 0; row < nodeRows; row++) {
        for (let column = 0; column < nodeColumns; column++) {
            const x = (column + 0.5) * NODE
            const y = (row + 0.5) * NODE
            const tile: Tile = {
                x,
                y,
                fromFocusX: x - focus.x,
                fromFocusY: y - focus.y,
                radius: Math.sqrt((x - focus.x) ** 2 + (y - focus.y) ** 2),
                strayX: (Math.random() - 0.5) * 1.5,
                strayY: (Math.random() - 0.5) * 1.5,
                reach: 0.65 + Math.random() * 0.7,
                jitter: Math.random(),
                angle: 0,
                band: 0,
                weight: 0,
            }
            behaviour.prepare?.(tile)
            tiles.push(tile)
        }
    }
    const count = tiles.length
    const delay = Float32Array.from(tiles, behaviour.introDelay)
    const offsetX = new Float32Array(count)
    const offsetY = new Float32Array(count)
    const speedX = new Float32Array(count)
    const speedY = new Float32Array(count)
    const glow = new Float32Array(count)
    // Red and green: the movement in units. Blue: the glow. Alpha: the intro's fade.
    const nodeData = new Float32Array(count * 4).fill(1)
    for (let index = 0; index < count; index++) {
        nodeData[index * 4] = 0
        nodeData[index * 4 + 1] = 0
        nodeData[index * 4 + 2] = 0
    }
    gl.activeTexture(gl.TEXTURE1)
    // Half floats can be filtered in every WebGL2 browser. Full floats need an extension.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, nodeColumns, nodeRows, 0, gl.RGBA, gl.FLOAT, nodeData)
    gl.uniform2f(uniform("nodeExtent"), nodeColumns * NODE, nodeRows * NODE)

    let scale = 1
    let scaleY = 1
    let particleCount = 0

    // Sizes everything to the canvas's device pixels. Particle edges are rounded from
    // the same grid on both sides, so at any scale neighbours meet with no gap or overlap.
    const build = () => {
        const cssWidth = canvas.getBoundingClientRect().width
        const width = Math.round(cssWidth * window.devicePixelRatio)
        if (!width || width === canvas.width) return false

        // Vertical scale from the whole rows, which is how the browser stretches the
        // static image to device pixels: uniform scale would drift from it by half a row.
        scale = width / graphic.width
        const height = Math.round(graphic.height * scale)
        scaleY = height / graphic.height
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        gl.uniform2f(sizeUniform, width, height)
        gl.uniform2f(scaleUniform, scale, scaleY)

        // Coverage rather than colour, so that particles can blend from light to white
        // over the dark background as the raster did: red is them, green the core.
        const raster = document.createElement("canvas")
        raster.width = width
        raster.height = height
        const context = raster.getContext("2d", { alpha: false, willReadFrequently: true }) as CanvasRenderingContext2D
        context.setTransform(scale, 0, 0, scaleY, 0, 0)
        context.fillStyle = "#FF0000"
        context.fill(new Path2D(graphic.tiles))
        if (graphic.core) {
            context.globalCompositeOperation = "lighter"
            context.fillStyle = "#00FF00"
            context.fill(new Path2D(graphic.core.path))
            const left = Math.floor(graphic.core.x * scale)
            const top = Math.floor(graphic.core.y * scaleY)
            gl.uniform4f(coreRectangleUniform, left, top, Math.ceil(graphic.core.width * scale) + 1, Math.ceil(graphic.core.height * scaleY) + 1)
        }
        gl.activeTexture(gl.TEXTURE0)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster)

        // Empty cells would only cost an instance, so they don't become particles.
        const { data } = context.getImageData(0, 0, width, height)
        const columns = Math.ceil(graphic.width / PARTICLE)
        const rows = Math.ceil(graphic.height / PARTICLE)
        const particles = new Float32Array(columns * rows * 6)
        let cursor = 0
        for (let row = 0; row < rows; row++) {
            const top = Math.round(row * PARTICLE * scaleY)
            const bottom = Math.min(height, Math.round((row + 1) * PARTICLE * scaleY))
            for (let column = 0; column < columns; column++) {
                const left = Math.round(column * PARTICLE * scale)
                const right = Math.min(width, Math.round((column + 1) * PARTICLE * scale))
                let hasCoverage = false
                for (let y = top; y < bottom && !hasCoverage; y++) {
                    for (let x = left; x < right; x++) {
                        if (data[(y * width + x) * 4]) {
                            hasCoverage = true
                            break
                        }
                    }
                }
                if (!hasCoverage) continue
                particles[cursor++] = left
                particles[cursor++] = top
                particles[cursor++] = right - left
                particles[cursor++] = bottom - top
                particles[cursor++] = Math.random()
                particles[cursor++] = Math.random()
            }
        }
        particleCount = cursor / 6
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, particles.subarray(0, cursor), gl.STATIC_DRAW)
        return true
    }

    const force: Force = { x: 0, y: 0, glow: 0 }
    const introForce: Force = { x: 0, y: 0, glow: 0 }
    const coreForce: Force = { x: 0, y: 0, glow: 0 }

    let pointer: Point | null = null
    let ripples: (Point & { start: number })[] = []
    let energy = 0
    let isCardActive = false
    let lastBeat = 0
    let introStart = -1
    let coreBump = 0
    let coreBumpSpeed = 0
    let coreX = 0
    let coreY = 0
    let coreSpeedX = 0
    let coreSpeedY = 0
    let coreGlow = 0
    let isVisible = false
    let isArmed = false
    let hasReportedView = false
    let hasDrawn = false
    let frameId = 0
    let lastFrame = 0

    const frame = () => {
        frameId = 0
        // Whether the card starts armed isn't known until the first report: drawing the
        // whole picture before it would show the picture and then hide it.
        if (!hasReportedView) {
            frameId = requestAnimationFrame(frame)
            return
        }
        const now = performance.now()
        const delta = Math.min((now - lastFrame) / 1000, 1 / 30)
        lastFrame = now
        let isBusy = false

        ripples = ripples.filter((ripple) => (now - ripple.start) * TAP_SPEED < TAP_REACH + TAP_WIDTH * 2)
        if (ripples.length) isBusy = true

        const isIntro = introStart >= 0
        const introAge = now - introStart - behaviour.introLagMs
        let isIntroRunning = false

        // Eased, so the base animation gathers after the intro instead of switching on.
        const targetEnergy = isVisible && !isArmed && !isIntro ? (isCardActive ? ACTIVE_ENERGY : 1) : 0
        energy += (targetEnergy - energy) * (1 - Math.exp(-delta * 2.5))
        if (!targetEnergy && energy < 0.01) energy = 0
        if (targetEnergy || energy) isBusy = true

        gl.clear(gl.COLOR_BUFFER_BIT)

        if (!isArmed) {
            for (let index = 0; index < count; index++) {
                const tile = tiles[index]
                force.x = 0
                force.y = 0
                force.glow = 0

                if (energy) {
                    behaviour.ambient(tile, now, force)
                    force.x *= energy
                    force.y *= energy
                    force.glow *= energy
                }
                if (pointer) behaviour.hover(tile, pointer, focus, force)
                for (const ripple of ripples) {
                    const front = (now - ripple.start) * TAP_SPEED
                    const dx = tile.x - ripple.x
                    const dy = tile.y - ripple.y
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1
                    const band = (distance - front) / TAP_WIDTH
                    if (Math.abs(band) > 2.5) continue
                    const strength = Math.exp(-band * band) * Math.max(0, 1 - front / (TAP_REACH + TAP_WIDTH))
                    force.x += (dx / distance) * strength * TAP_NUDGE
                    force.y += (dy / distance) * strength * TAP_NUDGE
                    force.glow += strength
                }

                speedX[index] += ((force.x - offsetX[index]) * STIFFNESS - speedX[index] * DAMPING) * delta
                speedY[index] += ((force.y - offsetY[index]) * STIFFNESS - speedY[index] * DAMPING) * delta
                offsetX[index] += speedX[index] * delta
                offsetY[index] += speedY[index] * delta
                glow[index] += (force.glow - glow[index]) * (1 - Math.exp(-delta * 16))
                if (glow[index] < 0.01) glow[index] = 0

                if (Math.abs(offsetX[index]) > REST || Math.abs(offsetY[index]) > REST || Math.abs(speedX[index]) > REST || Math.abs(speedY[index]) > REST || glow[index] > 0) isBusy = true

                let moveX = offsetX[index]
                let moveY = offsetY[index]
                let alpha = 1
                if (isIntro) {
                    const progress = (introAge - delay[index]) / INTRO_FADE_MS
                    if (progress < 1) {
                        isIntroRunning = true
                        if (progress <= 0) {
                            alpha = 0
                        } else {
                            behaviour.introOffset(tile, (1 - progress) ** 3, introForce)
                            moveX += introForce.x
                            moveY += introForce.y
                            alpha = Math.min(1, progress * 1.6)
                        }
                    }
                }

                const slot = index * 4
                nodeData[slot] = moveX
                nodeData[slot + 1] = moveY
                nodeData[slot + 2] = glow[index]
                nodeData[slot + 3] = alpha
            }

            gl.activeTexture(gl.TEXTURE1)
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nodeColumns, nodeRows, gl.RGBA, gl.FLOAT, nodeData)
            gl.uniform1i(isCoreUniform, 0)
            gl.uniform4f(channelUniform, 1, 0, 0, 0)
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, particleCount)

            if (graphic.core) {
                if (behaviour.coreBeatMs && energy > 0.5) {
                    const beat = Math.floor(now / behaviour.coreBeatMs)
                    if (beat !== lastBeat) {
                        lastBeat = beat
                        coreBumpSpeed += 2.2
                        coreGlow = 1
                    }
                }
                coreForce.x = 0
                coreForce.y = 0
                if (pointer) behaviour.coreHover?.(pointer, focus, coreForce)
                coreSpeedX += ((coreForce.x - coreX) * STIFFNESS - coreSpeedX * DAMPING) * delta
                coreSpeedY += ((coreForce.y - coreY) * STIFFNESS - coreSpeedY * DAMPING) * delta
                coreX += coreSpeedX * delta
                coreY += coreSpeedY * delta
                coreBumpSpeed += (-coreBump * STIFFNESS - coreBumpSpeed * DAMPING * 0.6) * delta
                coreBump += coreBumpSpeed * delta
                coreGlow *= Math.exp(-delta * 3.5)
                if (coreGlow < 0.01) coreGlow = 0

                // The core grows from nothing during the intro.
                const coreAge = isIntro ? (introAge - (behaviour.coreIntroDelayMs ?? 0)) / CORE_INTRO_MS : 1
                const growth = coreAge >= 1 ? 1 : coreAge <= 0 ? 0 : 1 - (1 - coreAge) ** 3
                if (coreAge < 1) isIntroRunning = true
                const coreScale = growth * (1 + coreBump)
                const isScaled = Math.abs(coreScale - 1) > 0.002
                if (isScaled || coreGlow > 0 || Math.abs(coreBumpSpeed) > 0.01 || Math.abs(coreX) > REST || Math.abs(coreY) > REST || Math.abs(coreSpeedX) > REST || Math.abs(coreSpeedY) > REST) isBusy = true

                if (coreScale > 0) {
                    gl.uniform1i(isCoreUniform, 1)
                    gl.uniform4f(channelUniform, 0, 1, 0, 0)
                    gl.uniform4f(coreStateUniform, Math.round(coreX * scale), Math.round(coreY * scaleY), Math.min(MAX_GLOW, coreGlow), isScaled ? coreScale : 1)
                    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1)
                }
            }
        }

        if (!hasDrawn) {
            hasDrawn = true
            callbacks.onFirstFrame()
        }
        if (isIntroRunning) isBusy = true
        else if (isIntro) introStart = -1
        if (isBusy) frameId = requestAnimationFrame(frame)
    }

    const wake = () => {
        if (frameId) return
        lastFrame = performance.now()
        frameId = requestAnimationFrame(frame)
    }

    const setCardActive = (isActive: boolean) => () => {
        isCardActive = isActive
        wake()
    }
    const activate = setCardActive(true)
    const deactivate = setCardActive(false)

    const toGraphic = (event: PointerEvent): Point => {
        const box = canvas.getBoundingClientRect()
        const units = box.width / graphic.width
        return { x: (event.clientX - box.left) / units, y: (event.clientY - box.top) / units }
    }
    const onPointerMove = (event: PointerEvent) => {
        // A finger has no hover, and following it would fight the page's scroll.
        if (event.pointerType === "touch") return
        pointer = toGraphic(event)
        wake()
    }
    const onPointerLeave = () => {
        pointer = null
        wake()
    }
    const onPointerDown = (event: PointerEvent) => {
        ripples.push({ ...toGraphic(event), start: performance.now() })
        wake()
    }
    const onContextLost = () => {
        cancelAnimationFrame(frameId)
        callbacks.onContextLost()
    }

    // Reaching the card from anywhere, including its button by keyboard, lifts the animation.
    const card = host.closest("li")
    host.addEventListener("pointermove", onPointerMove)
    host.addEventListener("pointerleave", onPointerLeave)
    host.addEventListener("pointerdown", onPointerDown)
    card?.addEventListener("pointerenter", activate)
    card?.addEventListener("pointerleave", deactivate)
    card?.addEventListener("focusin", activate)
    card?.addEventListener("focusout", deactivate)
    canvas.addEventListener("webglcontextlost", onContextLost)

    build()
    wake()

    const resize = new ResizeObserver(() => {
        if (build()) wake()
    })
    resize.observe(canvas)

    // A card that is off screen when the file arrives waits, particles hidden, to
    // assemble on sight. One already in view stays as it is: hiding it would flash.
    const viewport = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting
        if (!hasReportedView) {
            hasReportedView = true
            isArmed = !isVisible
        }
        if (isArmed && entry.intersectionRatio >= 0.25) {
            isArmed = false
            introStart = performance.now()
        }
        wake()
    }, { threshold: [0, 0.25] })
    viewport.observe(host)

    return () => {
        cancelAnimationFrame(frameId)
        resize.disconnect()
        viewport.disconnect()
        host.removeEventListener("pointermove", onPointerMove)
        host.removeEventListener("pointerleave", onPointerLeave)
        host.removeEventListener("pointerdown", onPointerDown)
        card?.removeEventListener("pointerenter", activate)
        card?.removeEventListener("pointerleave", deactivate)
        card?.removeEventListener("focusin", activate)
        card?.removeEventListener("focusout", deactivate)
        canvas.removeEventListener("webglcontextlost", onContextLost)
    }
}
