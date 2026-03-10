export interface Household {
    id: string;
    name: string;
    inviteCode: string;
    ownerId: string;
    members: HouseholdMember[];
    createdAt: string;
}

export interface HouseholdMember {
    id: string;
    displayName: string;
    email: string;
    isOwner: boolean;
}

export interface CreateHouseholdRequest {
    name: string;
}

export interface JoinHouseholdRequest {
    inviteCode: string;
}
