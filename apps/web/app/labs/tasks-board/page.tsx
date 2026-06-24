import Link from "next/link";
import { TasksBoardLabClient } from "./tasks-board-lab-client";

export const metadata = {
  title: "Tasks Board Lab · SSOTA",
};

export default function TasksBoardLabPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-6 py-10 lg:max-w-7xl">
      <div className="mb-8 space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link
            href="/labs"
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            Labs
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">Tasks Board Lab</h1>
        <p className="text-muted-foreground text-sm">
          kibo-ui kanban board applied to the tasks workspace, rendered with mock
          data. No project auth required.
        </p>
      </div>
      <TasksBoardLabClient />
    </main>
  );
}
