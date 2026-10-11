// Re-export shared types
export * from "./landing";
export * from "./auth";
export * from "./school";
export * from "./academic";
export * from "./curriculum";
export * from "./subscription";
export * from "./website";
export * from "./staff";
export * from "./students";
export * from "./fees";
export * from "./collection";
export * from "./feeOperations";
export * from "./onlinePayment";
export * from "./transport";
// Explicit re-export to resolve name collision between staff.ts and transport.ts
export type { StaffStatus } from "./staff";
export type { StaffStatus as TransportStaffStatus } from "./transport";

