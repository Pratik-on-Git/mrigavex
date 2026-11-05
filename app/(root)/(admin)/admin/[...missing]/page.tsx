import { notFound } from "next/navigation"

// Catch-all so unknown /admin/* URLs render the admin 404 inside the shell.
export default function AdminMissingPage() {
    notFound()
}
