import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onSelect: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  className,
  from,
  to,
  onSelect,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from,
    to,
  });

  // Update local state when props change
  React.useEffect(() => {
    if (from !== undefined) {
      setDate({ from, to });
    }
  }, [from, to]);

  // Handle selection and call parent callback
  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    onSelect(range);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal border-red-200 hover:bg-red-50 hover:text-red-600",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d MMMM yyyy", { locale: id })} -{" "}
                  {format(date.to, "d MMMM yyyy", { locale: id })}
                </>
              ) : (
                format(date.from, "d MMMM yyyy", { locale: id })
              )
            ) : (
              <span>Pilih tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={id}
            className="border rounded-md"
            classNames={{
              day_selected: "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white",
              day_today: "bg-red-50 text-red-600",
              day_range_middle: "bg-red-100 text-red-800",
              day_range_end: "bg-red-500 text-white hover:bg-red-600",
              day_range_start: "bg-red-500 text-white hover:bg-red-600",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Tambahan untuk React Hook Form
interface DateRangePickerInputProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  locale?: Locale;
  className?: string;
  formContext?: boolean; // Add option to specify if using inside form context
}

export function DateRangePickerInput({
  value,
  onChange,
  locale = id,
  className,
  formContext = false, // Default to not using form context
}: DateRangePickerInputProps) {
  // This standalone component doesn't depend on FormContext from react-hook-form
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal border-red-200 hover:bg-red-50 hover:text-red-600",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "d MMMM yyyy", { locale })} -{" "}
                  {format(value.to, "d MMMM yyyy", { locale })}
                </>
              ) : (
                format(value.from, "d MMMM yyyy", { locale })
              )
            ) : (
              <span>Pilih rentang tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(newValue) => {
              if (newValue) {
                onChange(newValue);
              }
            }}
            numberOfMonths={2}
            locale={locale}
            className="border rounded-md"
            classNames={{
              day_selected: "bg-red-500 text-white hover:bg-red-600 hover:text-white focus:bg-red-500 focus:text-white",
              day_today: "bg-red-50 text-red-600",
              day_range_middle: "bg-red-100 text-red-800",
              day_range_end: "bg-red-500 text-white hover:bg-red-600",
              day_range_start: "bg-red-500 text-white hover:bg-red-600",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
