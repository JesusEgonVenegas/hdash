export interface HouseholdNote {
    id: string;
    content: string;
    pinned: boolean;
    color: "yellow" | "green" | "blue" | "pink";
    createdByUserId: string;
    createdByName: string | null;
    createdByColor?: string | null;
    createdAt: string;
    updatedAt: string;
}
