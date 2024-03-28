"use client";
import { useCallback, useState } from "react";
import ConnectionDialogContent from "./saved-connection-content";
import SaveConnectionType from "./saved-connection-type";
import {
  SavedConnectionItem,
  SavedConnectionItemConfig,
  SavedConnectionItemWithoutId,
  SavedConnectionLocalStorage,
  SavedConnectionStorage,
  SupportedDriver,
} from "@/app/connect/saved-connection-storage";
import SavedConnectionConfig from "./saved-connection-config";
import { createDatabase } from "@/lib/api/fetch-databases";
import { User } from "lucia";

type SaveConnectionStep = "storage" | "config";

export function RqliteInstruction() {
  return (
    <div className="bg-secondary p-4 mb-4 text-sm">
      You should include LibSQL Studio in the list of allowed origins for CORS
      (Cross-Origin Resource Sharing)
      <pre className="mt-2">
        <code>{`rqlited --http-allow-origin="https://libsqlstudio.com"`}</code>
      </pre>
    </div>
  );
}

export default function SaveConnection({
  user,
  driver,
  onSaveComplete,
  onClose,
}: Readonly<{
  user: User | null;
  driver: SupportedDriver;
  onSaveComplete: (storageType: SavedConnectionItem) => void;
  onClose: () => void;
}>) {
  const [storage, setStorage] = useState<SavedConnectionStorage | undefined>(
    user ? undefined : "local"
  );
  const [step, setStep] = useState<SaveConnectionStep>(
    user ? "storage" : "config"
  );
  const [loading, setLoading] = useState(false);

  const onConnectionTypeSelected = useCallback(
    (type: SavedConnectionStorage) => {
      setStep("config");
      setStorage(type);
    },
    [setStep]
  );

  const onSaveConnection = useCallback(
    (data: SavedConnectionItemConfig) => {
      if (storage === "remote") {
        setLoading(true);
        createDatabase({ ...data, driver: data.driver ?? "turso" })
          .then((r) => onSaveComplete(r.data))
          .finally(() => {
            setLoading(false);
          });
      } else {
        const finalConfig: SavedConnectionItemWithoutId = {
          ...data,
          storage: storage ?? "local",
        };
        const conn = SavedConnectionLocalStorage.save(finalConfig);

        onSaveComplete({
          id: conn.id,
          name: finalConfig.name,
          driver: finalConfig.driver ?? "turso",
          storage: "local",
          description: finalConfig.description,
          label: finalConfig.label,
        });
      }
    },
    [storage, onSaveComplete]
  );

  return (
    <ConnectionDialogContent
      driver={driver}
      title="New Connection"
      onClose={onClose}
    >
      {step === "storage" && (
        <SaveConnectionType onContinue={onConnectionTypeSelected} />
      )}
      {step === "config" && (
        <>
          {driver === "rqlite" && storage === "local" && <RqliteInstruction />}
          <SavedConnectionConfig
            driver={driver}
            onClose={onClose}
            onSave={onSaveConnection}
            loading={loading}
          />
        </>
      )}
    </ConnectionDialogContent>
  );
}
