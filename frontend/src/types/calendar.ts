export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    isAllDay: boolean;
    color: string;
    createdByUserId: string;
    createdByName: string;
    householdId?: string;
    createdAt: string;
}
