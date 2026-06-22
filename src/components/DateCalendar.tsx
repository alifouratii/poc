import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getMonthGrid(activeMonth: Date) {
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

type DateCalendarProps = {
  value: string;
  availableDates: string[];
  onChange: (date: string) => void;
};

export function DateCalendar({
  value,
  availableDates,
  onChange,
}: DateCalendarProps) {
  const [activeMonth, setActiveMonth] = useState(() => parseDateKey(value));

  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates],
  );

  const dates = useMemo(() => getMonthGrid(activeMonth), [activeMonth]);

  useEffect(() => {
    setActiveMonth(parseDateKey(value));
  }, [value]);

  function moveMonth(direction: -1 | 1) {
    setActiveMonth((previousMonth) => {
      return new Date(
        previousMonth.getFullYear(),
        previousMonth.getMonth() + direction,
        1,
      );
    });
  }

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <strong className="text-sm font-black text-slate-700">
          {formatMonthLabel(activeMonth)}
        </strong>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => moveMonth(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
        {WEEK_DAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const dateKey = toDateKey(date);
          const isCurrentMonth = date.getMonth() === activeMonth.getMonth();
          const isAvailable = availableDateSet.has(dateKey);
          const isSelected = value === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!isAvailable}
              className={[
                "h-8 rounded-xl text-xs font-black transition",
                isCurrentMonth ? "text-slate-700" : "text-slate-300",
                isAvailable
                  ? "cursor-pointer border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                  : "cursor-not-allowed bg-slate-50 opacity-45",
                isSelected
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600"
                  : "",
              ].join(" ")}
              onClick={() => onChange(dateKey)}
              title={isAvailable ? "Available raster date" : "No raster for this date"}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] font-semibold text-slate-500">
        Only dates with available raster mocks are enabled.
      </p>
    </div>
  );
}
