import { z } from "zod";

export const CandidateProfileFormSchema = z
  .object({
    headline: z.string().trim().max(200).optional(),
    yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
    targetRoles: z.string().optional(),
    targetLocations: z.string().optional(),
    skills: z.string().optional(),
    excludedKeywords: z.string().optional(),
    minSalary: z.coerce.number().int().min(0).optional(),
    maxSalary: z.coerce.number().int().min(0).optional(),
    remoteOnly: z.coerce.boolean().optional(),
  })
  .refine((data) => !data.minSalary || !data.maxSalary || data.minSalary <= data.maxSalary, {
    message: "Minimum salary must be less than or equal to maximum salary.",
    path: ["minSalary"],
  });
