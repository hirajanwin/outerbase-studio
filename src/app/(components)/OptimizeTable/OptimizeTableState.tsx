import { selectArrayFromIndexList } from "@/lib/export-helper";
import { OptimizeTableHeaderProps } from ".";
import * as hrana from "@libsql/hrana-client";
import { DatabaseTableSchema } from "@/drivers/DatabaseDriver";
import { LucideKey } from "lucide-react";
import { convertSqliteType } from "@/lib/sql-helper";

export interface OptimizeTableRowValue {
  raw: Record<string, unknown>;
  change?: Record<string, unknown>;
  changeKey?: number;
  isNewRow?: boolean;
}

type TableChangeEventCallback = (state: OptimizeTableState) => void;

export default class OptimizeTableState {
  protected focus: [number, number] | null = null;
  protected selectedRows = new Set<number>();
  protected data: OptimizeTableRowValue[] = [];
  protected headers: OptimizeTableHeaderProps[] = [];

  protected changeCallback: TableChangeEventCallback[] = [];
  protected changeDebounceTimerId: NodeJS.Timeout | null = null;

  protected changeCounter = 1;
  protected changeLogs: Record<number, OptimizeTableRowValue> = {};

  static createFromResult(
    dataResult: hrana.RowsResult,
    schemaResult?: DatabaseTableSchema
  ) {
    return new OptimizeTableState(
      dataResult.columnNames.map((headerName, idx) => {
        return {
          initialSize: 150,
          name: headerName ?? "",
          resizable: true,
          dataType: convertSqliteType(dataResult.columnDecltypes[idx]),
          icon: schemaResult?.pk.includes(headerName ?? "") ? (
            <LucideKey className="w-4 h-4 text-red-500" />
          ) : undefined,
        };
      }),
      dataResult.rows.map((r) => ({ ...r }))
    );
  }

  constructor(
    headers: OptimizeTableHeaderProps[],
    data: Record<string, unknown>[]
  ) {
    this.headers = headers;
    this.data = data.map((row) => ({
      raw: row,
    }));
  }

  // ------------------------------------------------
  // Event Handlers
  // ------------------------------------------------
  addChangeListener(cb: TableChangeEventCallback) {
    this.changeCallback.push(cb);
  }

  removeChangeListener(cb: TableChangeEventCallback) {
    this.changeCallback = this.changeCallback.filter((c) => c !== cb);
  }


  protected broadcastChange(instant?: boolean) {
    if (instant) {
      if (this.changeDebounceTimerId) clearTimeout(this.changeDebounceTimerId);
      this.changeCallback.reverse().forEach((cb) => cb(this));
    }

    if (this.changeDebounceTimerId) return false;
    this.changeDebounceTimerId = setTimeout(() => {
      this.changeDebounceTimerId = null;
      this.changeCallback.reverse().forEach((cb) => cb(this));
    }, 5);
  }

  // ------------------------------------------------
  // Handle headers and data
  // ------------------------------------------------
  getHeaders() {
    return this.headers;
  }

  getValue(y: number, x: number): unknown {
    const rowChange = this.data[y]?.change;
    if (rowChange) {
      return rowChange[this.headers[x].name] ?? this.getOriginalValue(y, x);
    }
    return this.getOriginalValue(y, x);
  }

  hasCellChange(y: number, x: number) {
    const changeLog = this.data[y]?.change;
    if (!changeLog) return false;
    return this.headers[x].name in changeLog;
  }

  getOriginalValue(y: number, x: number): unknown {
    return this.data[y]?.raw[this.headers[x].name];
  }

  changeValue(y: number, x: number, newValue: unknown) {
    const oldValue = this.getOriginalValue(y, x);

    const row = this.data[y];
    const headerName = this.headers[x].name;

    if (oldValue === newValue) {
      const rowChange = row.change;
      if (rowChange && headerName in rowChange) {
        delete rowChange[headerName];
        if (Object.entries(rowChange).length === 0) {
          if (row.changeKey) {
            delete this.changeLogs[row.changeKey];
            delete row["changeKey"];
          }
          delete row["change"];
        }
      }
    } else {
      const rowChange = row.change;
      if (rowChange) {
        rowChange[headerName] = newValue;
      } else {
        row.changeKey = ++this.changeCounter;
        row.change = { [headerName]: newValue };
        this.changeLogs[row.changeKey] = row;
      }
    }

    this.broadcastChange();
  }

  getChangedRows() {
    return Object.values(this.changeLogs);
  }

  getRowsCount() {
    return this.data.length;
  }

  disardAllChange() {
    const newRows: OptimizeTableRowValue[] = [];

    for (const row of Object.values(this.changeLogs)) {
      if (row.isNewRow) {
        newRows.push(row);
        delete row.change;
        delete row.changeKey;
        delete row.isNewRow;
      } else {
        delete row.change;
        delete row.changeKey;
      }
    }

    // Remove all new rows
    this.data = this.data.filter((row) => !newRows.includes(row));
    this.changeLogs = {};

    this.broadcastChange(true);
  }

  applyChanges(
    updatedRows: {
      row: OptimizeTableRowValue;
      updated: Record<string, unknown>;
    }[]
  ) {
    const rowChanges = this.getChangedRows();

    for (const row of rowChanges) {
      const updated = updatedRows.find((updateRow) => updateRow.row === row);
      row.raw = { ...row.raw, ...row.change, ...updated?.updated };
      delete row.changeKey;
      delete row.change;
      delete row.isNewRow;
    }

    this.changeLogs = {};
    this.broadcastChange();
  }

  insertNewRow(index: number = 0) {
    const newRow = {
      isNewRow: true,
      raw: {},
      change: {},
      changeKey: ++this.changeCounter,
    };

    this.data.splice(index, 0, newRow);
    this.changeLogs[newRow.changeKey] = newRow;
    this.broadcastChange();
  }

  isNewRow(index: number) {
    return !!this.data[index]?.isNewRow;
  }

  // ------------------------------------------------
  // Handle focus logic
  // ------------------------------------------------
  getFocus(): { x: number; y: number } | null {
    return this.focus
      ? {
          x: this.focus[1],
          y: this.focus[0],
        }
      : null;
  }

  hasFocus(y: number, x: number): boolean {
    if (!this.focus) return false;
    return this.focus[0] === y && this.focus[1] === x;
  }

  setFocus(y: number, x: number) {
    this.focus = [y, x];
    this.broadcastChange();
  }

  clearFocus() {
    this.focus = null;
    this.broadcastChange();
  }

  // ------------------------------------------------
  // Handle select row logic
  // ------------------------------------------------
  clearSelect() {
    this.selectedRows.clear();
    this.broadcastChange();
  }

  getSelectedRowCount() {
    return this.selectedRows.size;
  }

  getSelectedRowsArray(): unknown[][] {
    return selectArrayFromIndexList(this.data, this.getSelectedRowIndex()).map(
      (row) => this.headers.map((header) => row.raw[header.name])
    );
  }

  getSelectedRowIndex() {
    return Array.from(this.selectedRows.values());
  }

  selectRow(y: number, toggle?: boolean) {
    if (toggle) {
      if (this.selectedRows.has(y)) {
        this.selectedRows.delete(y);
      } else {
        this.selectedRows.add(y);
      }
    } else {
      this.selectedRows.add(y);
    }
    this.broadcastChange();
  }

  isRowSelected(y: number) {
    return this.selectedRows.has(y);
  }
}
