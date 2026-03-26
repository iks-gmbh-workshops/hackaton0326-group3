"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DialogRoot,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTranslations } from "next-intl"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  variant = "default",
  onConfirm,
}: ConfirmationDialogProps) {
  const t = useTranslations("confirmDialog")

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelText || t("cancel")}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
          >
            {confirmText || t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<{
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
  } | null>(null)
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback(
    (options: {
      title: string
      description: string
      confirmText?: string
      cancelText?: string
      variant?: "default" | "destructive"
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfig(options)
        setIsOpen(true)
        resolveRef.current = resolve
      })
    },
    []
  )

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true)
    setIsOpen(false)
    setConfig(null)
  }, [])

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false)
    setIsOpen(false)
    setConfig(null)
  }, [])

  const dialog = config ? (
    <ConfirmationDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}
      title={config.title}
      description={config.description}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      variant={config.variant}
      onConfirm={handleConfirm}
    />
  ) : null

  return { confirm, dialog }
}
