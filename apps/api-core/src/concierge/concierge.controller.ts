import { Body, Controller, Headers, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Public } from "../auth/decorators";
import { ConciergeService } from "./concierge.service";

class ChatMessageDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

class ChatDto {
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}

@ApiTags("concierge")
@Controller("concierge")
export class ConciergeController {
  constructor(private readonly concierge: ConciergeService) {}

  @Public()
  // Lễ tân công cộng — siết rate riêng: 10 lượt/phút/IP (chống đốt model)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("chat")
  @ApiOperation({
    summary:
      "Lễ tân AI trang chủ: tư vấn + khởi tạo doanh nghiệp (Bearer token tùy chọn)",
  })
  chat(@Body() dto: ChatDto, @Headers("authorization") auth?: string) {
    return this.concierge.chat(dto.messages, auth);
  }
}
