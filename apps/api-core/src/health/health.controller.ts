import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Kiểm tra tình trạng api-core" })
  check() {
    return {
      status: "ok",
      service: "api-core",
      timestamp: new Date().toISOString(),
    };
  }
}
