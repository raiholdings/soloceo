"use client";

import { BotIcon, Building2, CalendarClock, Lightbulb, Filter as FunnelIcon, MessageCircle, MessagesSquare, ShieldCheck, ShoppingBag, Users, Video, VideoIcon, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSoloceoAuth } from "@/components/workspace/soloceo-api";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAgentsApiEnabled } from "@/core/agents";
import { useI18n } from "@/core/i18n/hooks";

export function WorkspaceNavChatList() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { enabled: agentsEnabled } = useAgentsApiEnabled();
  // Mục "Quản trị" chỉ hiện với tài khoản ADMIN_EMAILS (cờ từ cầu SSO — cache sẵn)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    getSoloceoAuth().then((a) => setIsAdmin(a.platformAdmin === true)).catch(() => setIsAdmin(false));
  }, []);
  return (
    <SidebarGroup className="pt-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname === "/workspace/chats"} asChild>
            <Link className="text-muted-foreground" href="/workspace/chats">
              <MessagesSquare />
              <span>{t.sidebar.chats}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          {agentsEnabled ? (
            <SidebarMenuButton
              isActive={pathname.startsWith("/workspace/agents")}
              asChild
            >
              <Link className="text-muted-foreground" href="/workspace/agents">
                <BotIcon />
                <span>{t.sidebar.agents}</span>
              </Link>
            </SidebarMenuButton>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full cursor-not-allowed">
                  <SidebarMenuButton
                    className="text-muted-foreground/50"
                    aria-disabled
                    aria-describedby="agents-disabled-reason"
                  >
                    <BotIcon />
                    <span>{t.sidebar.agents}</span>
                  </SidebarMenuButton>
                  <span id="agents-disabled-reason" className="sr-only">
                    {t.sidebar.agentsDisabledTooltip}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t.sidebar.agentsDisabledTooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </SidebarMenuItem>
        {/* Chợ ứng dụng — CEO mua nền tảng/tài nguyên, provision lên node PaaS */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/cho-ung-dung")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/cho-ung-dung">
              <ShoppingBag />
              <span>Chợ ứng dụng</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* Mô hình kinh doanh — thư viện mô hình đóng gói trọn, đội AI thực thi */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/mo-hinh-kinh-doanh")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/mo-hinh-kinh-doanh">
              <Lightbulb />
              <span>Mô hình kinh doanh</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* Phễu bán hàng — thư viện khung phễu, đội AI thi công từng khâu */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/pheu-ban-hang")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/pheu-ban-hang">
              <FunnelIcon />
              <span>Phễu bán hàng</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* Quản trị — chỉ tài khoản ADMIN_EMAILS thấy (guard api-core vẫn chặn 403 phía sau) */}
        {isAdmin && (
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith("/workspace/admin")}
              asChild
            >
              <Link className="text-muted-foreground" href="/workspace/admin">
                <ShieldCheck />
                <span>Quản trị</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/scheduled-tasks")}
            asChild
          >
            <Link
              className="text-muted-foreground"
              href="/workspace/scheduled-tasks"
            >
              <CalendarClock />
              <span>{t.sidebar.scheduledTasks}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* --- Nền tảng phục vụ Solo CEO (SoloCEO OS v2) --- */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/doanh-nghiep")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/doanh-nghiep">
              <Building2 />
              <span>Doanh nghiệp của tôi</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/phe-duyet")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/phe-duyet">
              <ShieldCheck />
              <span>Phê duyệt</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/quy-trinh")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/quy-trinh">
              <Workflow />
              <span>Quy trình</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* --- Cộng đồng / Video / Nhóm chat (WoWonder/PlayTube/Grupo) --- */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/cong-dong")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/cong-dong">
              <Users />
              <span>Cộng đồng</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/video")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/video">
              <Video />
              <span>Video</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/nhom-chat")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/nhom-chat">
              <MessageCircle />
              <span>Nhóm chat</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* Họp video — LiveSmart SFU tại meeting.soloceo.vn (Zoom của SoloCEO) */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/hop-video")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/hop-video">
              <VideoIcon />
              <span>Họp video</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
