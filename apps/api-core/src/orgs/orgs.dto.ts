import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateOrgDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
