const DOT: Record<string, string> = {
    green: "bg-green-400",
    blue: "bg-blue-400",
    yellow: "bg-yellow-400",
    pink: "bg-pink-400",
    purple: "bg-purple-400",
    orange: "bg-orange-400",
    cyan: "bg-cyan-400",
    red: "bg-red-400",
};

/** A member's accent dot, optionally with their name — for attribution across the app. */
export default function MemberDot({ color, name }: { color?: string | null; name?: string | null }) {
    const cls = DOT[color ?? "green"] ?? DOT.green;
    return (
        <span className="inline-flex items-center gap-1.5 align-middle">
            <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />
            {name && <span>{name}</span>}
        </span>
    );
}

export const MEMBER_DOT = DOT;
