import { SavedConnectionItem } from "@/app/connect/saved-connection-storage";
import {
  DatabaseResultSet,
  DatabaseSchemaItem,
  DatabaseTableSchema,
} from "@/drivers/base-driver";

export interface ApiOpsBatchResponse {
  error?: string;
  data: DatabaseResultSet[];
}

export interface ApiOpsQueryResponse {
  error?: string;
  data: DatabaseResultSet;
}

export interface ApiDatabasesResponse {
  databases: SavedConnectionItem[];
}

export interface ApiDatabasesResponse {
  databases: SavedConnectionItem[];
}

export interface ApiSchemaListResponse {
  data: DatabaseSchemaItem[];
  error?: string;
}

export interface ApiSchemaResponse {
  data: DatabaseTableSchema;
  error?: string;
}
