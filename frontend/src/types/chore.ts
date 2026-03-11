export interface ChoreItem {
    id: string;
    name: string;
    description: string | null;
    frequency: "daily" | "weekly" | "biweekly" | "monthly";
    createdByUserId: string;
    createdByName: string | null;
    assignedToUserId: string;
    assignedToName: string | null;
    isCompletedThisCycle: boolean;
    nextDueDate: string;
    lastCompletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateChoreRequest {
    name: string;
    description?: string;
    frequency?: "daily" | "weekly" | "biweekly" | "monthly";
    assignedToUserId?: string;
}

export interface UpdateChoreRequest {
    name?: string;
    description?: string;
    frequency?: "daily" | "weekly" | "biweekly" | "monthly";
    assignedToUserId?: string;
}
