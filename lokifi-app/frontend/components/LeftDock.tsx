
"use client";
import { useEffect, useState } from "react";
import { MousePointer, Slash, Ruler, LineChart, Waves, Boxes, Brackets, Landmark, Settings } from "lucide-react";
import { drawStore } from "@/lib/drawStore";
import { pluginManager } from "@/plugins/registry";
import PluginSettingsDrawer from "@/components/PluginSettingsDrawer";
import { EXPERIMENTAL_PLUGINS } from "@/lib/flags";

export default function LeftDock(){
  const [activeTool, setActiveTool] = useState(drawStore.get().tool);
  const [activePlugin, setActivePlugin] = useState<string | null>(pluginManager.activeToolId);
  const [open, setOpen] = useState(false);

  useEffect(()=> {
    const unsub = drawStore.subscribe(s => setActiveTool(s.tool));
    return () => { unsub(); };
  }, []);
  useEffect(()=> {
    const i = setInterval(()=> setActivePlugin(pluginManager.activeToolId), 300);
    return ()=> clearInterval(i);
  }, []);

  const Btn = ({onClick, active, title, children}:{onClick:()=>void, active:boolean, title:string, children:React.ReactNode}) => (
    <button title={title} onClick={onClick} className={`p-2 rounded-xl ${active? "bg-electric/30 border border-electric": "border border-neutral-700 hover:bg-neutral-800"} flex items-center justify-center`}>{children}</button>
  );

  return (
    <div className="absolute left-2 top-16 z-20 flex flex-col gap-2 p-2 rounded-2xl bg-neutral-900/90 border border-neutral-800">
      <div className="text-[11px] uppercase tracking-wide opacity-70 mb-1">Tools</div>
      <Btn title="Cursor (V)" active={activeTool==='cursor'} onClick={()=> { pluginManager.setActiveTool(null); drawStore.setTool('cursor'); }}><MousePointer size={16} /></Btn>
      <Btn title="Trendline (T)" active={activeTool==='trendline'} onClick={()=> { pluginManager.setActiveTool(null); drawStore.setTool('trendline'); }}><LineChart size={16} /></Btn>
      <Btn title="HLine (H)" active={activeTool==='hline'} onClick={()=> { pluginManager.setActiveTool(null); drawStore.setTool('hline'); }}><Landmark size={16} /></Btn>
      <Btn title="Rectangle (M)" active={activeTool==='rect'} onClick={()=> { pluginManager.setActiveTool(null); drawStore.setTool('rect'); }}><Boxes size={16} /></Btn>

      {EXPERIMENTAL_PLUGINS && <>
        <div className="h-px bg-neutral-800 my-1" />
        <div className="text-[11px] uppercase tracking-wide opacity-70 mb-1">Plugins</div>
        <Btn title="Ruler (R)" active={activePlugin==='ruler-measure'} onClick={()=> pluginManager.setActiveTool(activePlugin==='ruler-measure'? null : 'ruler-measure')}><Ruler size={16} /></Btn>
        <Btn title="Channel (C)" active={activePlugin==='parallel-channel'} onClick={()=> pluginManager.setActiveTool(activePlugin==='parallel-channel'? null : 'parallel-channel')}><Waves size={16} /></Btn>
        <Btn title="Channel 3pt (Shift+C)" active={activePlugin==='parallel-channel-3pt'} onClick={()=> pluginManager.setActiveTool(activePlugin==='parallel-channel-3pt'? null : 'parallel-channel-3pt')}><Waves size={16} /></Btn>
        <Btn title="Fib+ (F)" active={activePlugin==='fib-extended'} onClick={()=> pluginManager.setActiveTool(activePlugin==='fib-extended'? null : 'fib-extended')}><Brackets size={16} /></Btn>
      </>}

      <div className="h-px bg-neutral-800 my-1" />
      <Btn title="Settings (Gear)" active={open} onClick={()=> setOpen(x=>!x)}><Settings size={16} /></Btn>
      <PluginSettingsDrawer open={open} onClose={()=> setOpen(false)} />
      <div className="text-[11px] opacity-60 mt-1">Keys: V T H M • R C Shift+C F</div>
    </div>
  );
}

