import { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { BottomNav } from "./components/BottomNav";
import { Onboarding } from "./components/Onboarding";
import { DashboardPage } from "./pages/DashboardPage";
import { TodosPage }     from "./pages/TodosPage";
import { GroceryPage }   from "./pages/GroceryPage";
import { ChoresPage }    from "./pages/ChoresPage";
import { CalendarPage }  from "./pages/CalendarPage";
import { DebtsPage }     from "./pages/DebtsPage";
import { NotesPage }     from "./pages/NotesPage";
import { BudgetPage }    from "./pages/BudgetPage";
import { MorePage }      from "./pages/MorePage";
import { PrivacyPage }   from "./pages/PrivacyPage";
import { MembersPage }   from "./pages/MembersPage";

const ONBOARD_KEY = "hdash_onboarded";

export default function App() {
    const [showOnboard, setShowOnboard] = useState(
        () => !localStorage.getItem(ONBOARD_KEY)
    );

    function finishOnboard() {
        localStorage.setItem(ONBOARD_KEY, "1");
        setShowOnboard(false);
    }

    return (
        <ThemeProvider>
            {showOnboard && <Onboarding onDone={finishOnboard} />}
            <HashRouter>
                <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#0a0a0a]">
                    <div className="safe-top shrink-0 bg-[#0a0a0a]" />

                    <main className="flex-1 page-scroll min-h-0 fade-in">
                        <Routes>
                            <Route path="/"         element={<DashboardPage />} />
                            <Route path="/todos"    element={<TodosPage />} />
                            <Route path="/grocery"  element={<GroceryPage />} />
                            <Route path="/chores"   element={<ChoresPage />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            <Route path="/debts"    element={<DebtsPage />} />
                            <Route path="/notes"    element={<NotesPage />} />
                            <Route path="/budget"   element={<BudgetPage />} />
                            <Route path="/more"     element={<MorePage />} />
                            <Route path="/privacy"  element={<PrivacyPage />} />
                            <Route path="/members"  element={<MembersPage />} />
                        </Routes>
                    </main>

                    <div className="shrink-0 safe-bottom bg-[#0a0a0a]">
                        <BottomNav />
                    </div>
                </div>
            </HashRouter>
        </ThemeProvider>
    );
}
