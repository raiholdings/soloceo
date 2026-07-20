import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: giữ body thô cho verify chữ ký webhook Zalo OA (channels/zalo — R7 §2).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix("v1");
  app.use(helmet());
  // CORS whitelist (GĐ7): dev mở localhost; prod chỉ các frontend SoloCEO
  const origins =
    process.env.NODE_ENV === "production"
      ? [
          "https://soloceo.vn",
          "https://www.soloceo.vn",
          "https://app.soloceo.vn", // landing + onboarding (web-community)
          "https://admin.soloceo.vn", // Admin Console native (control-plane)
          // C8 (v2 cleanup): platform.soloceo.vn (OS Shell 3D) đã gỡ khỏi core
          // (cụm sang openclawos.vn). Bỏ khỏi CORS whitelist.
          // "https://platform.soloceo.vn",
        ]
      : true;
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("SoloCEO API")
    .setDescription("API lõi nền tảng SoloCEO — xem CLAUDE.md Phần 6")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`api-core chạy tại http://localhost:${port} (Swagger: /docs)`);
}

bootstrap();
