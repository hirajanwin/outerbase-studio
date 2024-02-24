"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEffect, useState } from "react";
import SchemaView from "./SchemaView";
import WindowTabs, { WindowTabItemProps } from "./WindowTabs";
import TableDataContent from "../(windows)/TableDataWindow";
import useMessageListener from "@/hooks/useMessageListener";
import { MessageChannelName } from "@/messages/const";
import { OpenTabsProps } from "@/messages/openTabs";
import QueryWindow from "@/app/(windows)/QueryWindow";
import SchemaEditorTab from "@/screens/WindowTabs/SchemaEditorTab";

export default function DatabaseGui() {
  const DEFAULT_WIDTH = 300;

  const [defaultWidthPercentage, setDefaultWidthPercentage] = useState(20);

  useEffect(() => {
    setDefaultWidthPercentage((DEFAULT_WIDTH / window.innerWidth) * 100);
  }, []);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [tabs, setTabs] = useState<WindowTabItemProps[]>(() => [
    { title: "Query", key: "query", component: <QueryWindow /> },
  ]);

  useMessageListener<OpenTabsProps>(
    MessageChannelName.OPEN_NEW_TAB,
    (newTab) => {
      setTabs((prev) => {
        if (newTab) {
          if (newTab.type === "table" && newTab.tableName) {
            // Check if there is duplicated
            const foundIndex = prev.findIndex((tab) => tab.key === newTab.key);

            if (foundIndex >= 0) {
              setSelectedTabIndex(foundIndex);
            } else {
              setSelectedTabIndex(prev.length);

              return [
                ...prev,
                {
                  title: newTab.name,
                  key: newTab.key,
                  component: <TableDataContent tableName={newTab.tableName} />,
                },
              ];
            }
          } else if (newTab.type === "query") {
            setSelectedTabIndex(prev.length);

            return [
              ...prev,
              {
                title: newTab.name,
                key: newTab.key,
                component: <QueryWindow />,
              },
            ];
          } else if (newTab.type === "schema") {
            // Check if there is duplicated
            const foundIndex = prev.findIndex((tab) => tab.key === newTab.key);

            if (foundIndex >= 0) {
              setSelectedTabIndex(foundIndex);
            } else {
              setSelectedTabIndex(prev.length);

              return [
                ...prev,
                {
                  title: newTab.name,
                  key: newTab.key,
                  component: <SchemaEditorTab tableName={newTab.tableName} />,
                },
              ];
            }
          }
        }

        return prev;
      });
    }
  );

  return (
    <div className="h-screen w-screen flex flex-col">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel minSize={5} defaultSize={defaultWidthPercentage}>
          <SchemaView />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={100 - defaultWidthPercentage}>
          <WindowTabs
            tabs={tabs}
            selected={selectedTabIndex}
            onSelectChange={setSelectedTabIndex}
            onTabsChange={setTabs}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
