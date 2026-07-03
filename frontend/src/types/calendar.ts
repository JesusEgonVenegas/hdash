export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    isAllDay: boolean;
    color: string;
    recurrence?: "none" | "daily" | "weekly" | "monthly";
    isRecurring?: boolean;
    createdByUserId: string;
    createdByName: string;
    householdId?: string;
    createdAt: string;
}
