import { useEffect, useState } from "react"

// Debounced copy of a value (search-as-you-type without a request per key).
export default function useDebounce<T>(value: T, delay = 350): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay)
        return () => window.clearTimeout(timer)
    }, [value, delay])
    return debounced
}
