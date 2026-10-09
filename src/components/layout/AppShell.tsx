import { Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div className="min-h-dvh bg-(--color-bg) text-(--color-ink)">
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28">
        <Outlet />
      </main>
    </div>
  );
}
