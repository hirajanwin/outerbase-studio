import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ConnectingDialog from "@/components/gui/connection-dialog";
import { DatabaseSchemaItem, DatabaseSchemas } from "@/drivers/base-driver";
import { useDatabaseDriver } from "./driver-provider";
import { useAutoComplete } from "./auto-complete-provider";

type AutoCompletionSchema = Record<string, Record<string, string[]> | string[]>;

const SchemaContext = createContext<{
  schema: DatabaseSchemas;
  currentSchema: DatabaseSchemaItem[];
  autoCompleteSchema: AutoCompletionSchema;
  currentSchemaName: string;
  refresh: () => void;
}>({
  schema: {},
  autoCompleteSchema: {},
  currentSchema: [],
  currentSchemaName: "",
  refresh: () => {
    throw new Error("Not implemented");
  },
});

function generateAutoCompleteFromSchemaItems(
  items?: DatabaseSchemaItem[]
): Record<string, string[]> {
  if (!items) return {};

  return items
    .filter((x) => x.type === "table" || x.type === "view")
    .reduce(
      (a, b) => {
        a[b.name] = (b.tableSchema?.columns ?? []).map((c) => c.name);
        return a;
      },
      {} as Record<string, string[]>
    );
}

function generateAutoComplete(
  currentSchemaName: string,
  schema: DatabaseSchemas
) {
  return {
    ...generateAutoCompleteFromSchemaItems(schema[currentSchemaName]),
    ...Object.entries(schema).reduce((a, [schemaName, tableList]) => {
      a[schemaName] = generateAutoCompleteFromSchemaItems(tableList);
      return a;
    }, {} as AutoCompletionSchema),
  };
}

export function useSchema() {
  return useContext(SchemaContext);
}

export function SchemaProvider({ children }: Readonly<PropsWithChildren>) {
  const { updateTableList, updateTableSchema } = useAutoComplete();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const { databaseDriver } = useDatabaseDriver();

  const [schema, setSchema] = useState<DatabaseSchemas>({});
  const [currentSchema, setCurrentSchema] = useState<DatabaseSchemaItem[]>([]);
  const currentSchemaName = databaseDriver.getFlags().defaultSchema;

  const fetchSchema = useCallback(
    (refresh?: boolean) => {
      if (refresh) {
        setLoading(true);
      }

      databaseDriver
        .schemas()
        .then((result) => {
          setSchema(result);
          setError(undefined);
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
    },
    [databaseDriver, setError]
  );

  useEffect(() => {
    if (schema[currentSchemaName]) {
      setCurrentSchema(schema[currentSchemaName]);
    }
  }, [currentSchemaName, schema, setCurrentSchema]);

  useEffect(() => {
    const sortedTableList = [...currentSchema];
    sortedTableList.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    updateTableList(currentSchema.map((table) => table.name));

    for (const table of currentSchema) {
      if (table.tableSchema) {
        updateTableSchema(table.name, table.tableSchema.columns);
      }
    }
  }, [currentSchema, updateTableList, updateTableSchema]);

  useEffect(() => {
    fetchSchema(true);
  }, [fetchSchema]);

  const props = useMemo(() => {
    return {
      schema,
      currentSchema,
      currentSchemaName,
      refresh: fetchSchema,
      autoCompleteSchema: generateAutoComplete(currentSchemaName, schema),
    };
  }, [schema, fetchSchema, currentSchema, currentSchemaName]);

  if (error || loading) {
    return <ConnectingDialog message={error} loading={loading} />;
  }

  return (
    <SchemaContext.Provider value={props}>{children}</SchemaContext.Provider>
  );
}
