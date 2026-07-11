"use client";

import { BookUser, BotIcon, Building2, CalendarClock, CreditCard, MessageCircle, MessagesSquare, Rocket, ShieldCheck, Users, Video, Workflow } from "lucide-react";
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
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/tao-doanh-nghiep")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/tao-doanh-nghiep">
              <Rocket />
              <span>Tạo doanh nghiệp</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/goi-cuoc")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/goi-cuoc">
              <CreditCard />
              <span>Gói cước</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/danh-ba")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/danh-ba">
              <BookUser />
              <span>Danh bạ</span>
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
      </SidebarMenu>
    </SidebarGroup>
  );
}
