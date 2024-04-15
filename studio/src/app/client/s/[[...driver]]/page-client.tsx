"use client";

import { SavedConnectionLocalStorage } from "@studio/app/connect/saved-connection-storage";
import RqliteDriver from "@studio/drivers/rqlite-driver";
import TursoDriver from "@studio/drivers/turso-driver";
import ValtownDriver from "@studio/drivers/valtown-driver";
import { Studio } from "@libsqlstudio/gui";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

// TODO: might have a way to include this in the Studio component
import "@libsqlstudio/gui/css";
import { useTheme } from "@studio/context/theme-provider";

export default function ClientPageBody() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useSearchParams();
  const conn = useMemo(() => {
    const connectionParams = params.get("p");
    if (!connectionParams) return null;

    const conn = SavedConnectionLocalStorage.get(connectionParams);
    return conn;
  }, [params]);

  const driver = useMemo(() => {
    if (!conn) return null;
    if (conn.driver === "rqlite") {
      return new RqliteDriver(
        conn.config.url,
        conn.config.username,
        conn.config.password
      );
    } else if (conn.driver === "valtown") {
      return new ValtownDriver(conn.config.token);
    }

    return new TursoDriver(conn.config.url, conn.config.token, true);
  }, [conn]);

  const goBack = useCallback(() => {
    router.push("/connect");
  }, [router]);

  if (!driver || !conn) {
    return <div>Something wrong</div>;
  }

  return (
    <Studio
      driver={driver}
      name={conn.name}
      color={conn.label ?? "blue"}
      defaultTheme={theme}
      onBack={goBack}
    />
  );
}
