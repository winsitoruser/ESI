import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { FaCalendarAlt, FaChevronDown } from 'react-icons/fa'

interface DateRangePickerProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  align?: 'start' | 'center' | 'end'
  locale?: string
  className?: string
}

export function DateRangePicker({
  date,
  onDateChange,
  align = 'start',
  locale = 'id',
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <FaCalendarAlt className="mr-2 h-4 w-4 text-orange-500" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "dd MMMM yyyy", { locale: locale === 'id' ? id : undefined })} -{" "}
                {format(date.to, "dd MMMM yyyy", { locale: locale === 'id' ? id : undefined })}
              </>
            ) : (
              format(date.from, "dd MMMM yyyy", { locale: locale === 'id' ? id : undefined })
            )
          ) : (
            <span>Pilih Rentang Tanggal</span>
          )}
          <FaChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={onDateChange}
          numberOfMonths={2}
          locale={locale === 'id' ? id : undefined}
          className="border rounded-md bg-white"
        />
        <div className="flex items-center justify-between p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date()
              onDateChange({
                from: new Date(today.setHours(0, 0, 0, 0)),
                to: new Date(today)
              })
            }}
          >
            Hari Ini
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date()
              const weekStartDate = new Date(today)
              weekStartDate.setDate(today.getDate() - today.getDay())
              weekStartDate.setHours(0, 0, 0, 0)
              onDateChange({
                from: weekStartDate,
                to: new Date(today)
              })
            }}
          >
            Minggu Ini
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date()
              const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
              monthStartDate.setHours(0, 0, 0, 0)
              onDateChange({
                from: monthStartDate,
                to: new Date(today)
              })
            }}
          >
            Bulan Ini
          </Button>
          <Button 
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            size="sm"
            onClick={() => {
              setIsOpen(false)
            }}
          >
            Terapkan
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
