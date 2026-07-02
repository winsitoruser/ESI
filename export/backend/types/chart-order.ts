import { z } from "zod";

const TypesChartOrderSchema = z.object({
  timeframe: z.string(),
  total: z.number(),
})

export type TypesChartOrder = z.infer<typeof TypesChartOrderSchema>