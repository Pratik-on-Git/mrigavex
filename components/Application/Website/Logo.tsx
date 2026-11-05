import { cn } from "@/lib/utils"

// The MVX mark, 64×25. Exported so the Perspective section can reuse the shape.
export const LOGO_PATH =
    "M19.46 16.3418L28.9082 0H33.915V16.3398L43.3623 0H49.1436L53.4795 7.5L57.8154 0H63.5967L56.3701 12.499L63.5977 25H57.8164L53.4795 17.499L49.1436 25H43.3633L50.5889 12.499L46.2529 4.99902L34.6895 25H28.9082V24.999V9.99902L20.2354 25H14.4541L14.4531 24.999V10.001L5.78125 25H0L14.4531 0H19.46V16.3418Z"

// Inline, so it stays sharp at any size and takes its colour from the text
// colour. Decorative: links around it carry the name. Set the size with a height.
export default function Logo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 25" fill="currentColor" aria-hidden className={cn("block h-[25px] w-auto text-mx-logo", className)}>
            <path d={LOGO_PATH} />
        </svg>
    )
}
