// What makes each expertise graphic move differently. The engine (engine.ts) owns
// the springs, timing and drawing; a behaviour only says where a tile wants to be.
// All distances are SVG units: source pixels, about 2 per CSS pixel on a desktop card.

export type Point = { x: number; y: number }

// A displacement and a brightness (0 to 1), written into a reused object because
// these functions run once per tile, per frame.
export type Force = { x: number; y: number; glow: number }

export type Tile = {
    x: number
    y: number
    fromFocusX: number
    fromFocusY: number
    radius: number
    // Fixed random values, so that tiles don't all move as one surface.
    strayX: number
    strayY: number
    reach: number
    jitter: number
    // Set by a behaviour's `prepare`, for values it would otherwise recompute each frame.
    angle: number
    band: number
    weight: number
}

export type Behaviour = {
    // Where motion is centred when the graphic has no core element to centre on.
    focus?: Point
    prepare?: (tile: Tile) => void

    introDelay: (tile: Tile) => number
    // `left` runs from 1 to 0 as the tile lands, and `force` is its offset from home.
    introOffset: (tile: Tile, left: number, force: Force) => void
    introLagMs: number
    coreIntroDelayMs?: number

    hover: (tile: Tile, pointer: Point, focus: Point, force: Force) => void
    coreHover?: (pointer: Point, focus: Point, force: Force) => void

    // The base-state animation, which runs without a break while the card is in
    // view, as a function of the page's clock. It repeats, so the cards never pause.
    ambient: (tile: Tile, time: number, force: Force) => void
    // How often the core kicks and flashes, in time with the ambient animation.
    coreBeatMs?: number
}

export type BehaviourName = "burst" | "loops" | "target"

const TAU = Math.PI * 2

// The signed shortest distance between two angles, from -π to π.
const angleBetween = (a: number, b: number) => {
    const turn = (a - b) % TAU
    return turn > Math.PI ? turn - TAU : turn < -Math.PI ? turn + TAU : turn
}

// Burst: everything radiates from the core. Particles fly out of it to assemble,
// waves keep leaving it, and the cursor scatters them.
const BURST_REACH = 470
const BURST_HOVER_RADIUS = 240
const BURST_HOVER_PUSH = 32
const WAVE_SPEED = 0.36 // units per ms
const WAVE_EVERY_MS = 1300
const WAVE_SPACING = WAVE_SPEED * WAVE_EVERY_MS
const WAVE_WIDTH = 44
const WAVE_NUDGE = 11

const burst: Behaviour = {
    introLagMs: 0,
    introDelay: (tile) => (tile.radius / BURST_REACH) * 800 + tile.jitter * 140,
    introOffset: (tile, left, force) => {
        force.x = -tile.fromFocusX * 0.25 * left
        force.y = -tile.fromFocusY * 0.25 * left
    },
    hover: (tile, pointer, _focus, force) => {
        const dx = tile.x - pointer.x
        const dy = tile.y - pointer.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        if (distance >= BURST_HOVER_RADIUS) return
        const strength = (1 - distance / BURST_HOVER_RADIUS) ** 1.4
        force.x += (dx / distance + tile.strayX) * strength * tile.reach * BURST_HOVER_PUSH
        force.y += (dy / distance + tile.strayY) * strength * tile.reach * BURST_HOVER_PUSH
        force.glow += strength * 1.8
    },
    coreBeatMs: WAVE_EVERY_MS,
    ambient: (tile, time, force) => {
        // The distance to the nearest of the evenly spaced fronts moving outwards.
        const phase = (((tile.radius - time * WAVE_SPEED) % WAVE_SPACING) + WAVE_SPACING) % WAVE_SPACING
        const band = (phase > WAVE_SPACING / 2 ? phase - WAVE_SPACING : phase) / WAVE_WIDTH
        if (Math.abs(band) > 2.5) return
        const strength = Math.exp(-band * band) * (1 - 0.5 * Math.min(1, tile.radius / BURST_REACH))
        const radius = tile.radius || 1
        force.x += (tile.fromFocusX / radius) * strength * WAVE_NUDGE
        force.y += (tile.fromFocusY / radius) * strength * WAVE_NUDGE
        force.glow += strength * 1.3
    },
}

// Loops: two interlocked rings, so everything circulates. The picture spins into
// place, currents keep running round the ribbons, and the cursor stirs a vortex. The numbers
// are the ribbons' shared ellipse, around the dark diamond at the graphic's centre.
const LOOPS_FOCUS = { x: 395, y: 290 }
const LOOPS_TILT = 0.38
const LOOPS_SQUASH = 1.4
const LOOPS_RIBBON = 255 // the ribbons' middle, along the ellipse's long axis
const LOOPS_HOVER_RADIUS = 225
const LOOPS_HOVER_SWIRL = 36
const CURRENT_LAP_MS = 5200
const CURRENT_ARMS = 2
const CURRENT_TAIL = 1.7 // radians
const CURRENT_NUDGE = 12
// Where the graphic's pixels break away from the ribbons, which come loose as a current passes.
const LOOPS_CLUSTERS = [
    { x: 515, y: 150 },
    { x: 270, y: 400 },
]
const CLUSTER_SPAN = 85

const loops: Behaviour = {
    focus: LOOPS_FOCUS,
    prepare: (tile) => {
        const alongX = tile.fromFocusX * Math.cos(LOOPS_TILT) + tile.fromFocusY * Math.sin(LOOPS_TILT)
        const alongY = (-tile.fromFocusX * Math.sin(LOOPS_TILT) + tile.fromFocusY * Math.cos(LOOPS_TILT)) * LOOPS_SQUASH
        tile.angle = Math.atan2(alongY, alongX)
        const offRibbon = (Math.hypot(alongX, alongY) - LOOPS_RIBBON) / 150
        tile.band = Math.exp(-offRibbon * offRibbon)
        tile.weight = 0
        for (const cluster of LOOPS_CLUSTERS) {
            const off = Math.hypot(tile.x - cluster.x, tile.y - cluster.y) / CLUSTER_SPAN
            tile.weight = Math.max(tile.weight, Math.exp(-off * off))
        }
    },
    introLagMs: 170,
    introDelay: (tile) => ((tile.angle + Math.PI) / TAU) * 900 + tile.jitter * 120,
    introOffset: (tile, left, force) => {
        // The tile starts turned back around the centre, so the whole picture winds in.
        const turn = -0.7 * left
        const cos = Math.cos(turn)
        const sin = Math.sin(turn)
        force.x = tile.fromFocusX * cos - tile.fromFocusY * sin - tile.fromFocusX
        force.y = tile.fromFocusX * sin + tile.fromFocusY * cos - tile.fromFocusY
    },
    hover: (tile, pointer, _focus, force) => {
        const dx = tile.x - pointer.x
        const dy = tile.y - pointer.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        if (distance >= LOOPS_HOVER_RADIUS) return
        const strength = (1 - distance / LOOPS_HOVER_RADIUS) ** 1.5
        // Mostly along the tangent, which is what makes it a swirl and not a push.
        const swirl = strength * tile.reach * LOOPS_HOVER_SWIRL
        force.x += (-dy / distance) * swirl + (dx / distance) * swirl * 0.2
        force.y += (dx / distance) * swirl + (dy / distance) * swirl * 0.2
        force.glow += strength * 1.6
    },
    ambient: (tile, time, force) => {
        if (tile.band < 0.05) return
        const head = (time / CURRENT_LAP_MS) * TAU
        // Measured back from each head, so that a tile only ever trails one.
        const behind = (((head - tile.angle) % (TAU / CURRENT_ARMS)) + TAU / CURRENT_ARMS) % (TAU / CURRENT_ARMS)
        if (behind > CURRENT_TAIL) return
        const strength = (1 - behind / CURRENT_TAIL) ** 1.6 * tile.band
        const loosened = 1 + tile.weight * 2.5
        force.x += (-Math.sin(tile.angle) + tile.strayX * tile.weight) * strength * CURRENT_NUDGE * loosened
        force.y += (Math.cos(tile.angle) + tile.strayY * tile.weight) * strength * CURRENT_NUDGE * loosened
        force.glow += strength * 1.3
    },
}

// Target: rings closing on a disc. They converge to assemble with the disc landing
// last, a radar sweep circles from the stair notch and pings the disc each lap, and the
// cursor gets locked on to: rings lean its way, most at the centre, as in a tunnel.
const TARGET_REACH = 470
const TARGET_NOTCH = -0.77 // radians, the direction the stair notch points in
const TARGET_LEAN = 26
const TARGET_DISC_LEAN = 46
const TARGET_HOVER_RADIUS = 200
const TARGET_HOVER_PULL = 24
const SWEEP_LAP_MS = 3200
const SWEEP_TAIL = 2.4 // radians
const SWEEP_NUDGE = 9

// Runs once per tile but only changes with the pointer, which is a new object each
// time it moves, so the last answer is kept rather than allocating thousands a frame.
let leanPointer: Point | null = null
const lean = { x: 0, y: 0 }
const leanToward = (pointer: Point, focus: Point) => {
    if (pointer !== leanPointer) {
        leanPointer = pointer
        const x = pointer.x - focus.x
        const y = pointer.y - focus.y
        const scale = 1 / Math.max(TARGET_REACH * 0.6, Math.sqrt(x * x + y * y))
        lean.x = x * scale
        lean.y = y * scale
    }
    return lean
}

const target: Behaviour = {
    prepare: (tile) => {
        tile.angle = Math.atan2(tile.fromFocusY, tile.fromFocusX)
    },
    introLagMs: 340,
    coreIntroDelayMs: 760,
    introDelay: (tile) => (1 - Math.min(1, tile.radius / TARGET_REACH)) * 800 + tile.jitter * 120,
    introOffset: (tile, left, force) => {
        force.x = tile.fromFocusX * 0.24 * left
        force.y = tile.fromFocusY * 0.24 * left
    },
    hover: (tile, pointer, focus, force) => {
        const toward = leanToward(pointer, focus)
        const depth = (1 - Math.min(1, tile.radius / TARGET_REACH)) ** 1.5
        force.x += toward.x * depth * TARGET_LEAN
        force.y += toward.y * depth * TARGET_LEAN
        const dx = pointer.x - tile.x
        const dy = pointer.y - tile.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        if (distance >= TARGET_HOVER_RADIUS) return
        const strength = (1 - distance / TARGET_HOVER_RADIUS) ** 2
        force.x += (dx / distance) * strength * tile.reach * TARGET_HOVER_PULL
        force.y += (dy / distance) * strength * tile.reach * TARGET_HOVER_PULL
        force.glow += strength * 1.7
    },
    coreHover: (pointer, focus, force) => {
        const toward = leanToward(pointer, focus)
        force.x = toward.x * TARGET_DISC_LEAN
        force.y = toward.y * TARGET_DISC_LEAN
    },
    coreBeatMs: SWEEP_LAP_MS,
    ambient: (tile, time, force) => {
        const head = TARGET_NOTCH + (time / SWEEP_LAP_MS) * TAU
        const behind = -angleBetween(tile.angle, head)
        if (behind < 0 || behind > SWEEP_TAIL) return
        const strength = (1 - behind / SWEEP_TAIL) ** 1.6
        const radius = tile.radius || 1
        force.x += (tile.fromFocusX / radius) * strength * SWEEP_NUDGE
        force.y += (tile.fromFocusY / radius) * strength * SWEEP_NUDGE
        force.glow += strength * 1.3
    },
}

export const BEHAVIOURS: Record<BehaviourName, Behaviour> = { burst, loops, target }
