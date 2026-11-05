import { z } from "zod";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const availabilitySchema = z
  .array(
    z
      .object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(HHMM, "Times must look like 09:00"),
        endTime: z.string().regex(HHMM, "Times must look like 17:00"),
        isActive: z.boolean(),
      })
      .refine((a) => a.startTime < a.endTime, { message: "Each day's start time must be before its end time." })
  )
  .max(7)
  .refine((days) => new Set(days.map((d) => d.dayOfWeek)).size === days.length, {
    message: "Each weekday can only have one availability window.",
  });

export const consultationTypeSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1, "Every consultation needs a title.").max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(15, "Sessions must be at least 15 minutes.").max(480, "Sessions can be at most 8 hours."),
  priceCents: z.coerce.number().int().min(0, "Price can't be negative.").max(1_000_000, "Price is too high."),
  communicationType: z.enum(["VIDEO", "PHONE", "IN_PERSON"]),
  isActive: z.boolean(),
});

export const bookingConfigurationSchema = z.object({
  availability: availabilitySchema,
  consultationTypes: z.array(consultationTypeSchema).max(20, "You can offer up to 20 consultation types."),
});

export type BookingConfigurationInput = z.input<typeof bookingConfigurationSchema>;

/** Whitelisted client-profile fields. Anything else (e.g. nested `user`) is dropped. */
export const clientProfileSchema = z.object({
  nationality: z.string().trim().max(100).optional(),
  languages: z.string().trim().max(300).optional(),
  currentCountry: z.string().trim().max(100).optional(),
  immigrationGoals: z.string().trim().max(2000).optional(),
  educationLevel: z.string().trim().max(100).optional(),
  maritalStatus: z.string().trim().max(50).optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  shareWithConsultant: z.boolean(),
});

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(200);
