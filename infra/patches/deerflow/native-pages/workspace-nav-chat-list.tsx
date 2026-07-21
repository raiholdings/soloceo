"use client";

import { BotIcon, FolderIcon, CalendarClock, GraduationCap, LayoutDashboard, LayoutGrid, MessageCircle, MessagesSquare, Users, Video, VideoIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <SidebarGroup className="pt-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname === "/workspace/chats" || pathname.startsWith("/workspace/chats/")} asChild>
            <Link className="text-muted-foreground" href="/workspace/chats">
              <MessagesSquare />
              <span>{t.sidebar.chats}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname.startsWith("/workspace/du-an")} asChild>
            <Link className="text-muted-foreground" href="/workspace/du-an">
              <FolderIcon />
              <span>Dự án</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* Trợ lý AI — gộp Mô hình KD / Phễu bán hàng / Thị trường vào đây (có bộ lọc nhóm) */}
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
        {/* Việc theo lịch — ngay sau Trợ lý AI */}
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
        {/* Nền tảng — cổng dịch vụ PaaS + tên miền (platform.soloceo.vn / WHMCS), thay Chợ ứng dụng */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/nen-tang")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/nen-tang">
              <LayoutGrid />
              <span>Nền tảng</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* CRM — Perfex SaaS tại crm.soloceo.vn (nhúng workspace) */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/crm")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/crm">
              <LayoutDashboard />
              <span>CRM</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* Chat đa kênh — Support Board SaaS tại chat.soloceo.vn (nhúng workspace) */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/workspace/chat" || pathname.startsWith("/workspace/chat/")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/chat">
              <MessagesSquare />
              <span>Chat đa kênh</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {/* Đào tạo (LMS) — Academy tại edu.soloceo.vn */}
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname.startsWith("/workspace/dao-tao")} asChild>
            <Link className="text-muted-foreground" href="/workspace/dao-tao">
              <GraduationCap />
              <span>Đào tạo</span>
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
