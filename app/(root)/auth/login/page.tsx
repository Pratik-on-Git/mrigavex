import { Suspense } from "react"
import LoginFlow from "@/components/Application/Auth/LoginFlow"
import { Skeleton } from "@/components/ui/skeleton"

// Admin sign-in. There is no register or forgot-password page by design:
// the single owner account is managed with `npm run admin` (see CLAUDE.md).
export default function LoginPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[26rem] w-full max-w-sm rounded-2xl" />}>
            <LoginFlow />
        </Suspense>
    )
}
