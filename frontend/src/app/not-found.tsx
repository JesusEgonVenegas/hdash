import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
            <div className="border border-neutral-700 p-8 max-w-md w-full text-center space-y-4">
                <div className="text-green-400 text-4xl font-bold">404</div>
                <h1 className="text-neutral-300 text-lg">{"> "}page not found</h1>
                <p className="text-neutral-500 text-sm">
                    That route doesn&apos;t exist. You may have followed a broken link.
                </p>
                <div className="pt-2">
                    <Link
                        href="/"
                        className="border border-green-400 px-6 py-2 text-green-400 hover:bg-green-400/10 transition-colors text-sm inline-block"
                    >
                        [ go home ]
                    </Link>
                </div>
            </div>
            <p className="text-neutral-700 text-xs">HDASH</p>
        </div>
    );
}
