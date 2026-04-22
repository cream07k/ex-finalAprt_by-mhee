"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MusicPlayer from "./MusicPlayer";
import VideoBackground from "./VideoBackground";
import AntiRightClick from "./AntiRightClick";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth   = pathname === "/login";

  if (isAuth) {
    return (
      <>
        <AntiRightClick />
        <VideoBackground />
        <main className="min-h-screen">{children}</main>
      </>
    );
  }

  return (
    <>
      <AntiRightClick />
      <Sidebar />
      <main className="main-content">{children}</main>
      <MusicPlayer />
    </>
  );
}
