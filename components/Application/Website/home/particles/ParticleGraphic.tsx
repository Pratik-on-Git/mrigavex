"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { BEHAVIOURS, type BehaviourName } from "./behaviours"
import { animateGraphic, parseGraphic } from "./engine"

// An expertise graphic. The vector file loads as a plain image: exact on first
// paint, and what visitors keep if they prefer reduced motion, have no JavaScript or
// have no WebGL2. Near the viewport a canvas takes its place, drawing the same file
// in thousands of tiles that can move.
export default function ParticleGraphic({ src, behaviour }: { src: string; behaviour: BehaviourName }) {
    const hostRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const host = hostRef.current
        if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const request = new AbortController()
        let undo: (() => void) | undefined

        const start = async () => {
            const response = await fetch(src, { signal: request.signal })
            if (!response.ok) return
            const graphic = parseGraphic(await response.text())
            if (!graphic) return

            // The picture is slightly taller than its box, like the image's object-cover.
            // Centring it by layout has the browser snap this rectangle to device pixels
            // as it does the image's, so the swap between the two can't shift the picture.
            const canvas = document.createElement("canvas")
            canvas.className = "invisible block h-auto w-full flex-none"
            canvas.style.aspectRatio = `${graphic.width} / ${graphic.height}`
            const image = host.querySelector("img")
            host.append(canvas)

            const showImage = () => {
                canvas.classList.add("invisible")
                if (image) image.style.visibility = ""
            }
            const stop = animateGraphic(host, canvas, graphic, BEHAVIOURS[behaviour], {
                // Swapped only now, because an undrawn canvas would flash black.
                onFirstFrame: () => {
                    canvas.classList.remove("invisible")
                    if (image) image.style.visibility = "hidden"
                },
                onContextLost: showImage,
            })
            if (!stop) {
                canvas.remove()
                return
            }
            undo = () => {
                stop()
                canvas.remove()
                showImage()
            }
        }

        const nearby = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return
            nearby.disconnect()
            // If this fails the image stays, which is the same picture without the motion.
            start().catch(() => {})
        }, { rootMargin: "800px" })
        nearby.observe(host)

        return () => {
            nearby.disconnect()
            request.abort()
            undo?.()
        }
    }, [src, behaviour])

    return (
        <div ref={hostRef} aria-hidden className="absolute inset-0 flex items-center">
            <Image src={src} alt="" fill unoptimized className="object-cover" />
        </div>
    )
}
