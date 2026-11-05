"use client"

import { Loader2Icon } from "lucide-react"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type ConfirmDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel: string
    destructive?: boolean
    pending?: boolean
    onConfirm: () => void
}

// Replaces window.confirm for destructive or bulk actions. Stays open while
// the action runs so a double-click can't fire it twice.
const ConfirmDialog = ({ open, onOpenChange, title, description, confirmLabel, destructive, pending, onConfirm }: ConfirmDialogProps) => (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>
                    {pending && <Loader2Icon className="animate-spin" aria-hidden />}
                    {confirmLabel}
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
)

export default ConfirmDialog
