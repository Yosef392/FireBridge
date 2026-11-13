/**
 * Data-source configuration.
 *
 * demo (default): the app runs entirely on the bundled illustrative dataset.
 * api:            the app calls the Python FastAPI backend (see README → "Backend contract").
 */
export type DataMode = "demo" | "api";

export const DATA_MODE: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === "api" ? "api" : "demo";
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const IS_DEMO = DATA_MODE === "demo";
