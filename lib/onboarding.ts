import { emptyProject } from "./model";
export const starterStages = [
  "Preconstruction",
  "Foundation",
  "Ground floor",
  "Roof & structure",
  "Electrical & plumbing",
  "Finishes",
];
export type HomeSetup = {
  name: string;
  location: string;
  budget: string;
  target: string;
  stages: boolean;
};
export function buildFirstHome(input: HomeSetup) {
  const name = input.name.trim(),
    location = input.location.trim();
  if (!name || name.length > 100)
    throw new Error("Enter a home name (up to 100 characters).");
  if (!location || location.length > 200)
    throw new Error("Enter your area and city (up to 200 characters).");
  const budget = input.budget.trim() ? Number(input.budget) : 0;
  if (!Number.isFinite(budget) || budget < 0 || budget > 1e12)
    throw new Error("Enter a valid budget, or leave it blank.");
  if (
    input.target &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(input.target) ||
      !Number.isFinite(Date.parse(input.target)) ||
      new Date(input.target).toISOString().slice(0, 10) !== input.target)
  )
    throw new Error("Choose a valid target date.");
  return {
    ...emptyProject(),
    name,
    location,
    budget,
    target: input.target,
    stages: input.stages
      ? starterStages.map((title) => ({
          id: crypto.randomUUID(),
          title,
          owner: "",
          due: "",
          progress: 0,
          budget: 0,
          remaining: 0,
          note: "",
        }))
      : [],
  };
}
