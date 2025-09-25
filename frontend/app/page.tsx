import ChartPanel from "@/components/ChartPanel";
import SymbolPicker from "@/components/SymbolPicker";
import TimeframePicker from "@/components/TimeframePicker";
import NewsList from "@/components/NewsList";
import IndicatorPanel from "@/components/IndicatorPanel";
import IndicatorSettingsDrawer from "@/components/IndicatorSettingsDrawer";
import CopilotChat from "@/components/CopilotChat";

export default function Home() {
  return (
    <main className="grid grid-cols-12 gap-4 p-4">
      <section className="col-span-12 lg:col-span-9 space-y-3">
        <div className="flex items-center gap-3">
          <SymbolPicker />
          <TimeframePicker />
        </div>
        <ChartPanel />
      </section>
      <aside className="col-span-12 lg:col-span-3 space-y-4">
        <CopilotChat />
        <IndicatorPanel />
        <IndicatorSettingsDrawer />
        <NewsList />
      </aside>
    </main>
  );
}
