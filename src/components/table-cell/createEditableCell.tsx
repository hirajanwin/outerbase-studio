import { useState, useEffect, useCallback, useRef } from "react";
import GenericCell from "./GenericCell";
import styles from "./styles.module.css";
import { DatabaseValue } from "@/drivers/base-driver";
import { useBlockEditor } from "@/context/block-editor-provider";
import OptimizeTableState from "../table-optimized/OptimizeTableState";

export interface TableEditableCell<T = unknown> {
  value: DatabaseValue<T>;
  isChanged?: boolean;
  focus?: boolean;
  editMode?: boolean;
  state: OptimizeTableState;
  onChange?: (newValue: DatabaseValue<T>) => void;
  editor?: "input" | "blocknote";
}

interface TabeEditableCellProps<T = unknown> {
  toString: (v: DatabaseValue<T>) => DatabaseValue<string>;
  toValue: (v: DatabaseValue<string>) => DatabaseValue<T>;
  align?: "left" | "right";
}

function InputCellEditor({
  value,
  align,
  discardChange,
  applyChange,
  onChange,
  state,
}: Readonly<{
  align?: "left" | "right";
  applyChange: (v: DatabaseValue<string>, shouldExit?: boolean) => void;
  discardChange: () => void;
  value: DatabaseValue<string>;
  onChange: (v: string) => void;
  state: OptimizeTableState;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldExit = useRef(true);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.select();
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <input
      ref={inputRef}
      autoFocus
      onBlur={() => {
        applyChange(value, shouldExit.current);
      }}
      onChange={(e) => {
        onChange(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          applyChange(value);
          e.stopPropagation();
        } else if (e.key === "Escape") {
          discardChange();
        } else if (e.key === "Tab") {
          // Enter the next cell
          const focus = state.getFocus();
          if (focus) {
            const colCount = state.getHeaderCount();
            const n = focus.y * colCount + focus.x + 1;
            const x = n % colCount;
            const y = Math.floor(n / colCount);
            if (y >= state.getRowsCount()) return;

            shouldExit.current = false;
            state.setFocus(y, x);
            state.scrollToFocusCell(x === 0 ? "left" : "right", "bottom");
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }}
      type="text"
      className={
        align === "right"
          ? "bg-background w-full h-full outline-none pl-2 pr-2 border-0 text-right"
          : "bg-background w-full h-full outline-none pl-2 pr-2 border-0"
      }
      value={value ?? ""}
    />
  );
}

function BlockEditCellEditor({
  value,
  discardChange,
  applyChange,
  onChange,
}: Readonly<{
  align?: "left" | "right";
  applyChange: (v: DatabaseValue<string>) => void;
  discardChange: () => void;
  value: DatabaseValue<string>;
  onChange: (v: string) => void;
}>) {
  const { openBlockEditor, closeBlockEditor } = useBlockEditor();

  useEffect(() => {
    openBlockEditor({
      initialContent: value ?? "",
      onSave: (v) => {
        onChange(v);
        applyChange(v);
      },
      onCancel: discardChange,
    });

    return () => {
      closeBlockEditor();
    };
  }, [
    value,
    openBlockEditor,
    closeBlockEditor,
    applyChange,
    discardChange,
    onChange,
  ]);

  return null;
}

export default function createEditableCell<T = unknown>({
  toString,
  toValue,
  align,
}: TabeEditableCellProps<T>): React.FC<TableEditableCell<T>> {
  return function GenericEditableCell({
    value,
    isChanged,
    focus,
    onChange,
    state,
    editMode,
    editor,
  }: TableEditableCell<T>) {
    const [editValue, setEditValue] = useState<DatabaseValue<string>>(
      toString(value)
    );

    useEffect(() => {
      setEditValue(toString(value));
    }, [value]);

    const applyChange = useCallback(
      (v: DatabaseValue<string>, shouldExitEdit: boolean = true) => {
        if (onChange) onChange(toValue(v));
        if (shouldExitEdit) {
          state.exitEditMode();
        }
      },
      [onChange, state]
    );

    const discardChange = useCallback(() => {
      setEditValue(toString(value));
      state.exitEditMode();
    }, [setEditValue, state, value]);

    const className = [
      styles.cell,
      focus ? styles.focus : null,
      isChanged ? styles.change : null,
    ]
      .filter(Boolean)
      .join(" ");

    if (editMode) {
      if (editor === "blocknote") {
        return (
          <div className={className}>
            <BlockEditCellEditor
              align={align}
              applyChange={applyChange}
              discardChange={discardChange}
              onChange={setEditValue}
              value={editValue}
            />
          </div>
        );
      } else {
        return (
          <div className={className}>
            <InputCellEditor
              state={state}
              align={align}
              applyChange={applyChange}
              discardChange={discardChange}
              onChange={setEditValue}
              value={editValue}
            />
          </div>
        );
      }
    }

    return (
      <GenericCell
        value={toValue(editValue)}
        focus={focus}
        isChanged={isChanged}
        onDoubleClick={() => {
          state.enterEditMode();
        }}
      />
    );
  };
}
