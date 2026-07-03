export interface Meal {
    id: string;
    date: string;
    slot: "breakfast" | "lunch" | "dinner";
    title: string;
    ingredients: string | null;
    createdByUserId: string;
    createdByName: string | null;
}
