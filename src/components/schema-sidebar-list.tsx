import { ScrollArea } from "./ui/scroll-area";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Table2 } from "lucide-react";
import {
  OpenContextMenuList,
  openContextMenuFromEvent,
} from "@/messages/openContextMenu";
import { useSchema } from "@/context/SchemaProvider";
import { useCallback, useEffect, useState } from "react";
import { openTab } from "@/messages/open-tab";

interface SchemaListProps {
  search: string;
}

interface SchemaViewItemProps {
  icon: LucideIcon;
  title: string;
  selected: boolean;
  onClick: () => void;
  onContextMenu: React.MouseEventHandler;
}

function SchemaViewItem({
  icon: Icon,
  title,
  onClick,
  selected,
  onContextMenu,
}: Readonly<SchemaViewItemProps>) {
  return (
    <div
      onMouseDown={onClick}
      onContextMenu={(e) => {
        onContextMenu(e);
        onClick();
      }}
      onDoubleClick={() => {
        openTab({
          type: "table",
          tableName: title,
        });
      }}
      className={cn(
        buttonVariants({
          variant: selected ? "default" : "ghost",
          size: "sm",
        }),
        "justify-start",
        "cursor-pointer"
      )}
    >
      <Icon className="mr-2 h-4 w-4" />
      {title}
    </div>
  );
}

export default function SchemaList({ search }: Readonly<SchemaListProps>) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { refresh, schema } = useSchema();

  useEffect(() => {
    setSelectedIndex(-1);
  }, [setSelectedIndex, search]);

  const prepareContextMenu = useCallback(
    (tableName?: string) => {
      return [
        {
          title: "Copy Name",
          disabled: !tableName,
          onClick: () => {
            window.navigator.clipboard.writeText(tableName ?? "");
          },
        },
        { separator: true },
        {
          title: "Create New Table",
          onClick: () => {
            openTab({
              type: "schema",
            });
          },
        },
        {
          title: "Edit Table",
          disabled: !tableName,
          onClick: () => {
            openTab({
              tableName,
              type: "schema",
            });
          },
        },
        { separator: true },
        { title: "Refresh", onClick: () => refresh() },
      ] as OpenContextMenuList;
    },
    [refresh]
  );

  const filteredSchema = schema.filter((s) => {
    return s.name.toLowerCase().indexOf(search.toLowerCase()) >= 0;
  });

  return (
    <ScrollArea
      className="flex-grow select-none"
      onContextMenu={(e) =>
        openContextMenuFromEvent(
          prepareContextMenu(
            selectedIndex && schema[selectedIndex]
              ? schema[selectedIndex].name
              : undefined
          )
        )(e)
      }
    >
      <div className="flex flex-col p-2 pr-4">
        {filteredSchema.map((item, schemaIndex) => {
          return (
            <SchemaViewItem
              onContextMenu={(e) => {
                openContextMenuFromEvent(prepareContextMenu(item.name))(e);
                e.stopPropagation();
              }}
              key={item.name}
              title={item.name}
              icon={Table2}
              selected={schemaIndex === selectedIndex}
              onClick={() => setSelectedIndex(schemaIndex)}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
