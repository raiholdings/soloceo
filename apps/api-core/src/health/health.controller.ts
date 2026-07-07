import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Public()
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
