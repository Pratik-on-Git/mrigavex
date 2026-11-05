import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// The design's filled "arrow-right" button icon: a 20px circle in a 24px box.
// Decorative: the button's label already says where it goes. `className` sets
// the circle and arrow colours.
export default function ArrowCircle({ className }: { className?: string }) {
    return (
        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center">
            <span className={cn("flex size-5 items-center justify-center rounded-full", className)}>
                <ArrowRightIcon className="size-3" strokeWidth={2.75} />
            </span>
        </span>
    )
}
