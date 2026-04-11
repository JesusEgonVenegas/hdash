"use client";

export default function OfflinePage() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
            <div className="border border-yellow-600/40 bg-yellow-500/5 p-8 max-w-md w-full text-center space-y-4">
                <div className="text-yellow-400 text-sm">[OFFLINE]</div>
                <h1 className="text-neutral-300 text-lg">{"> "}no connection</h1>
                <p className="text-neutral-500 text-sm leading-relaxed">
                    HDASH requires a connection to your backend to load data.
                    Check that your server is running and try again.
                </p>
                <div className="pt-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="border border-yellow-600/50 px-6 py-2 text-yellow-400 hover:bg-yellow-400/10 transition-colors text-sm cursor-pointer"
                    >
                        [ retry ]
                    </button>
                </div>
            </div>
            <p className="text-neutral-700 text-xs">HDASH</p>
        </div>
    );
}
