import { ProjectContent } from "./projectApi";

export type ProjectFilter = ProjectContent["category"] | "ALL";
export const projectFilters = ["ALL", "WEBSITE", "APP", "SYSTEM"] as const;
export function projectFilter(value: string | null): ProjectFilter {
  return projectFilters.find(filter => filter === value) ?? "ALL";
}
export const workAddress = (filter: ProjectFilter) => filter === "ALL" ? "/portfolio" : `/portfolio?category=${filter}`;
export const projectAddress = (slug: string, filter: ProjectFilter = "ALL") => `/portfolio/${encodeURIComponent(slug)}${filter === "ALL" ? "" : `?category=${filter}`}`;
