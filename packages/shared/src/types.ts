// Domain types dùng chung giữa frontend/backend. Enum trạng thái phản chiếu
// packages/db/prisma/schema.prisma — thay đổi schema phải cập nhật tại đây.

export type OrgStatus = "ACTIVE" | "SUSPENDED" | "CHURNED";

export type VentureStatus =
  | "DRAFT"
  | "PROVISIONING"
  | "LIVE"
  | "PAUSED"
  | "LISTED"
  | "SOLD";

export type InstallStatus =
  | "QUEUED"
  | "DEPLOYING"
  | "RUNNING"
  | "FAILED"
  | "REMOVED";

export type TxDirection = "IN" | "OUT" | "PLATFORM_FEE";

export type ListingStatus =
  | "PENDING_REVIEW"
  | "LIVE"
  | "IN_ESCROW"
  | "SOLD"
  | "WITHDRAWN";

export type Industry =
  | "real_estate"
  | "fnb"
  | "education"
  | "services"
  | "other";

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
