// Local-first data layer — all data lives in localStorage.
// No backend, no auth, no network required.

export type Priority = "low" | "medium" | "high";
export type Frequency = "daily" | "weekly" | "biweekly" | "monthly";
export type EventColor = "green" | "blue" | "red" | "yellow" | "purple";

export interface TodoItem {
    id: string;
    title: string;
    priority: Priority;
    isCompleted: boolean;
    dueDate?: string;
    assigneeId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface GroceryItem {
    id: string;
    name: string;
    quantity: number;
    price?: number;
    isChecked: boolean;
    category?: string;
    createdAt: string;
}

export interface ChoreItem {
    id: string;
    name: string;
    description?: string;
    frequency: Frequency;
    isCompletedThisCycle: boolean;
    nextDueDate: string;
    lastCompletedAt?: string;
    assigneeId?: string;
    createdAt: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    isAllDay: boolean;
    color: EventColor;
    createdAt: string;
}

export interface Debt {
    id: string;
    name: string;
    startingAmount: number;
    interestRate: number;
    minPayment: number;
    dueDay: number;
    createdAt: string;
}

export type NoteColor = "default" | "green" | "cyan" | "orange" | "pink" | "purple" | "amber";

export interface Note {
    id: string;
    title: string;
    content: string;
    color: NoteColor;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BudgetCategory {
    id: string;
    name: string;
    limit: number;
    spent: number;
    month: string; // "YYYY-MM"
    emoji?: string;
    createdAt: string;
}

export interface Member {
    id: string;
    name: string;
    avatar: string; // 1-2 char initials or emoji
    color: string;  // hex
    createdAt: string;
}

export interface HdashExport {
    exportedAt: string;
    version: 1;
    todos: TodoItem[];
    grocery: GroceryItem[];
    chores: ChoreItem[];
    calendar: CalendarEvent[];
    debts: Debt[];
    notes: Note[];
    budget: BudgetCategory[];
    members: Member[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
    return crypto.randomUUID();
}

function now(): string {
    return new Date().toISOString();
}

function load<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(`hdash_${key}`);
        return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
        return [];
    }
}

function save<T>(key: string, data: T[]): void {
    localStorage.setItem(`hdash_${key}`, JSON.stringify(data));
}

function nextDueDate(frequency: Frequency, from: Date = new Date()): string {
    const d = new Date(from);
    switch (frequency) {
        case "daily":    d.setDate(d.getDate() + 1); break;
        case "weekly":   d.setDate(d.getDate() + 7); break;
        case "biweekly": d.setDate(d.getDate() + 14); break;
        case "monthly":  d.setMonth(d.getMonth() + 1); break;
    }
    return d.toISOString();
}

// ─── Todos ────────────────────────────────────────────────────────────────────

export const todos = {
    list(): TodoItem[] {
        return load<TodoItem>("todos").sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
            const p = { high: 0, medium: 1, low: 2 };
            if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    },

    add(title: string, priority: Priority = "medium", dueDate?: string, assigneeId?: string): TodoItem {
        const item: TodoItem = {
            id: uid(), title, priority, isCompleted: false,
            dueDate, assigneeId, createdAt: now(), updatedAt: now(),
        };
        const all = load<TodoItem>("todos");
        all.unshift(item);
        save("todos", all);
        return item;
    },

    update(id: string, patch: Partial<Pick<TodoItem, "title" | "priority" | "dueDate" | "isCompleted" | "assigneeId">>): TodoItem {
        const all = load<TodoItem>("todos");
        const idx = all.findIndex((t) => t.id === id);
        if (idx === -1) throw new Error("Todo not found");
        all[idx] = { ...all[idx], ...patch, updatedAt: now() };
        save("todos", all);
        return all[idx];
    },

    toggle(id: string): TodoItem {
        const all = load<TodoItem>("todos");
        const idx = all.findIndex((t) => t.id === id);
        if (idx === -1) throw new Error("Todo not found");
        all[idx] = { ...all[idx], isCompleted: !all[idx].isCompleted, updatedAt: now() };
        save("todos", all);
        return all[idx];
    },

    remove(id: string): void {
        save("todos", load<TodoItem>("todos").filter((t) => t.id !== id));
    },

    clearCompleted(): void {
        save("todos", load<TodoItem>("todos").filter((t) => !t.isCompleted));
    },
};

// ─── Grocery ─────────────────────────────────────────────────────────────────

export const grocery = {
    list(): GroceryItem[] {
        return load<GroceryItem>("grocery").sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    add(name: string, quantity: number = 1, category?: string, price?: number): GroceryItem {
        const item: GroceryItem = { id: uid(), name, quantity, price, isChecked: false, category, createdAt: now() };
        const all = load<GroceryItem>("grocery");
        all.unshift(item);
        save("grocery", all);
        return item;
    },

    toggle(id: string): GroceryItem {
        const all = load<GroceryItem>("grocery");
        const idx = all.findIndex((g) => g.id === id);
        if (idx === -1) throw new Error("Item not found");
        all[idx] = { ...all[idx], isChecked: !all[idx].isChecked };
        save("grocery", all);
        return all[idx];
    },

    remove(id: string): void {
        save("grocery", load<GroceryItem>("grocery").filter((g) => g.id !== id));
    },

    clearChecked(): void {
        save("grocery", load<GroceryItem>("grocery").filter((g) => !g.isChecked));
    },
};

// ─── Chores ──────────────────────────────────────────────────────────────────

export const chores = {
    list(): ChoreItem[] {
        // Auto-reset items past their due date
        const all = load<ChoreItem>("chores").map((c) => {
            if (c.isCompletedThisCycle && new Date(c.nextDueDate) <= new Date()) {
                return { ...c, isCompletedThisCycle: false };
            }
            return c;
        });
        save("chores", all);
        return all.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    },

    add(name: string, frequency: Frequency, description?: string): ChoreItem {
        const item: ChoreItem = {
            id: uid(), name, frequency, description,
            isCompletedThisCycle: false,
            nextDueDate: nextDueDate(frequency),
            createdAt: now(),
        };
        const all = load<ChoreItem>("chores");
        all.push(item);
        save("chores", all);
        return item;
    },

    update(id: string, patch: Partial<Pick<ChoreItem, "name" | "description" | "frequency">>): ChoreItem {
        const all = load<ChoreItem>("chores");
        const idx = all.findIndex((c) => c.id === id);
        if (idx === -1) throw new Error("Chore not found");
        all[idx] = { ...all[idx], ...patch };
        save("chores", all);
        return all[idx];
    },

    complete(id: string): ChoreItem {
        const all = load<ChoreItem>("chores");
        const idx = all.findIndex((c) => c.id === id);
        if (idx === -1) throw new Error("Chore not found");
        all[idx] = {
            ...all[idx],
            isCompletedThisCycle: true,
            lastCompletedAt: now(),
            nextDueDate: nextDueDate(all[idx].frequency),
        };
        save("chores", all);
        return all[idx];
    },

    remove(id: string): void {
        save("chores", load<ChoreItem>("chores").filter((c) => c.id !== id));
    },
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const calendar = {
    list(monthKey?: string): CalendarEvent[] {
        const all = load<CalendarEvent>("calendar");
        if (!monthKey) return all;
        const [y, m] = monthKey.split("-").map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        return all.filter((e) => {
            const s = new Date(e.startDate);
            const eEnd = e.endDate ? new Date(e.endDate) : s;
            return s <= end && eEnd >= start;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    },

    add(data: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent {
        const item: CalendarEvent = { id: uid(), ...data, createdAt: now() };
        const all = load<CalendarEvent>("calendar");
        all.push(item);
        save("calendar", all);
        return item;
    },

    update(id: string, patch: Partial<Omit<CalendarEvent, "id" | "createdAt">>): CalendarEvent {
        const all = load<CalendarEvent>("calendar");
        const idx = all.findIndex((e) => e.id === id);
        if (idx === -1) throw new Error("Event not found");
        all[idx] = { ...all[idx], ...patch };
        save("calendar", all);
        return all[idx];
    },

    remove(id: string): void {
        save("calendar", load<CalendarEvent>("calendar").filter((e) => e.id !== id));
    },
};

// ─── Debts ───────────────────────────────────────────────────────────────────

export const debts = {
    list(): Debt[] {
        return load<Debt>("debts").sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    },

    add(data: Omit<Debt, "id" | "createdAt">): Debt {
        const item: Debt = { id: uid(), ...data, createdAt: now() };
        const all = load<Debt>("debts");
        all.push(item);
        save("debts", all);
        return item;
    },

    update(id: string, patch: Partial<Omit<Debt, "id" | "createdAt">>): Debt {
        const all = load<Debt>("debts");
        const idx = all.findIndex((d) => d.id === id);
        if (idx === -1) throw new Error("Debt not found");
        all[idx] = { ...all[idx], ...patch };
        save("debts", all);
        return all[idx];
    },

    remove(id: string): void {
        save("debts", load<Debt>("debts").filter((d) => d.id !== id));
    },
};

// ─── Notes ───────────────────────────────────────────────────────────────────

export const notes = {
    list(): Note[] {
        return load<Note>("notes").sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    },

    add(title: string, content: string, color: NoteColor = "default"): Note {
        const item: Note = { id: uid(), title, content, color, pinned: false, createdAt: now(), updatedAt: now() };
        const all = load<Note>("notes");
        all.unshift(item);
        save("notes", all);
        return item;
    },

    update(id: string, patch: Partial<Pick<Note, "title" | "content" | "color" | "pinned">>): Note {
        const all = load<Note>("notes");
        const idx = all.findIndex((n) => n.id === id);
        if (idx === -1) throw new Error("Note not found");
        all[idx] = { ...all[idx], ...patch, updatedAt: now() };
        save("notes", all);
        return all[idx];
    },

    remove(id: string): void {
        save("notes", load<Note>("notes").filter((n) => n.id !== id));
    },
};

// ─── Budget ──────────────────────────────────────────────────────────────────

function currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const budget = {
    listMonth(month: string = currentMonth()): BudgetCategory[] {
        return load<BudgetCategory>("budget")
            .filter((b) => b.month === month)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    add(name: string, limit: number, emoji?: string, month: string = currentMonth()): BudgetCategory {
        const item: BudgetCategory = { id: uid(), name, limit, spent: 0, month, emoji, createdAt: now() };
        const all = load<BudgetCategory>("budget");
        all.push(item);
        save("budget", all);
        return item;
    },

    addSpending(id: string, amount: number): BudgetCategory {
        const all = load<BudgetCategory>("budget");
        const idx = all.findIndex((b) => b.id === id);
        if (idx === -1) throw new Error("Category not found");
        all[idx] = { ...all[idx], spent: all[idx].spent + amount };
        save("budget", all);
        return all[idx];
    },

    update(id: string, patch: Partial<Pick<BudgetCategory, "name" | "limit" | "spent" | "emoji">>): BudgetCategory {
        const all = load<BudgetCategory>("budget");
        const idx = all.findIndex((b) => b.id === id);
        if (idx === -1) throw new Error("Category not found");
        all[idx] = { ...all[idx], ...patch };
        save("budget", all);
        return all[idx];
    },

    remove(id: string): void {
        save("budget", load<BudgetCategory>("budget").filter((b) => b.id !== id));
    },

    copyToMonth(sourceMonth: string, targetMonth: string): void {
        const source = load<BudgetCategory>("budget").filter((b) => b.month === sourceMonth);
        const copies = source.map((b) => ({ ...b, id: uid(), month: targetMonth, spent: 0, createdAt: now() }));
        const all = load<BudgetCategory>("budget");
        save("budget", [...all, ...copies]);
    },
};

// ─── Export / Import ─────────────────────────────────────────────────────────

// ─── Members ─────────────────────────────────────────────────────────────────

const MEMBER_COLORS = ["#4ade80","#22d3ee","#fb923c","#f472b6","#a78bfa","#fbbf24","#f87171","#34d399"];

export const members = {
    list(): Member[] {
        return load<Member>("members").sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    },

    add(name: string): Member {
        const all = load<Member>("members");
        const color = MEMBER_COLORS[all.length % MEMBER_COLORS.length];
        const avatar = name.trim().slice(0, 2).toUpperCase();
        const item: Member = { id: uid(), name: name.trim(), avatar, color, createdAt: now() };
        all.push(item);
        save("members", all);
        return item;
    },

    update(id: string, patch: Partial<Pick<Member, "name" | "avatar" | "color">>): Member {
        const all = load<Member>("members");
        const idx = all.findIndex((m) => m.id === id);
        if (idx === -1) throw new Error("Member not found");
        all[idx] = { ...all[idx], ...patch };
        save("members", all);
        return all[idx];
    },

    remove(id: string): void {
        save("members", load<Member>("members").filter((m) => m.id !== id));
        // unassign from todos and chores
        const ts = load<TodoItem>("todos").map((t) => t.assigneeId === id ? { ...t, assigneeId: undefined } : t);
        save("todos", ts);
        const cs = load<ChoreItem>("chores").map((c) => c.assigneeId === id ? { ...c, assigneeId: undefined } : c);
        save("chores", cs);
    },
};

// ─── Export / Import ─────────────────────────────────────────────────────────

export function exportData(): HdashExport {
    return {
        exportedAt: now(),
        version: 1,
        todos:    load<TodoItem>("todos"),
        grocery:  load<GroceryItem>("grocery"),
        chores:   load<ChoreItem>("chores"),
        calendar: load<CalendarEvent>("calendar"),
        debts:    load<Debt>("debts"),
        notes:    load<Note>("notes"),
        budget:   load<BudgetCategory>("budget"),
        members:  load<Member>("members"),
    };
}

export function importData(data: HdashExport): void {
    if (data.version !== 1) throw new Error("Unsupported export version");
    save("todos",    data.todos    ?? []);
    save("grocery",  data.grocery  ?? []);
    save("chores",   data.chores   ?? []);
    save("calendar", data.calendar ?? []);
    save("debts",    data.debts    ?? []);
    save("notes",    data.notes    ?? []);
    save("budget",   data.budget   ?? []);
    save("members",  data.members  ?? []);
}

export function clearAllData(): void {
    ["todos", "grocery", "chores", "calendar", "debts", "notes", "budget", "members"].forEach((k) =>
        localStorage.removeItem(`hdash_${k}`)
    );
}
