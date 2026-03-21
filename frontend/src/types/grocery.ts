export interface GroceryItem {
    id: string;
    name: string;
    quantity: number;
    isChecked: boolean;
    category: string | null;
    userId: string;
    userName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateGroceryItemRequest {
    name: string;
    quantity?: number;
    category?: string;
}

export interface UpdateGroceryItemRequest {
    name?: string;
    quantity?: number;
    isChecked?: boolean;
    category?: string;
}
