// src/ai/schemas.ts
import { z } from 'zod';

export const ReviewItemSchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  title: z.string(),
  explanation: z.string(),
  location: z.object({
    line: z.number(),
    snippet: z.string(),
  }),
  suggestion: z.string(),
  example: z.string().optional(),
});

export const ReviewSchema = z.object({
  summary: z.string(),
  performanceIssues: z.array(ReviewItemSchema),
  readabilityIssues: z.array(ReviewItemSchema),
  maintainabilityIssues: z.array(ReviewItemSchema),
  positives: z.array(z.string()),
});

export type AIReview = z.infer<typeof ReviewSchema>;
