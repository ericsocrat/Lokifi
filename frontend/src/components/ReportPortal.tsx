import React from "react"
import ReportComposer from "@/components/ReportComposer"

export default function ReportPortal() {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener("lokifi:open-report", openHandler)
    return () => window.removeEventListener("lokifi:open-report", openHandler)
  }, [])
  return open ? <ReportComposer open={open} onClose={()=>setOpen(false)} /> : null
}
