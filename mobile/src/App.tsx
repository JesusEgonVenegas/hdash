import { HashRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { DashboardPage } from "./pages/DashboardPage";
import { TodosPage } from "./pages/TodosPage";
import { GroceryPage } from "./pages/GroceryPage";
import { ChoresPage } from "./pages/ChoresPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DebtsPage } from "./pages/DebtsPage";
import { MorePage } from "./pages/MorePage";

export default function App() {
    return (
        <HashRouter>
            <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#0a0a0a]">
                {/* Safe-area top spacer */}
                <div className="safe-top shrink-0 bg-[#0a0a0a]" />

                {/* Main content */}
                <main className="flex-1 page-scroll min-h-0">
                    <Routes>
                        <Route path="/"         element={<DashboardPage />} />
                        <Route path="/todos"    element={<TodosPage />} />
                        <Route path="/grocery"  element={<GroceryPage />} />
                        <Route path="/chores"   element={<ChoresPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/debts"    element={<DebtsPage />} />
                        <Route path="/more"     element={<MorePage />} />
                    </Routes>
                </main>

                {/* Bottom nav + safe-area bottom */}
                <div className="shrink-0 safe-bottom bg-[#0a0a0a]">
                    <BottomNav />
                </div>
            </div>
        </HashRouter>
    );
}
