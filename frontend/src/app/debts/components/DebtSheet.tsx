"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Debt, DebtWithBalance } from "@/types/debt";

type Mode = "normal" | "insert";
type ColumnKey = "name" | "balance" | "startingAmount" | "interestRate" | "minPayment" | "dueDay";

const COLUMNS: { key: ColumnKey; label: string; widthClass: string }[] = [
  { key: "name", label: "name", widthClass: "w-40" },
  { key: "balance", label: "balance", widthClass: "w-28" },
  { key: "startingAmount", label: "amount", widthClass: "w-28" },
  { key: "interestRate", label: "apr", widthClass: "w-20" },
  { key: "minPayment", label: "min_payment", widthClass: "w-28" },
  { key: "dueDay", label: "due_day", widthClass: "w-20" },
];

export default function DebtSheet({ initialDebts }: { initialDebts?: DebtWithBalance[] }) {
  const { token } = useAuth();

  // local state for debts, guarded against undefined
  const [debts, setDebts] = useState<DebtWithBalance[]>(initialDebts ?? []);

  const [selectedRow, setSelectedRow] = useState(0); // index into debts (0..debts.length-1)
  const [selectedCol, setSelectedCol] = useState(0); // index into COLUMNS (0..4)
  const [mode, setMode] = useState<Mode>("normal");
  const [deleteMode, _setDeleteMode] = useState<"none" | "pending">("none")
  const deleteModeRef = useRef<"none" | "pending">("none");

  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // add-new-debt form state
  const [newDebtName, setNewDebtName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newApr, setNewApr] = useState("");
  const [newMinPayment, setNewMinPayment] = useState("");
  const [newDueDay, setNewDueDay] = useState("");
  const newNameRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  function moveSelection(delta: number) {
    setDeleteMode("none");
    setSelectedRow(prev => {
      const maxIndex = debts.length - 1;
      return Math.min(Math.max(prev + delta, 0), maxIndex);
    })
  }

  function setDeleteMode(mode: "none" | "pending") {
    deleteModeRef.current = mode;
    _setDeleteMode(mode)
  }

  // focus cell input when entering insert mode
  useEffect(() => {
    if (mode === "insert" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode, selectedRow, selectedCol]);

  //  GLOBAL KEY HANDLER (Vim-ish navigation in NORMAL mode)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // if we're in INSERT mode (editing a cell), ignore sheet-level keys
      if (mode === "insert") return;

      // don't hijack keys when typing in other inputs/selects
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      // j/k → move rows
      if (e.key === "j") {
        e.preventDefault();
        moveSelection(1)
        return;
      }
      if (e.key === "k") {
        e.preventDefault();
        moveSelection(-1)
        return;
      }

      // h/l → move cols
      if (e.key === "h") {
        e.preventDefault();
        setSelectedCol((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "l") {
        e.preventDefault();
        setSelectedCol((prev) => Math.min(prev + 1, COLUMNS.length - 1));
        return;
      }

      // i or Enter → edit current cell
      if (e.key === "i" || e.key === "Enter") {
        e.preventDefault();
        startEditCell();
        return;
      }

      // a → jump to add-new-debt form
      if (e.key === "a") {
        e.preventDefault();
        newNameRef.current?.focus();
        newNameRef.current?.select();
        return;
      }

      if (e.key === "d") {
        e.preventDefault();
        if (deleteModeRef.current == "none") {
          setDeleteMode("pending")
          // dont delete yet but signal in ui
          return
        }
        if (deleteModeRef.current == "pending") {
          // delete the selected debt
          deleteSelectedDebt();
          setDeleteMode("none")
          return
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (deleteModeRef.current === "pending") {
          setDeleteMode("none");
          return
        }
        return
        // if (mode === "insert") {
        //     setMode("normal");
        //     return;
        // }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, debts.length, selectedRow, selectedCol]);

  // ----------------------
  // EDITING A CELL
  // ----------------------

  function startEditCell() {
    if (debts.length === 0) return;

    const col = COLUMNS[selectedCol];
    if (col.key === "balance") return // read-only

    const debt = debts[selectedRow];
    const rawValue = (debt as any)[col.key];
    setEditingValue(rawValue != null ? String(rawValue) : "");
    setMode("insert");
  }

  async function saveEdit() {
    if (debts.length === 0) return;

    const col = COLUMNS[selectedCol];
    const oldDebt = debts[selectedRow];

    let updated: Partial<Debt> = {};

    switch (col.key) {
      case "name":
        updated.name = editingValue;
        break;
      case "startingAmount":
        updated.startingAmount = parseFloat(editingValue) || 0;
        break;
      case "interestRate":
        updated.interestRate = parseFloat(editingValue) || 0;
        break;
      case "minPayment":
        updated.minPayment = parseFloat(editingValue) || 0;
        break;
      case "dueDay":
        updated.dueDay = parseInt(editingValue, 10) || oldDebt.dueDay;
        break;
    }

    const payload = {
      name: updated.name ?? oldDebt.name,
      startingAmount: updated.startingAmount ?? oldDebt.startingAmount,
      interestRate: updated.interestRate ?? oldDebt.interestRate,
      minPayment: updated.minPayment ?? oldDebt.minPayment,
      dueDay: updated.dueDay ?? oldDebt.dueDay,
    };

    try {
      setError(null);
      const updatedDebt = await apiFetch<Debt>(`/api/debts/${oldDebt.id}`, {
        method: "PUT",
        body: payload,
        token,
      });
      setDebts((prev) =>
        prev.map((d, i) => (i === selectedRow ? { ...d, ...updatedDebt } : d)),
      );
    } catch (err: any) {
      setError(err.message ?? "Failed to update debt");
    } finally {
      setMode("normal");
      setEditingValue("");
    }
  }

  function cancelEdit() {
    setMode("normal");
    setEditingValue("");
  }

  // ----------------------
  // ADD NEW DEBT
  // ----------------------

  async function handleAddDebt(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const payload = {
      name: newDebtName.trim(),
      startingAmount: parseFloat(newAmount) || 0,
      interestRate: parseFloat(newApr) || 0,
      minPayment: parseFloat(newMinPayment) || 0,
      dueDay: parseInt(newDueDay, 10) || 1,
    };

    if (!payload.name || payload.startingAmount <= 0) {
      setError("Name and positive amount required");
      return;
    }

    try {
      setError(null);
      const created = await apiFetch<Debt>("/api/debts", {
        method: "POST",
        body: payload,
        token,
      });
      setDebts((prev) => [...prev, { ...created, balance: created.startingAmount, paidTotal: 0 }]);

      // reset form
      setNewDebtName("");
      setNewAmount("");
      setNewApr("");
      setNewMinPayment("");
      setNewDueDay("");
      setMode("normal");
    } catch (err: any) {
      setError(err.message ?? "Failed to add debt");
    }
  }

  // ----------------------
  // DELETE DEBT
  // ----------------------

  function deleteSelectedDebt() {
    if (debts.length === 0) return;

    saveDeletion()
  }

  async function saveDeletion() {
    if (debts.length === 0) return;

    const debt = debts[selectedRow];

    try {
      await apiFetch(`/api/debts/${debt.id}`, {
        method: "DELETE",
        token,
      });
      setDebts((prev) => {
        const updated = prev.filter((_, i) => (i !== selectedRow))
        if (selectedRow >= updated.length) {
          setSelectedRow(Math.max(updated.length - 1, 0))
        }
        return updated
      });
    } catch (err) {
      console.error(err);
    }
  }

  // ----------------------
  // RENDER HELPERS
  // ----------------------

  function renderCellContent(debt: Debt, rowIndex: number, colIndex: number) {
    const col = COLUMNS[colIndex];
    const isSelected = rowIndex === selectedRow && colIndex === selectedCol;

    // if we're in insert mode and this is the selected cell, show input
    if (isSelected && mode === "insert") {
      return (
        <input
          ref={inputRef}
          className="bg-transparent text-white border border-green-400 px-1 text-xs w-full focus:outline-none"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          onBlur={() => {
            // decide whether to auto-save or just cancel; for now: cancel
            cancelEdit();
          }}
        />
      );
    }

    const raw = (debt as any)[col.key];

    let display = raw;
    if (col.key === "startingAmount" || col.key === "minPayment") {
      display = `$${Number(raw).toLocaleString()}`;
    } else if (col.key === "interestRate") {
      display = `${raw}%`;
    } else if (col.key === "dueDay") {
      display = `day ${raw}`;
    } else if (col.key === "balance") {
      display = `$${Number(raw).toLocaleString()}`;
    }

    return (
      <span
        className={`inline-block ${isSelected ? "bg-neutral-800" : ""
          }`}
      >
        {display}
      </span>
    );
  }

  // ----------------------
  // JSX
  // ----------------------

  return (
    <section className="border border-neutral-700 p-4 text-xs space-y-4 max-w-full overflow-x-auto">

      {/* mode + help */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-neutral-400 mr-2">MODE:</span>
          {mode === "normal" ? (
            <span className="text-green-400">[NORMAL]</span>
          ) : (
            <span className="text-yellow-400">[INSERT]</span>
          )}
        </div>
        <div className="text-neutral-600 text-[0.7rem]">
          j/k rows · h/l cols · i/Enter edit · a add · dd delete · Esc cancel
        </div>
      </div>

      {/* sheet table */}
      <div className="border border-neutral-700 inline-block min-w-full">
        {/* header */}
        <div className="flex px-2 py-1.5 border-b border-neutral-700 bg-neutral-900/50 text-neutral-400">
          {COLUMNS.map((col) => (
            <span
              key={col.key}
              className={`${col.widthClass} px-2`}
            >
              {col.label.toUpperCase()}
            </span>
          ))}
        </div>

        {/* rows */}
        {debts.map((d, rowIdx) => {
          const isDeleteRow = deleteModeRef.current === "pending" && selectedRow === rowIdx;
          return (
            <div key={d.id} className={`flex px-2 py-1.5 border-b border-neutral-800 ${isDeleteRow ? "bg-red-900/30" : ""}`}>
              {COLUMNS.map((col, colIdx) => (
                <div
                  key={col.key}
                  className={`${col.widthClass} px-2 ${rowIdx === selectedRow && colIdx === selectedCol
                    ? "border border-green-400/50"
                    : ""
                    }`}
                >
                  {renderCellContent(d, rowIdx, colIdx)}
                </div>
              ))}
            </div>
          )
        })}

        {debts.length === 0 && (
          <div className="p-3 text-neutral-500">no debts found — press &apos;a&apos; to add one</div>
        )}
      </div>

      {/* add new debt form */}
      <form
        className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 items-end"
        onSubmit={handleAddDebt}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setMode("normal");
            (e.target as HTMLInputElement).blur();
          }
        }}
      >
        <div>
          <label className="block text-neutral-400 text-xs mb-1">NAME:</label>
          <input
            ref={newNameRef}
            id="new-debt-name"
            className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-400"
            value={newDebtName}
            onChange={(e) => setNewDebtName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-neutral-400 text-xs mb-1">AMOUNT:</label>
          <input
            className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-400"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-neutral-400 text-xs mb-1">APR (%):</label>
          <input
            className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-400"
            value={newApr}
            onChange={(e) => setNewApr(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-neutral-400 text-xs mb-1">MIN PAY:</label>
          <input
            className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-400"
            value={newMinPayment}
            onChange={(e) => setNewMinPayment(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-neutral-400 text-xs mb-1">DUE DAY:</label>
          <input
            className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-400"
            value={newDueDay}
            onChange={(e) => setNewDueDay(e.target.value)}
          />
        </div>

        <button type="submit" className="hidden" />

        <div className="col-span-2 sm:col-span-3 md:col-span-5 mt-1">
          <button
            type="submit"
            className="border border-green-400 px-4 py-1 text-xs text-green-400 hover:bg-green-400/10 cursor-pointer"
          >
            [ ADD ]
          </button>
        </div>
      </form>

      {/* shortcuts helper */}
      <div className="border-t border-neutral-800 pt-3 mt-3 text-[0.7rem] text-neutral-600">
        j/k = rows · h/l = cols · i/Enter = edit · a = add form · dd = delete · Esc = cancel
      </div>
    </section>
  );
}

