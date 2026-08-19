"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Printer,
  X,
  Layout,
  Sliders,
  Check,
  Columns3,
  Calendar,
  Table,
  FileText,
  Eye,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type DaySchedule,
  type PrintOptions,
  getSubjectStyle,
} from "./schedule-types";

interface SchedulePrintModalProps {
  open: boolean;
  onClose: () => void;
  days: DaySchedule[];
  weekLabel: string;
  options: PrintOptions;
  onOptionsChange: (options: PrintOptions) => void;
}

export function SchedulePrintModal({
  open,
  onClose,
  days,
  weekLabel,
  options,
  onOptionsChange,
}: SchedulePrintModalProps) {
  const [localOptions, setLocalOptions] = useState<PrintOptions>(options);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  const updateOpt = <K extends keyof PrintOptions>(key: K, val: PrintOptions[K]) => {
    const next = { ...localOptions, [key]: val };
    setLocalOptions(next);
    onOptionsChange(next);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredDays =
    localOptions.selectedDay === "all"
      ? days
      : days.filter((d) => d.key === localOptions.selectedDay);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative z-10 w-full max-w-5xl h-[90vh] max-h-[850px] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-5 py-3.5 border-b border-border bg-surface-1 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Print & Export Schedule</h2>
                <p className="text-xs text-muted-foreground">Customize layout, details, and formatting for print or PDF</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body: Split Controls & Live Preview */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Controls Pane */}
            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border p-4 md:p-5 overflow-y-auto space-y-5 bg-surface-0/60 shrink-0">
              {/* Layout Option */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-primary" /> Layout Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "timetable", label: "Timetable", icon: Columns3 },
                    { id: "agenda", label: "Agenda", icon: Calendar },
                    { id: "compact", label: "Compact", icon: Table },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = localOptions.layout === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateOpt("layout", item.id as any)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                          isSelected
                            ? "bg-primary/15 border-primary/50 text-primary"
                            : "bg-surface-1 border-border text-muted-foreground hover:text-foreground hover:bg-surface-2"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Theme (Ink-saving vs Accents) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" /> Print Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateOpt("colorTheme", "bw")}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-semibold ${
                      localOptions.colorTheme === "bw"
                        ? "bg-primary/15 border-primary/50 text-primary"
                        : "bg-surface-1 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Ink Saver (B&W)</p>
                      <p className="text-[10px] text-muted-foreground font-normal">Clean crisp black & white</p>
                    </div>
                    {localOptions.colorTheme === "bw" && <Check className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateOpt("colorTheme", "accent")}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-semibold ${
                      localOptions.colorTheme === "accent"
                        ? "bg-primary/15 border-primary/50 text-primary"
                        : "bg-surface-1 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Subject Colors</p>
                      <p className="text-[10px] text-muted-foreground font-normal">Subtle color accents</p>
                    </div>
                    {localOptions.colorTheme === "accent" && <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Day Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Days to Include</label>
                <select
                  value={localOptions.selectedDay}
                  onChange={(e) => updateOpt("selectedDay", e.target.value)}
                  className="w-full bg-surface-1 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                >
                  <option value="all">Whole Week (All 5 Days)</option>
                  {days.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.dayName} ({d.shortDate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Details Toggles */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-primary" /> Visible Information
                </label>

                <div className="space-y-1.5 bg-surface-1 p-3 rounded-xl border border-border text-xs">
                  {[
                    { key: "showTeachers", label: "Include Teacher Names" },
                    { key: "showRooms", label: "Include Room Numbers" },
                    { key: "showGroups", label: "Include Class / Teaching Groups" },
                    { key: "showTimes", label: "Include Start & End Times" },
                  ].map((item) => {
                    const isChecked = localOptions[item.key as keyof PrintOptions] as boolean;
                    return (
                      <label
                        key={item.key}
                        className="flex items-center justify-between py-1 cursor-pointer select-none text-foreground/90 hover:text-foreground"
                      >
                        <span>{item.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => updateOpt(item.key as any, e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-0 focus:outline-none accent-primary"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Custom Titles */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Header Titles</label>
                <input
                  type="text"
                  value={localOptions.title}
                  onChange={(e) => updateOpt("title", e.target.value)}
                  placeholder="Document Title"
                  className="w-full bg-surface-1 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                />
                <input
                  type="text"
                  value={localOptions.subtitle}
                  onChange={(e) => updateOpt("subtitle", e.target.value)}
                  placeholder="Subtitle (e.g. Week / Class)"
                  className="w-full bg-surface-1 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* Right Live Preview Pane */}
            <div className="flex-1 p-4 md:p-6 bg-surface-2/40 overflow-y-auto flex flex-col items-center">
              <div className="w-full max-w-2xl flex items-center justify-between pb-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <Eye className="w-3.5 h-3.5" /> Live Preview
                </span>
                <span>Ready for A4 / Letter format</span>
              </div>

              {/* Paper Preview Sheet */}
              <div className="w-full max-w-2xl bg-white text-black rounded-xl p-6 shadow-xl border border-gray-300 font-sans text-xs space-y-4 select-none">
                {/* Paper Header */}
                <div className="border-b-2 border-black pb-2 flex items-start justify-between">
                  <div>
                    <h1 className="text-lg font-bold text-black">{localOptions.title || "School Schedule"}</h1>
                    <p className="text-xs text-gray-600">{localOptions.subtitle || weekLabel}</p>
                  </div>
                  <div className="text-right text-[10px] text-gray-500">
                    <p className="font-bold text-black">SchoolSoft+</p>
                    <p>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>

                {/* Preview Content */}
                {localOptions.layout === "timetable" && (
                  <div className="border border-black">
                    <div className={`grid grid-cols-${filteredDays.length} border-b border-black bg-gray-100 font-bold text-[11px] text-center`}>
                      {filteredDays.map((d) => (
                        <div key={d.key} className="py-1 border-r last:border-r-0 border-black">
                          {d.dayName}
                        </div>
                      ))}
                    </div>
                    <div className={`grid grid-cols-${filteredDays.length} divide-x divide-black min-h-[260px]`}>
                      {filteredDays.map((d) => (
                        <div key={d.key} className="p-1 space-y-1">
                          {d.lessons.slice(0, 4).map((l, i) => {
                            const style = getSubjectStyle(l.name, l.eventColor);
                            return (
                              <div
                                key={i}
                                className="p-1 rounded text-[10px] border border-gray-300 bg-gray-50"
                                style={
                                  localOptions.colorTheme === "accent"
                                    ? { borderLeftWidth: "3px", borderLeftColor: style.accent }
                                    : { borderLeftWidth: "2px", borderLeftColor: "#000000" }
                                }
                              >
                                <div className="font-bold text-black truncate">{l.name}</div>
                                {localOptions.showTimes && (
                                  <div className="text-[9px] text-gray-600 font-mono">
                                    {l.start}–{l.end}
                                  </div>
                                )}
                                <div className="flex gap-1 text-[9px] text-gray-700">
                                  {localOptions.showRooms && l.room && <span>{l.room}</span>}
                                  {localOptions.showTeachers && l.teacher && <span>· {l.teacher}</span>}
                                </div>
                              </div>
                            );
                          })}
                          {d.lessons.length > 4 && (
                            <p className="text-[9px] text-gray-500 text-center">+{d.lessons.length - 4} more</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {localOptions.layout === "agenda" && (
                  <div className="space-y-2">
                    {filteredDays.slice(0, 2).map((d) => (
                      <div key={d.key} className="border border-black rounded p-2">
                        <p className="font-bold text-xs border-b pb-1 mb-1">{d.dayName} ({d.shortDate})</p>
                        {d.lessons.slice(0, 3).map((l, i) => (
                          <div key={i} className="flex justify-between py-0.5 text-[11px]">
                            <span className="font-mono text-gray-700">{l.start}–{l.end}</span>
                            <span className="font-bold">{l.name}</span>
                            <span className="text-gray-600">{localOptions.showRooms && l.room}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {localOptions.layout === "compact" && (
                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black font-bold">
                        <th className="p-1 border-r border-black">Day</th>
                        <th className="p-1 border-r border-black">Time</th>
                        <th className="p-1 border-r border-black">Subject</th>
                        <th className="p-1">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDays.flatMap((d) =>
                        d.lessons.slice(0, 2).map((l, i) => (
                          <tr key={`${d.key}-${i}`} className="border-b border-gray-200">
                            <td className="p-1 border-r border-gray-200">{d.dayName.slice(0, 3)}</td>
                            <td className="p-1 border-r border-gray-200 font-mono">{l.start}–{l.end}</td>
                            <td className="p-1 border-r border-gray-200 font-bold">{l.name}</td>
                            <td className="p-1">{l.room || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="px-5 py-3 border-t border-border bg-surface-1 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Tip: Use Landscape in print dialog for 5-day Timetable view
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handlePrint} className="text-xs gap-1.5 font-bold">
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
