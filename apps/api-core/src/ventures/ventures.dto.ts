import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

const INDUSTRIES = [
  "real_estate",
  "fnb",
  "education",
  "services",
  "other",
] as const;

export class CreateVentureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  // slug là subdomain: {slug}.app.soloceo.vn
  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/, {
    message:
      "Slug chỉ gồm chữ thường, số, dấu gạch ngang; 2–40 ký tự; không bắt đầu/kết thúc bằng gạch ngang",
  })
  slug!: string;

  @IsOptional()
  @IsIn(INDUSTRIES as unknown as string[])
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateVentureDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(INDUSTRIES as unknown as string[])
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
