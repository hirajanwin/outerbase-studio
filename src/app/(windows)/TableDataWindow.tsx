import { useDatabaseDriver } from "@/context/DatabaseDriverProvider";
import { useEffect, useState } from "react";
import ResultTable from "@/components/result/ResultTable";
import { Button } from "@/components/ui/button";
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideKey,
  LucideRefreshCcw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DatabaseTableSchema } from "@/drivers/DatabaseDriver";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAutoComplete } from "@/context/AutoCompleteProvider";
import OpacityLoading from "../(components)/OpacityLoading";
import OptimizeTableState from "../(components)/OptimizeTable/OptimizeTableState";

interface TableDataContentProps {
  tableName: string;
}

export default function TableDataWindow({ tableName }: TableDataContentProps) {
  const { updateTableSchema } = useAutoComplete();
  const { databaseDriver } = useDatabaseDriver();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptimizeTableState>();
  const [tableSchema, setTableSchema] = useState<DatabaseTableSchema>();

  const [offset, setOffset] = useState("0");
  const [limit, setLimit] = useState("50");

  const [finalOffset, setFinalOffset] = useState(0);
  const [finalLimit, setFinalLimit] = useState(50);

  const [revision, setRevision] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const dataResult = await databaseDriver.selectFromTable(tableName, {
        limit: finalLimit,
        offset: finalOffset,
      });

      const schemaResult = await databaseDriver.getTableSchema(tableName);
      setData(OptimizeTableState.createFromResult(dataResult, schemaResult));

      setLoading(false);

      setTableSchema(schemaResult);
      updateTableSchema(tableName, schemaResult.columns);
    };

    fetchData().then().catch(console.error);
  }, [
    databaseDriver,
    tableName,
    updateTableSchema,
    finalOffset,
    finalLimit,
    revision,
  ]);

  return (
    <div className="flex flex-col overflow-hidden w-full h-full">
      <div className="flex-shrink-0 flex-grow-0">
        <div className="flex p-1 gap-1">
          <Button
            variant={"ghost"}
            size={"sm"}
            onClick={() => setRevision((prev) => prev + 1)}
            disabled={loading}
          >
            <LucideRefreshCcw className="w-4 h-4 mr-2 text-green-600" />
            Refresh
          </Button>

          <div className="flex flex-grow" />

          <div>
            <Separator orientation="vertical" />
          </div>

          <Button
            variant={"ghost"}
            size={"sm"}
            disabled={finalOffset === 0 || loading}
            onClick={() => {
              setFinalOffset(finalOffset - finalLimit);
              setOffset((finalOffset - finalLimit).toString());
            }}
          >
            <LucideArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger>
                <input
                  value={limit}
                  onChange={(e) => setLimit(e.currentTarget.value)}
                  onBlur={(e) => {
                    try {
                      const finalValue = parseInt(e.currentTarget.value);
                      if (finalValue !== finalLimit) {
                        setFinalLimit(finalValue);
                      }
                    } catch (e) {
                      setLimit(finalLimit.toString());
                    }
                  }}
                  style={{ width: 50 }}
                  className="p-1 pl-2 pr-2 bg-gray-100 rounded text-xs h-full"
                  alt="Limit"
                />
              </TooltipTrigger>
              <TooltipContent>Limit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <input
                  value={offset}
                  onChange={(e) => setOffset(e.currentTarget.value)}
                  onBlur={(e) => {
                    try {
                      const finalValue = parseInt(e.currentTarget.value);
                      if (finalValue !== finalOffset) {
                        setFinalOffset(finalValue);
                      }
                    } catch (e) {
                      setOffset(finalOffset.toString());
                    }
                  }}
                  style={{ width: 50 }}
                  className="p-1 pl-2 pr-2 bg-gray-100 rounded text-xs h-full"
                  alt="Offset"
                />
              </TooltipTrigger>
              <TooltipContent>Offset</TooltipContent>
            </Tooltip>
          </div>

          <Button variant={"ghost"} size={"sm"} disabled={loading}>
            <LucideArrowRight
              className="w-4 h-4"
              onClick={() => {
                setFinalOffset(finalOffset + finalLimit);
                setOffset((finalOffset + finalLimit).toString());
              }}
            />
          </Button>
        </div>
        <Separator />
      </div>
      <div className="flex-grow overflow-hidden relative">
        {loading && <OpacityLoading />}
        {data ? <ResultTable data={data} tableName={tableName} /> : null}
      </div>
    </div>
  );
}
