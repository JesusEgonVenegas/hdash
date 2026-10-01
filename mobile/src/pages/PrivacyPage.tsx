export function PrivacyPage() {
    return (
        <div className="pb-8">
            <div className="page-header">
                <span className="page-title">&gt; PRIVACY</span>
            </div>
            <div className="px-4 py-4 flex flex-col gap-4 text-sm">
                <section>
                    <div className="label mb-2">DATA STORAGE</div>
                    <p className="text-neutral-400 leading-relaxed text-xs">
                        HDASH stores all data exclusively on your device using browser localStorage.
                        No data is ever transmitted to any server. No account is required.
                        No analytics, tracking, or advertising of any kind.
                    </p>
                </section>
                <section>
                    <div className="label mb-2">PERMISSIONS</div>
                    <p className="text-neutral-400 leading-relaxed text-xs">
                        This app requires no special Android permissions. It does not access
                        your contacts, camera, microphone, location, or files beyond what
                        you explicitly export.
                    </p>
                </section>
                <section>
                    <div className="label mb-2">BACKUPS</div>
                    <p className="text-neutral-400 leading-relaxed text-xs">
                        You can export all your data as a JSON file at any time via More → Export Backup.
                        This file contains everything and can be imported on any device running HDASH.
                        You own your data completely.
                    </p>
                </section>
                <section>
                    <div className="label mb-2">DELETION</div>
                    <p className="text-neutral-400 leading-relaxed text-xs">
                        To delete all data, use More → Clear All Data.
                        Uninstalling the app also removes all stored data.
                    </p>
                </section>
                <section>
                    <div className="label mb-2">CONTACT</div>
                    <p className="text-neutral-400 leading-relaxed text-xs">
                        Questions or concerns? This app has no backend, but you can reach us
                        through the Play Store listing.
                    </p>
                </section>
            </div>
        </div>
    );
}
