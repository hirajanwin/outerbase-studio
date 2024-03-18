"use client";

import MainScreen from "@/components/main-connection";
import RemoteDriver from "@/drivers/remote-driver";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function ClientPageBody({
  token,
  name,
}: Readonly<{
  token: string;
  name: string;
}>) {
  const params = useSearchParams();

  const driver = useMemo(() => {
    const databaseId = params.get("p");
    if (!databaseId) return null;
    return new RemoteDriver(databaseId, token, name);
  }, [params, token, name]);

  if (!driver) {
    return <div>Something wrong</div>;
  }

  return <MainScreen driver={driver} />;
}
