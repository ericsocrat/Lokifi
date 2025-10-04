import React from "react"
import AlertModal from "@/components/AlertModal"

export default function AlertPortal() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener("lokifi:open-alert", onOpen)
    return () => window.removeEventListener("lokifi:open-alert", onOpen)
  }, [])

  return open ? <AlertModal open={open} onClose={()=>setOpen(false)} /> : null
}
