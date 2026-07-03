export interface TodoItem {
    id: string;
    title: string;
    description: string | null;
    isCompleted: boolean;
    priority: "low" | "medium" | "high";
    dueDate: string | null;
    recurrence: "none" | "daily" | "weekly" | "monthly";
    createdByUserId: string;
    createdByName: string | null;
    assignedToUserId: string | null;
    assignedToName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTodoRequest {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    assignedToUserId?: string;
    recurrence?: "none" | "daily" | "weekly" | "monthly";
}

export interface UpdateTodoRequest {
    title?: string;
    description?: string;
    isCompleted?: boolean;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    assignedToUserId?: string;
}
