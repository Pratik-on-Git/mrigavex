import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

// A real <select>, styled like <Input>. Native selects are fully accessible,
// work with react-hook-form's register() and use the phone's own picker on
// mobile — preferable to a custom listbox for simple forms and filters.
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
    return (
        <div className="relative w-full">
            <select
                data-slot="native-select"
                className={cn(
                    "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-1 pr-9 pl-2.5 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
                    className
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        </div>
    )
}

export { NativeSelect }
