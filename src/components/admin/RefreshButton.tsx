"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshOverview } from "@/app/admin/(dashboard)/actions";

/** Clears the 60-second overview cache and reloads the numbers. */
const RefreshButton = () => {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="adm-btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await refreshOverview();
          router.refresh();
        })
      }
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
};

export default RefreshButton;
