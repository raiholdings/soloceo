import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { CurrentUser, Public } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { MarketplaceService } from "./marketplace.service";

class CreateListingDto {
  @IsUUID()
  ventureId!: string;

  @IsInt()
  @Min(1_000_000)
  askPrice!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  summary!: string;
}

class CreateOfferDto {
  @IsInt()
  @Min(1_000_000)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

class DealMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  content!: string;
}

@ApiTags("marketplace")
@ApiBearerAuth()
@Controller()
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("ventures/:id/listing-eligibility")
  @ApiOperation({ summary: "Kiểm tra điều kiện niêm yết M&A (Phần 5.4)" })
  eligibility(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) ventureId: string,
  ) {
    return this.marketplace.checkEligibility(user, ventureId);
  }

  @Post("listings")
  @ApiOperation({
    summary: "Niêm yết venture (ttmRevenue tự tính, khóa) → chờ admin duyệt",
  })
  createListing(@CurrentUser() user: RequestUser, @Body() dto: CreateListingDto) {
    return this.marketplace.createListing(
      user,
      dto.ventureId,
      dto.askPrice,
      dto.summary,
    );
  }

  @Public()
  @Get("marketplace/listings")
  @ApiOperation({ summary: "Danh sách niêm yết public (doanh thu dạng khoảng)" })
  publicListings() {
    return this.marketplace.publicListings();
  }

  @Post("marketplace/listings/:id/nda")
  @ApiOperation({ summary: "Chấp nhận NDA click-wrap" })
  acceptNda(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) listingId: string,
  ) {
    return this.marketplace.acceptNda(user, listingId);
  }

  @Get("marketplace/listings/:id")
  @ApiOperation({ summary: "Chi tiết listing (cần đăng nhập + NDA)" })
  detail(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) listingId: string,
  ) {
    return this.marketplace.listingDetail(user, listingId);
  }

  @Post("listings/:id/offers")
  @ApiOperation({ summary: "Đặt offer mua venture" })
  createOffer(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) listingId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.marketplace.createOffer(user, listingId, dto.amount, dto.message);
  }

  @Post("offers/:id/accept")
  @ApiOperation({
    summary: "Seller chấp nhận offer → IN_ESCROW + mở deal-room, báo admin",
  })
  acceptOffer(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) offerId: string,
  ) {
    return this.marketplace.acceptOffer(user, offerId);
  }

  @Get("deal-rooms/:id")
  @ApiOperation({ summary: "Deal-room: thread + checklist chuyển giao" })
  dealRoom(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.marketplace.getDealRoom(user, id);
  }

  @Post("deal-rooms/:id/messages")
  @ApiOperation({ summary: "Nhắn tin trong deal-room" })
  message(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealMessageDto,
  ) {
    return this.marketplace.postDealMessage(user, id, dto.content);
  }
}
