export interface FairnessMember {
    userId: string;
    name: string;
    color: string;
    paid: number;
    fairShare: number;
    moneyNet: number; // + carried more than fair share, - carried less
    chores: number;
    choreShare: number; // percent of chores done this period
}

export interface FairnessResponse {
    period: string;
    splitMode: "equal" | "proportional";
    totals: { spend: number; choreCount: number };
    members: FairnessMember[];
    verdict: string;
}
