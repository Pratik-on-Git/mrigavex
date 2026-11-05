// What makes each graphic move differently. The engine (engine.ts) owns the springs,
// timing and drawing; a behaviour only says where a tile wants to be. All distances are
// SVG units: source pixels, about 2 per CSS pixel on a desktop expertise card.

import type { ParticleStyle } from "@/lib/content/home"

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

    hover: (tile: Tile, pointer: Point, focus: Point, force: Force, time: number) => void
    coreHover?: (pointer: Point, focus: Point, force: Force) => void

    // The base-state animation, which runs without a break while the card is in
    // view, as a function of the page's clock. It repeats, so the cards never pause.
    ambient: (tile: Tile, time: number, force: Force) => void
    // How often the core kicks and flashes, in time with the ambient animation.
    coreBeatMs?: number
}

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

const prepareLoops = (tile: Tile) => {
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
}

const loops: Behaviour = {
    focus: LOOPS_FOCUS,
    prepare: prepareLoops,
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

// Turns a tile back around the focus by `turn` radians, to wind a picture into place.
const rotateBack = (tile: Tile, turn: number, force: Force) => {
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    force.x = tile.fromFocusX * cos - tile.fromFocusY * sin - tile.fromFocusX
    force.y = tile.fromFocusX * sin + tile.fromFocusY * cos - tile.fromFocusY
}

// The four below belong to the "From vision to value" stages, and move in ways the
// expertise cards don't, so that the stages read as steps and not as repeats. Two of
// them share a picture, so what tells those apart is entirely the motion.

// Scan (Diagnose): examining. A scan line reveals the picture, rings contract on to
// the disc as if focusing on it, and the cursor is a lens with crosshairs.
const SCAN_SPEED = 0.2 // units per ms
const SCAN_EVERY_MS = 1900
const SCAN_SPACING = SCAN_SPEED * SCAN_EVERY_MS
const SCAN_WIDTH = 40
const SCAN_NUDGE = 10
const LENS_RADIUS = 190
const LENS_PUSH = 26
const CROSSHAIR_WIDTH = 20
const CROSSHAIR_REACH = 300
const CROSSHAIR_PART = 16

const scan: Behaviour = {
    introLagMs: 0,
    coreIntroDelayMs: 420,
    introDelay: (tile) => (tile.y / 574) * 850 + tile.jitter * 100,
    introOffset: (tile, left, force) => {
        force.x = tile.strayX * 40 * left
        force.y = -26 * left
    },
    hover: (tile, pointer, _focus, force) => {
        const dx = tile.x - pointer.x
        const dy = tile.y - pointer.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        if (distance < LENS_RADIUS) {
            const edge = distance / LENS_RADIUS
            // Strongest halfway out, and zero at the centre, as a magnifying glass bulges.
            const strength = edge * (1 - edge) * 4
            force.x += (dx / distance) * strength * LENS_PUSH
            force.y += (dy / distance) * strength * LENS_PUSH
            force.glow += (1 - edge) * 0.9
        }
        const alongX = Math.exp(-((dy / CROSSHAIR_WIDTH) ** 2)) * Math.exp(-((dx / CROSSHAIR_REACH) ** 2))
        const alongY = Math.exp(-((dx / CROSSHAIR_WIDTH) ** 2)) * Math.exp(-((dy / CROSSHAIR_REACH) ** 2))
        // The lines part the particles as well as light them: in a bright field,
        // brightness alone doesn't read as a line.
        force.x += Math.sign(dx) * alongY * CROSSHAIR_PART
        force.y += Math.sign(dy) * alongX * CROSSHAIR_PART
        force.glow += (alongX + alongY) * 1.4
    },
    coreBeatMs: SCAN_EVERY_MS,
    ambient: (tile, time, force) => {
        const phase = (tile.radius + time * SCAN_SPEED) % SCAN_SPACING
        const band = (phase > SCAN_SPACING / 2 ? phase - SCAN_SPACING : phase) / SCAN_WIDTH
        if (Math.abs(band) > 2.5) return
        const strength = Math.exp(-band * band)
        const radius = tile.radius || 1
        force.x -= (tile.fromFocusX / radius) * strength * SCAN_NUDGE
        force.y -= (tile.fromFocusY / radius) * strength * SCAN_NUDGE
        force.glow += strength * 1.2
    },
}

// Pinwheel (Design): shaping. The picture wipes round its core, three blades of light
// turn slowly, and the rays bend toward the cursor as if being drawn into a new form.
const PINWHEEL_LAP_MS = 6000
const PINWHEEL_BLADES = 3
const PINWHEEL_NUDGE = 11
const BEND_REACH = 320
const BEND_SPREAD = 0.9 // radians
const BEND = 52

let bendPointer: Point | null = null
let bendAngle = 0

const pinwheel: Behaviour = {
    prepare: (tile) => {
        tile.angle = Math.atan2(tile.fromFocusY, tile.fromFocusX)
    },
    introLagMs: 160,
    introDelay: (tile) => (((tile.angle + Math.PI / 2 + TAU) % TAU) / TAU) * 900 + tile.jitter * 120,
    introOffset: (tile, left, force) => rotateBack(tile, 0.55 * left, force),
    hover: (tile, pointer, focus, force) => {
        if (pointer !== bendPointer) {
            bendPointer = pointer
            bendAngle = Math.atan2(pointer.y - focus.y, pointer.x - focus.x)
        }
        const turn = angleBetween(bendAngle, tile.angle)
        const off = turn / BEND_SPREAD
        const bend = turn * Math.exp(-off * off) * Math.min(1, tile.radius / BEND_REACH) * BEND
        force.x += -Math.sin(tile.angle) * bend
        force.y += Math.cos(tile.angle) * bend
        // The ray the cursor is pointing along lights up all the way out.
        force.glow += Math.exp(-((turn / 0.3) ** 2)) * 0.9
    },
    coreBeatMs: PINWHEEL_LAP_MS / PINWHEEL_BLADES,
    ambient: (tile, time, force) => {
        const blade = Math.cos(PINWHEEL_BLADES * (tile.angle - (time / PINWHEEL_LAP_MS) * TAU))
        if (blade <= 0) return
        const strength = blade ** 3 * Math.min(1, tile.radius / 60)
        force.x += -Math.sin(tile.angle) * strength * PINWHEEL_NUDGE
        force.y += Math.cos(tile.angle) * strength * PINWHEEL_NUDGE
        force.glow += strength * 1.15
    },
}

// Drive (Deliver): pressing on. The picture sweeps in from the left, fronts keep
// driving across it in one direction, and rings keep spreading from the cursor.
const DRIVE_SPEED = 0.3 // units per ms
const DRIVE_SPACING = 520
const DRIVE_WIDTH = 46
const DRIVE_NUDGE = 13
const RIPPLE_SPEED = 0.28 // units per ms
const RIPPLE_SPACING = 110
const RIPPLE_WIDTH = 26
const RIPPLE_RADIUS = 300
const RIPPLE_PUSH = 22

const drive: Behaviour = {
    introLagMs: 320,
    coreIntroDelayMs: 400,
    introDelay: (tile) => (tile.x / 728) * 850 + tile.jitter * 120,
    introOffset: (tile, left, force) => {
        force.x = -70 * left
        force.y = tile.strayY * 30 * left
    },
    hover: (tile, pointer, _focus, force, time) => {
        const dx = tile.x - pointer.x
        const dy = tile.y - pointer.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        if (distance >= RIPPLE_RADIUS) return
        const phase = (((distance - time * RIPPLE_SPEED) % RIPPLE_SPACING) + RIPPLE_SPACING) % RIPPLE_SPACING
        const band = (phase > RIPPLE_SPACING / 2 ? phase - RIPPLE_SPACING : phase) / RIPPLE_WIDTH
        const strength = Math.exp(-band * band) * (1 - distance / RIPPLE_RADIUS)
        force.x += (dx / distance) * strength * RIPPLE_PUSH
        force.y += (dy / distance) * strength * RIPPLE_PUSH
        force.glow += strength * 1.6
    },
    coreBeatMs: DRIVE_SPACING / DRIVE_SPEED,
    ambient: (tile, time, force) => {
        const phase = (((tile.x - time * DRIVE_SPEED) % DRIVE_SPACING) + DRIVE_SPACING) % DRIVE_SPACING
        const band = (phase > DRIVE_SPACING / 2 ? phase - DRIVE_SPACING : phase) / DRIVE_WIDTH
        if (Math.abs(band) > 2.5) return
        const strength = Math.exp(-band * band)
        force.x += strength * DRIVE_NUDGE
        force.y += tile.strayY * strength * DRIVE_NUDGE * 0.6
        force.glow += strength * 1.3
    },
}

// Breathe (Sustain): holding steady. The picture dissolves in everywhere at once, the
// ribbons then loosen and re-form slowly, and the cursor keeps a clear space around it.
const BREATH_MS = 4200
const BREATH_DEPTH = 0.04 // of a tile's distance from the focus
const HALO_RADIUS = 120
const HALO_WIDTH = 34

const breathe: Behaviour = {
    focus: LOOPS_FOCUS,
    prepare: prepareLoops,
    introLagMs: 480,
    introDelay: (tile) => tile.jitter * 900,
    introOffset: (tile, left, force) => {
        force.x = tile.fromFocusX * 0.06 * left
        force.y = tile.fromFocusY * 0.06 * left
    },
    hover: (tile, pointer, _focus, force) => {
        const dx = tile.x - pointer.x
        const dy = tile.y - pointer.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        const off = (distance - HALO_RADIUS) / HALO_WIDTH
        if (off > 3) return
        const ring = Math.exp(-off * off)
        const push = (distance < HALO_RADIUS ? (HALO_RADIUS - distance) * 0.55 : 0) + ring * 10
        force.x += (dx / distance) * push
        force.y += (dy / distance) * push
        force.glow += ring * 1.6
    },
    ambient: (tile, time, force) => {
        const rise = 0.5 + 0.5 * Math.sin((time / BREATH_MS) * TAU)
        // Squared, and only on the ribbons, so the background holds still and the whole
        // picture is at its crisp, exact self for part of every breath.
        const breath = rise * rise
        const depth = breath * tile.band * BREATH_DEPTH
        force.x += tile.fromFocusX * depth + tile.strayX * tile.weight * rise * 12
        force.y += tile.fromFocusY * depth + tile.strayY * tile.weight * rise * 12
        force.glow += breath * tile.band * 0.85
    },
}

export const BEHAVIOURS: Record<ParticleStyle, Behaviour> = { burst, loops, target, scan, pinwheel, drive, breathe }
