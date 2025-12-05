"use client";

import { useEffect, useRef, useState } from "react";
import { Debt } from "@/types/debt";

type Mode = "normal" | "insert";
type ColumnKey = "name" | "amount" | "interestRate" | "minPayment" | "dueDay";

const COLUMNS: { key: ColumnKey; label: string; widthClass: string }[] = [
    { key: "name", label: "name", widthClass: "w-40" },
    { key: "amount", label: "amount", widthClass: "w-28" },
    { key: "interestRate", label: "apr", widthClass: "w-20" },
    { key: "minPayment", label: "min_payment", widthClass: "w-28" },
    { key: "dueDay", label: "due_day", widthClass: "w-20" },
];

export default function DebtSheet({ initialDebts }: { initialDebts?: Debt[] }) {
    // 🧠 local state for debts, guarded against undefined
    const [debts, setDebts] = useState<Debt[]>(initialDebts ?? []);

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

    // 🔑 GLOBAL KEY HANDLER (Vim-ish navigation in NORMAL mode)
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
            case "amount":
                updated.amount = parseFloat(editingValue) || 0;
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
            amount: updated.amount ?? oldDebt.amount,
            interestRate: updated.interestRate ?? oldDebt.interestRate,
            minPayment: updated.minPayment ?? oldDebt.minPayment,
            dueDay: updated.dueDay ?? oldDebt.dueDay,
        };

        try {
            const res = await fetch(`http://localhost:5063/api/debts/${oldDebt.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                console.error("Failed to update debt");
            } else {
                const updatedDebt: Debt = await res.json();
                setDebts((prev) =>
                    prev.map((d, i) => (i === selectedRow ? updatedDebt : d)),
                );
            }
        } catch (err) {
            console.error(err);
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
            amount: parseFloat(newAmount) || 0,
            interestRate: parseFloat(newApr) || 0,
            minPayment: parseFloat(newMinPayment) || 0,
            dueDay: parseInt(newDueDay, 10) || 1,
        };

        if (!payload.name || payload.amount <= 0) {
            console.warn("Name and positive amount required");
            return;
        }

        try {
            const res = await fetch("http://localhost:5063/api/debts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                console.error("Failed to create debt");
                return;
            }

            const created: Debt = await res.json();
            setDebts((prev) => [...prev, created]);

            // reset form
            setNewDebtName("");
            setNewAmount("");
            setNewApr("");
            setNewMinPayment("");
            setNewDueDay("");
            setMode("normal");
        } catch (err) {
            console.error(err);
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
            const res = await fetch(`http://localhost:5063/api/debts/${debt.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                throw new Error("Failed to delete debt");
            } else {
                setDebts((prev) => {
                    const updated = prev.filter((_, i) => (i !== selectedRow))
                    const updatedLength = updated.length
                    if (selectedRow >= updatedLength) {
                        setSelectedRow(Math.max(updated.length - 1, 0))
                    }
                    return updated
                });
            }
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
                    className="bg-black text-white border border-neutral-600 px-1 text-xs w-full"
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
        if (col.key === "amount" || col.key === "minPayment") {
            display = `$${Number(raw).toLocaleString()}`;
        } else if (col.key === "interestRate") {
            display = `${raw}%`;
        } else if (col.key === "dueDay") {
            display = `day ${raw}`;
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
        <section className="ascii-panel font-mono text-xs space-y-4 max-w-full overflow-x-auto">

            {/* mode + help */}
            <div className="flex justify-between items-center mb-2">
                <div>
                    <span className="text-neutral-400 mr-2">mode:</span>
                    {mode === "normal" ? (
                        <span className="text-green-400">[NORMAL]</span>
                    ) : (
                        <span className="text-yellow-400">[INSERT]</span>
                    )}
                </div>
                <div className="text-neutral-500 text-[0.7rem]">
                    j/k rows · h/l cols · i/Enter edit · a add · dd delete row · Esc cancel
                </div>
            </div>

            {/* sheet table */}
            <div className="border border-neutral-700 inline-block min-w-full">
                {/* header */}
                <div className="ascii-table-header bg-neutral-900">
                    {COLUMNS.map((col) => (
                        <span
                            key={col.key}
                            className={`${col.widthClass} px-2 py-1`}
                        >
                            {col.label}
                        </span>
                    ))}
                </div>

                {/* rows */}
                {debts.map((d, rowIdx) => {
                    const isDeleteRow = deleteModeRef.current === "pending" && selectedRow === rowIdx;
                    return (
                        <div key={d.id} className={`ascii-table-row ${isDeleteRow ? "bg-red-800 text-white" : ""}`}>
                            {COLUMNS.map((col, colIdx) => (
                                <div
                                    key={col.key}
                                    className={`${col.widthClass} px-2 py-1 ${rowIdx === selectedRow && colIdx === selectedCol
                                        ? "border border-blue-500"
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
                    <div className="p-2 text-neutral-500">no debts found</div>
                )}
            </div>

            {/* add new debt form */}
            <form
                className="mt-4 grid grid-cols-5 gap-2 items-end"
                onSubmit={handleAddDebt}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        setMode("normal");
                        (e.target as HTMLInputElement).blur();
                    }
                }}
            >
                <div>
                    <label className="block text-neutral-500 text-[0.7rem]">
                        name
                    </label>
                    <input
                        ref={newNameRef}
                        id="new-debt-name"
                        className="w-full bg-black border border-neutral-700 px-2 py-1 text-xs"
                        value={newDebtName}
                        onChange={(e) => setNewDebtName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-neutral-500 text-[0.7rem]">
                        amount
                    </label>
                    <input
                        className="w-full bg-black border border-neutral-700 px-2 py-1 text-xs"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-neutral-500 text-[0.7rem]">
                        apr (%)
                    </label>
                    <input
                        className="w-full bg-black border border-neutral-700 px-2 py-1 text-xs"
                        value={newApr}
                        onChange={(e) => setNewApr(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-neutral-500 text-[0.7rem]">
                        min_payment
                    </label>
                    <input
                        className="w-full bg-black border border-neutral-700 px-2 py-1 text-xs"
                        value={newMinPayment}
                        onChange={(e) => setNewMinPayment(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-neutral-500 text-[0.7rem]">
                        due_day
                    </label>
                    <input
                        className="w-full bg-black border border-neutral-700 px-2 py-1 text-xs"
                        value={newDueDay}
                        onChange={(e) => setNewDueDay(e.target.value)}
                    />
                </div>

                {/* hidden submit makes Enter work */}
                <button type="submit" className="hidden" />

                {/* optional visible button */}
                <div className="col-span-5 mt-1">
                    <button
                        type="submit"
                        className="px-3 py-1 text-xs border border-neutral-600 rounded hover:bg-neutral-800"
                    >
                        add
                    </button>
                </div>
            </form>

            {/* shortcuts helper */}
            <div className="mt-2 border border-neutral-700 p-2 text-[0.7rem] text-neutral-400">
                <div>Keyboard shortcuts:</div>
                <div>j/k = move rows · h/l = move cols</div>
                <div>i or Enter = edit cell · Esc = exit edit</div>
                <div>a = focus add-new-debt form</div>
            </div>
        </section>
    );
}

