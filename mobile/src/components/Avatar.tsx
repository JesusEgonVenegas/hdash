import type { Member } from "../lib/db";

interface Props {
    member: Member;
    size?: "sm" | "md";
    className?: string;
}

export function Avatar({ member, size = "md", className = "" }: Props) {
    const dim = size === "sm" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-xs";
    return (
        <div
            className={`${dim} rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}
            style={{ background: member.color + "22", border: `1px solid ${member.color}55`, color: member.color }}
            title={member.name}
        >
            {member.avatar}
        </div>
    );
}
