export interface Household {
    id: string;
    name: string;
    inviteCode: string;
    ownerId: string;
    members: HouseholdMember[];
    createdAt: string;
    splitMode?: "equal" | "proportional";
}

export interface HouseholdMember {
    id: string;
    displayName: string;
    email: string;
    isOwner: boolean;
    color?: string;
    income?: number | null;
}

export interface CreateHouseholdRequest {
    name: string;
}

export interface JoinHouseholdRequest {
    inviteCode: string;
}
