import { useDatabaseDriver } from "@/context/DatabaseDriverProvider";
import { useCallback, useEffect, useState } from "react";
import ResultTable from "@/components/result/ResultTable";
import { Button } from "@/components/ui/button";
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideDelete,
  LucideFilter,
  LucidePlus,
  LucideRefreshCcw,
  LucideSaveAll,
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
import {
  generateDeleteStatement,
  generateInsertStatement,
  generateUpdateStatement,
} from "@/lib/sql-helper";
import { ExecutePlan, executePlans } from "@/lib/sql-execute-helper";
import { validateOperation } from "@/lib/validation";

interface TableDataContentProps {
  tableName: string;
}

export default function TableDataWindow({ tableName }: TableDataContentProps) {
  const { updateTableSchema } = useAutoComplete();
  const { databaseDriver } = useDatabaseDriver();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptimizeTableState>();
  const [tableSchema, setTableSchema] = useState<DatabaseTableSchema>();
  const [changeNumber, setChangeNumber] = useState(0);

  const [where, setWhere] = useState("");
  const [whereInput, setWhereInput] = useState("");

  const [offset, setOffset] = useState("0");
  const [limit, setLimit] = useState("50");

  const [finalOffset, setFinalOffset] = useState(0);
  const [finalLimit, setFinalLimit] = useState(50);

  const [revision, setRevision] = useState(1);
  const [lastQueryTimestamp, setLastQueryTimestamp] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const dataResult = await databaseDriver.selectFromTable(tableName, {
          whereRaw: where,
          limit: finalLimit,
          offset: finalOffset,
        });

        const schemaResult = await databaseDriver.getTableSchema(tableName);
        setData(OptimizeTableState.createFromResult(dataResult, schemaResult));

        setTableSchema(schemaResult);
        updateTableSchema(tableName, schemaResult.columns);
        setLastQueryTimestamp(Date.now());
        setChangeNumber(0);
        setError(undefined);
      } catch (e) {
        setError((e as Error).toString());
      } finally {
        setLoading(false);
      }
    };

    fetchData().then().catch(console.error);
  }, [
    databaseDriver,
    tableName,
    updateTableSchema,
    where,
    finalOffset,
    finalLimit,
    revision,
  ]);

  useEffect(() => {
    if (data) {
      const callback = (state: OptimizeTableState) => {
        setChangeNumber(state.getChangedRows().length);
      };
      data.addChangeListener(callback);
      return () => data.removeChangeListener(callback);
    }
  }, [data]);

  const onCommit = useCallback(() => {
    if (!tableSchema) return;
    if (!data) return;
    if (tableSchema.pk.length === 0) return;

    const rowChangeList = data.getChangedRows();
    const plans: ExecutePlan[] = [];

    for (const row of rowChangeList) {
      const rowChange = row.change;
      if (rowChange) {
        const pk = tableSchema.pk;

        const wherePrimaryKey = pk.reduce((condition, pkColumnName) => {
          condition[pkColumnName] =
            rowChange[pkColumnName] ?? row.raw[pkColumnName];
          return condition;
        }, {} as Record<string, unknown>);

        let operation: "UPDATE" | "INSERT" | "DELETE" = "UPDATE";
        if (row.isNewRow) operation = "INSERT";
        if (row.isRemoved) operation = "DELETE";

        const { valid, reason } = validateOperation({
          operation,
          autoIncrement: tableSchema.autoIncrement,
          changeValue: rowChange,
          originalValue: row.raw,
          primaryKey: tableSchema.pk,
        });

        if (!valid) {
          alert(reason);
          return;
        }

        let sql: string | undefined;

        if (row.isNewRow) {
          sql = generateInsertStatement(tableName, rowChange);
        } else if (row.isRemoved) {
          sql = generateDeleteStatement(tableName, wherePrimaryKey);
        } else {
          sql = generateUpdateStatement(tableName, wherePrimaryKey, rowChange);
        }

        plans.push({
          sql,
          row,
          tableName,
          updateCondition: wherePrimaryKey,
          autoIncrement: tableSchema.autoIncrement,
        });
      }
    }

    if (plans.length > 0) {
      executePlans(databaseDriver, plans)
        .then(({ success, error: errorMessage, plans }) => {
          if (success) {
            data.applyChanges(
              plans.map((plan) => ({
                row: plan.row,
                updated: plan.updatedRowData ?? {},
              }))
            );
          } else {
            alert(errorMessage);
          }
        })
        .catch(console.error);
    }
  }, [databaseDriver, tableName, tableSchema, data]);

  const onDiscard = useCallback(() => {
    if (data) {
      data.disardAllChange();
    }
  }, [data]);

  const onNewRow = useCallback(() => {
    if (data) {
      data.insertNewRow();
    }
  }, [data]);

  const onRemoveRow = useCallback(() => {
    if (data) {
      data.removeRow();
    }
  }, [data]);

  return (
    <div className="flex flex-col overflow-hidden w-full h-full">
      <div className="flex-shrink-0 flex-grow-0">
        <div className="flex p-1 gap-1">
          <Button
            variant={"outline"}
            size={"sm"}
            disabled={!changeNumber}
            onClick={onCommit}
          >
            <LucideSaveAll className="w-4 h-4 mr-2 text-green-600" />
            Commit
            {!!changeNumber && (
              <span
                className="ml-2 bg-red-500 text-white leading-5 w-5 h-5 rounded-full"
                style={{ fontSize: 9 }}
              >
                {changeNumber}
              </span>
            )}
          </Button>

          <Button
            variant={"outline"}
            size={"sm"}
            disabled={!changeNumber}
            onClick={onDiscard}
          >
            <span className="text-red-500">Discard Change</span>
          </Button>

          <div className="mr-2">
            <Separator orientation="vertical" />
          </div>

          <Button variant={"outline"} size={"sm"} onClick={onNewRow}>
            <LucidePlus className="w-4 h-4 text-green-600" />
          </Button>

          <Button variant={"outline"} size={"sm"} onClick={onRemoveRow}>
            <LucideDelete className="w-4 h-4 text-red-600" />
          </Button>

          <Button
            variant={"outline"}
            size={"sm"}
            onClick={() => setRevision((prev) => prev + 1)}
            disabled={loading}
          >
            <LucideRefreshCcw className="w-4 h-4 text-green-600" />
          </Button>

          <div className="flex flex-grow mx-2">
            <div className="bg-secondary rounded overflow-hidden flex items-center w-full">
              <div className="text-sm px-2 text-gray-500 bg-gray-200 h-full flex items-center">
                <LucideFilter className="h-4 w-4 text-black" />
              </div>
              <input
                type="text"
                placeholder="eg: id=5"
                value={whereInput}
                onChange={(e) => setWhereInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setWhere(e.currentTarget.value);
                  }
                }}
                className="bg-inherit p-1 pl-2 pr-2 outline-none text-sm font-mono h-full flex-grow"
              />
            </div>
          </div>

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
        {error && (
          <div className="text-red-500 p-5">
            <pre>{error}</pre>
          </div>
        )}
        {data && !error ? (
          <ResultTable
            data={data}
            tableName={tableName}
            key={lastQueryTimestamp}
          />
        ) : null}
      </div>
    </div>
  );
}
