import { useEffect } from "react"

// Browser-level guard against closing/reloading the tab with unsaved edits.
// (In-app link clicks are guarded by the editor itself.)
export default function useUnsavedChanges(dirty: boolean) {
    useEffect(() => {
        if (!dirty) return
        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ""
        }
        window.addEventListener("beforeunload", handler)
        return () => window.removeEventListener("beforeunload", handler)
    }, [dirty])
}
