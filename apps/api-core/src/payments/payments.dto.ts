import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export class CheckoutDto {
  @IsIn(["subscription", "ai_credit", "venture_payment"])
  type!: "subscription" | "ai_credit" | "venture_payment";

  @IsOptional()
  @IsIn(["STARTER", "GROWTH", "SCALE"])
  plan?: string;

  @IsOptional()
  @IsUUID()
  ventureId?: string;

  // số tiền VND cho ai_credit / venture_payment
  @IsOptional()
  @IsInt()
  @Min(1000)
  amount?: number;

  @IsOptional()
  @IsIn(["stripe", "payos"])
  provider?: "stripe" | "payos";

  @IsOptional()
  @IsString()
  description?: string;
}

export class ManualRevenueDto {
  @IsUUID()
  ventureId!: string;

  @IsInt()
  @Min(1000)
  amount!: number;

  @IsISO8601()
  occurredAt!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
