using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

/// <summary>
/// Seeds a lived-in demo household so a fresh login lands on a fully populated app.
/// Development only.
///
/// Every date is derived from "today" at seed time, so the data only looks current
/// on the day it was written. Re-run with Seed:Reset=true (env Seed__Reset=true) to
/// wipe the demo household and rebuild it against today's date.
/// </summary>
public static class DemoSeeder
{
    public const string AlexEmail = "admin@hdash.local";
    public const string SamEmail = "sam@hdash.local";
    public const string Password = "admin123";
    private const string HouseholdName = "The Nest";

    public static async Task SeedAsync(
        AppDbContext db, UserManager<ApplicationUser> userManager, ILogger logger, bool reset = false)
    {
        // Get-or-create both members.
        var alex = await GetOrCreateUserAsync(userManager, AlexEmail, "Alex");
        var sam = await GetOrCreateUserAsync(userManager, SamEmail, "Sam");

        var existing = await db.Households.FirstOrDefaultAsync(h => h.Name == HouseholdName);
        if (existing is not null)
        {
            if (!reset)
            {
                logger.LogInformation(
                    "Demo household already present; skipping content seed. " +
                    "Set Seed:Reset=true (env Seed__Reset=true) to rebuild it with today's dates.");
                return;
            }

            logger.LogInformation("Seed:Reset — wiping demo household '{Household}' before reseeding.", HouseholdName);
            await WipeDemoDataAsync(db, existing.Id, alex.Id, sam.Id);
        }

        var today = DateTime.UtcNow.Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
        // The meal planner shows a Monday-start week.
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

        // Nth of the current month, clamped so short months stay valid.
        DateTime OnDay(int day) => monthStart.AddDays(Math.Min(day, daysInMonth) - 1);

        // --- Household ---
        var household = new Household
        {
            Name = HouseholdName,
            OwnerId = alex.Id,
            InviteCode = "NEST24",
        };
        db.Households.Add(household);

        alex.HouseholdId = household.Id;
        alex.Color = "blue";
        sam.HouseholdId = household.Id;
        sam.Color = "pink";
        await userManager.UpdateAsync(alex);
        await userManager.UpdateAsync(sam);

        // --- Debts (per-user) with payment history ---
        // Deliberately arranged so the payoff strategies disagree: the highest-APR
        // debt (Store Card) is NOT the smallest balance (Medical Bill), so avalanche
        // and snowball pick different first targets and produce different totals.
        var storeCard = new Debt
        {
            Name = "Store Card", StartingAmount = 1900m, InterestRate = 26.99m,
            MinPayment = 45m, DueDay = 8, UserId = alex.Id, CreatedAt = today.AddMonths(-8),
            Payments = MonthlyPayments(today, 60m, 7, dueDay: 8),
        };
        var visa = new Debt
        {
            Name = "Chase Visa", StartingAmount = 4200m, InterestRate = 22.9m,
            MinPayment = 90m, DueDay = 15, UserId = alex.Id, CreatedAt = today.AddMonths(-10),
            Payments = MonthlyPayments(today, 150m, 9, dueDay: 15),
        };
        var medical = new Debt
        {
            Name = "Medical Bill", StartingAmount = 1200m, InterestRate = 0m,
            MinPayment = 50m, DueDay = 20, UserId = sam.Id, CreatedAt = today.AddMonths(-5),
            Payments = MonthlyPayments(today, 50m, 5, dueDay: 20),
        };
        var carLoan = new Debt
        {
            Name = "Car Loan", StartingAmount = 14000m, InterestRate = 6.4m,
            MinPayment = 285m, DueDay = 1, UserId = alex.Id, CreatedAt = today.AddMonths(-14),
            Payments = MonthlyPayments(today, 285m, 13, dueDay: 1),
        };
        var studentLoan = new Debt
        {
            Name = "Student Loan", StartingAmount = 19800m, InterestRate = 4.5m,
            MinPayment = 210m, DueDay = 28, UserId = sam.Id, CreatedAt = today.AddMonths(-12),
            Payments = MonthlyPayments(today, 210m, 11, dueDay: 28),
        };
        db.Debts.AddRange(storeCard, visa, medical, carLoan, studentLoan);

        // --- Grocery list (shared, mid-shop) ---
        db.GroceryItems.AddRange(
            Grocery(household, alex, "Oat milk", 2, "Dairy", checkedOff: true),
            Grocery(household, alex, "Greek yogurt", 4, "Dairy", checkedOff: true),
            Grocery(household, sam, "Bananas", 6, "Produce", checkedOff: true),
            Grocery(household, sam, "Spinach", 1, "Produce", checkedOff: false),
            Grocery(household, sam, "Bell peppers", 3, "Produce", checkedOff: false),
            Grocery(household, alex, "Lemons", 2, "Produce", checkedOff: false),
            Grocery(household, alex, "Chicken thighs", 1, "Meat", checkedOff: false),
            Grocery(household, sam, "Ground beef", 1, "Meat", checkedOff: false),
            Grocery(household, alex, "Sourdough loaf", 1, "Bakery", checkedOff: false),
            Grocery(household, sam, "Pasta", 3, "Pantry", checkedOff: false),
            Grocery(household, sam, "Olive oil", 1, "Pantry", checkedOff: false),
            Grocery(household, alex, "Coffee beans", 1, "Pantry", checkedOff: false),
            Grocery(household, sam, "Frozen peas", 2, "Frozen", checkedOff: false),
            Grocery(household, alex, "Dish soap", 1, "Household", checkedOff: false),
            Grocery(household, alex, "Paper towels", 2, "Household", checkedOff: false),
            Grocery(household, sam, "Trash bags", 1, "Household", checkedOff: false)
        );

        // --- Todos (shared) — a couple genuinely late, the rest ahead ---
        db.TodoItems.AddRange(
            Todo(household, alex, "Call landlord about the leaky faucet", "high", today.AddDays(-2), alex),
            Todo(household, sam, "Send back the wrong-size jacket", "medium", today.AddDays(-1), sam),
            Todo(household, alex, "Renew car insurance", "high", today, alex),
            Todo(household, sam, "Book dentist appointment", "medium", today.AddDays(2), sam),
            Todo(household, alex, "Pay quarterly tax estimate", "high", today.AddDays(5), alex),
            Todo(household, sam, "Return Amazon package", "low", today.AddDays(3), sam),
            Todo(household, alex, "Replace furnace filter", "medium", today.AddDays(9), sam),
            Todo(household, sam, "Plan Mum's birthday dinner", "medium", today.AddDays(14), alex),
            Todo(household, alex, "Water the plants", "low", null, sam),
            DoneTodo(household, sam, "Pay electricity bill", "high", alex, today.AddDays(-4)),
            DoneTodo(household, alex, "Pick up dry cleaning", "low", sam, today.AddDays(-6))
        );

        // --- Chores (shared, mid-rotation) ---
        var trash = Chore(household, alex, sam, "Take out trash", "weekly", today.AddDays(-1), alex, today.AddDays(-8), streak: 3);
        var vacuum = Chore(household, alex, alex, "Vacuum living room", "weekly", today.AddDays(2), sam, today.AddDays(-5), streak: 2);
        var bathroom = Chore(household, sam, sam, "Clean bathroom", "biweekly", today.AddDays(5), alex, today.AddDays(-9), streak: 4);
        var dishes = DoneChore(household, alex, alex, "Do the dishes", "daily", today.AddDays(1), today.AddHours(-3), sam);
        var groceryRun = Chore(household, sam, alex, "Grocery run", "weekly", today.AddDays(3), sam, today.AddDays(-4), streak: 1);
        var bedsheets = Chore(household, alex, sam, "Change bedsheets", "biweekly", today.AddDays(8), alex, today.AddDays(-6), streak: 2);
        var litter = Chore(household, sam, alex, "Scoop litter box", "daily", today, sam, today.AddDays(-1), streak: 6);
        db.ChoreItems.AddRange(trash, vacuum, bathroom, dishes, groceryRun, bedsheets, litter);

        // Completion history so the Fairness Ledger has a real chore load to weigh.
        // Sam has done a bit more lately — the ledger should say so.
        var completions = new List<ChoreCompletion>();
        void Log(ChoreItem c, ApplicationUser who, int daysAgo, bool onTime = true) =>
            completions.Add(new ChoreCompletion
            {
                ChoreItemId = c.Id, ChoreName = c.Name, UserId = who.Id,
                HouseholdId = household.Id, OnTime = onTime, CompletedAt = today.AddDays(-daysAgo),
            });

        Log(dishes, sam, 0); Log(dishes, alex, 1); Log(dishes, sam, 2); Log(dishes, sam, 3);
        Log(dishes, alex, 4); Log(dishes, sam, 5); Log(dishes, alex, 6);
        Log(litter, sam, 1); Log(litter, alex, 2); Log(litter, sam, 3); Log(litter, sam, 4);
        Log(trash, alex, 8); Log(trash, sam, 15, onTime: false);
        Log(vacuum, sam, 5); Log(vacuum, alex, 12);
        Log(bathroom, alex, 9); Log(bathroom, sam, 23);
        Log(groceryRun, sam, 4); Log(groceryRun, alex, 11); Log(groceryRun, sam, 18);
        Log(bedsheets, alex, 6); Log(bedsheets, sam, 20);
        db.ChoreCompletions.AddRange(completions);

        // --- Calendar (spread across the current month, plus two recurring series) ---
        db.CalendarEvents.AddRange(
            Recurring(household, alex, "Rent due", OnDay(1), "red", "monthly", allDay: true),
            Recurring(household, sam, "Bin collection", OnDay(2).AddHours(8), "green", "weekly"),
            Event(household, sam, "Movie night", OnDay(4).AddHours(20), "yellow"),
            Event(household, alex, "Alex dentist", OnDay(6).AddHours(10), "blue"),
            Event(household, sam, "Farmers market", OnDay(7).AddHours(9), "green"),
            Event(household, alex, "Date night", today.AddDays(2).AddHours(19), "yellow"),
            Event(household, sam, "Sam's mum visiting", today.AddDays(4), "purple", allDay: true),
            Event(household, alex, "Car service", today.AddDays(6).AddHours(14), "blue"),
            Event(household, sam, "Book club", today.AddDays(9).AddHours(19), "purple"),
            Event(household, alex, "Power bill due", OnDay(22), "red", allDay: true),
            Event(household, alex, "Flat inspection", OnDay(25).AddHours(11), "red"),
            // Multi-day, so the month view has a span to render too.
            MultiDay(household, sam, "Weekend away", OnDay(18), OnDay(20), "purple")
        );

        // --- Pinboard notes ---
        db.HouseholdNotes.AddRange(
            new HouseholdNote { Content = "Landlord coming Thursday to fix the faucet — someone be home 2-4pm", Color = "pink", Pinned = true, CreatedByUserId = alex.Id, HouseholdId = household.Id, CreatedAt = today.AddDays(-1) },
            new HouseholdNote { Content = "We're out of coffee filters btw", Color = "yellow", CreatedByUserId = sam.Id, HouseholdId = household.Id, CreatedAt = today.AddDays(-2) },
            new HouseholdNote { Content = "Movie night Friday? I'll grab snacks 🍿", Color = "green", CreatedByUserId = sam.Id, HouseholdId = household.Id, CreatedAt = today },
            new HouseholdNote { Content = "Wifi router password is on the fridge now", Color = "blue", Pinned = true, CreatedByUserId = alex.Id, HouseholdId = household.Id, CreatedAt = today.AddDays(-5) }
        );

        // --- Shared expenses ---
        var both = $"{alex.Id},{sam.Id}";
        db.Expenses.AddRange(
            Expense(household, sam, both, "Weekly shop", 82.40m, "Food", today.AddDays(-1)),
            Expense(household, alex, both, "Internet bill", 120m, "Utilities", today.AddDays(-2)),
            Expense(household, alex, both, "Dinner out", 45m, "Food", today.AddDays(-4)),
            Expense(household, sam, both, "Cleaning supplies", 31.20m, "Household", today.AddDays(-6)),
            Expense(household, alex, both, "Electricity", 96.75m, "Utilities", today.AddDays(-9)),
            Expense(household, sam, both, "Weekly shop", 74.10m, "Food", today.AddDays(-11)),
            Expense(household, alex, both, "Streaming subscriptions", 28m, "Entertainment", today.AddDays(-14)),
            Expense(household, sam, both, "Train tickets", 52m, "Transport", today.AddDays(-18))
        );

        // --- Meal plan (the Monday-start week the planner opens on) ---
        db.Meals.AddRange(
            Meal(household, alex, weekStart, "breakfast", "Overnight oats", "oats\nmilk\nblueberries"),
            Meal(household, alex, weekStart, "dinner", "Chicken stir-fry", "chicken thighs\nbell peppers\nsoy sauce\nrice"),
            Meal(household, sam, weekStart.AddDays(1), "dinner", "Pasta night", "pasta\ntomatoes\ngarlic\nparmesan"),
            Meal(household, alex, weekStart.AddDays(2), "dinner", "Taco Tuesday (on a Wednesday)", "tortillas\nground beef\nlettuce\ncheese\nsalsa"),
            Meal(household, sam, weekStart.AddDays(3), "lunch", "Leftover tacos", null),
            Meal(household, sam, weekStart.AddDays(3), "dinner", "Sheet-pan salmon", "salmon\nbroccoli\nlemons\nolive oil"),
            Meal(household, alex, weekStart.AddDays(4), "dinner", "Homemade pizza", "pizza dough\nmozzarella\npassata\nbasil"),
            Meal(household, sam, weekStart.AddDays(5), "breakfast", "Pancakes", "flour\neggs\nmilk\nmaple syrup"),
            Meal(household, sam, weekStart.AddDays(5), "dinner", "Thai green curry", "coconut milk\ngreen curry paste\nchicken\njasmine rice"),
            Meal(household, alex, weekStart.AddDays(6), "dinner", "Roast + veg", "chicken\npotatoes\ncarrots\ngravy")
        );

        db.RecurringExpenses.Add(new RecurringExpense
        {
            Description = "Rent", Amount = 1800m, Cadence = "monthly", Category = "Rent",
            PaidByUserId = alex.Id, ParticipantIds = both,
            NextRunDate = OnDay(1).AddMonths(1), HouseholdId = household.Id,
        });

        await db.SaveChangesAsync();
        logger.LogInformation(
            "Seeded demo household '{Household}' (invite {Code}) dated {Today}: 2 members, 5 debts, "
            + "16 groceries, 11 todos, 7 chores, 12 events, 10 meals, 8 expenses.",
            HouseholdName, household.InviteCode, today.ToString("yyyy-MM-dd"));
        logger.LogInformation("Demo logins: {Alex} and {Sam} (password: {Password})", AlexEmail, SamEmail, Password);
    }

    /// <summary>
    /// Removes everything the demo seeder created, so a reset rebuilds from scratch.
    /// Explicit per-table deletes rather than relying on cascade, so the order is obvious.
    /// </summary>
    private static async Task WipeDemoDataAsync(AppDbContext db, Guid householdId, string alexId, string samId)
    {
        var memberIds = new[] { alexId, samId };

        db.Payments.RemoveRange(await db.Payments
            .Where(p => memberIds.Contains(p.Debt!.UserId)).ToListAsync());
        db.Debts.RemoveRange(await db.Debts.Where(d => memberIds.Contains(d.UserId)).ToListAsync());
        db.ChoreCompletions.RemoveRange(await db.ChoreCompletions.Where(c => c.HouseholdId == householdId).ToListAsync());
        db.ChoreItems.RemoveRange(await db.ChoreItems.Where(c => c.HouseholdId == householdId).ToListAsync());
        db.GroceryItems.RemoveRange(await db.GroceryItems.Where(g => g.HouseholdId == householdId).ToListAsync());
        db.TodoItems.RemoveRange(await db.TodoItems.Where(t => t.HouseholdId == householdId).ToListAsync());
        db.CalendarEvents.RemoveRange(await db.CalendarEvents.Where(e => e.HouseholdId == householdId).ToListAsync());
        db.HouseholdNotes.RemoveRange(await db.HouseholdNotes.Where(n => n.HouseholdId == householdId).ToListAsync());
        db.Expenses.RemoveRange(await db.Expenses.Where(e => e.HouseholdId == householdId).ToListAsync());
        db.RecurringExpenses.RemoveRange(await db.RecurringExpenses.Where(r => r.HouseholdId == householdId).ToListAsync());
        db.Meals.RemoveRange(await db.Meals.Where(m => m.HouseholdId == householdId).ToListAsync());
        await db.SaveChangesAsync();

        // Members must leave before the household row can go (Owner is Restrict).
        foreach (var u in await db.Users.Where(u => u.HouseholdId == householdId).ToListAsync())
            u.HouseholdId = null;
        await db.SaveChangesAsync();

        db.Households.RemoveRange(await db.Households.Where(h => h.Id == householdId).ToListAsync());
        await db.SaveChangesAsync();
    }

    private static async Task<ApplicationUser> GetOrCreateUserAsync(
        UserManager<ApplicationUser> userManager, string email, string displayName)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is not null) return user;

        user = new ApplicationUser { UserName = email, Email = email, DisplayName = displayName };
        await userManager.CreateAsync(user, Password);
        return user;
    }

    /// <summary>
    /// A run of equal payments, one per month, each landing on the debt's own due
    /// day — so the ledger reads like a real standing order rather than every debt
    /// being paid on the same date. Starts from the most recent due date that has
    /// already passed.
    /// </summary>
    private static List<Payment> MonthlyPayments(DateTime today, decimal amount, int count, int dueDay)
    {
        var anchor = new DateTime(today.Year, today.Month, 1);
        // This month's due date hasn't come round yet — start from last month's.
        if (Math.Min(dueDay, DateTime.DaysInMonth(anchor.Year, anchor.Month)) >= today.Day)
            anchor = anchor.AddMonths(-1);

        return Enumerable.Range(0, count)
            .Select(i =>
            {
                var m = anchor.AddMonths(-i);
                var day = Math.Min(dueDay, DateTime.DaysInMonth(m.Year, m.Month));
                return new Payment { Amount = amount, PaidAt = new DateTime(m.Year, m.Month, day) };
            })
            .OrderBy(p => p.PaidAt)
            .ToList();
    }

    private static GroceryItem Grocery(Household h, ApplicationUser u, string name, int qty, string category, bool checkedOff) =>
        new() { Name = name, Quantity = qty, Category = category, IsChecked = checkedOff, UserId = u.Id, HouseholdId = h.Id };

    private static TodoItem Todo(Household h, ApplicationUser creator, string title, string priority, DateTime? due, ApplicationUser assignee) =>
        new() { Title = title, Priority = priority, DueDate = due, CreatedByUserId = creator.Id, AssignedToUserId = assignee.Id, HouseholdId = h.Id };

    private static TodoItem DoneTodo(Household h, ApplicationUser creator, string title, string priority, ApplicationUser assignee, DateTime due)
    {
        var t = Todo(h, creator, title, priority, due, assignee);
        t.IsCompleted = true;
        return t;
    }

    private static ChoreItem Chore(
        Household h, ApplicationUser creator, ApplicationUser assignee, string name, string frequency,
        DateTime nextDue, ApplicationUser? lastBy = null, DateTime? lastAt = null, int streak = 0) =>
        new()
        {
            Name = name, Frequency = frequency, NextDueDate = nextDue,
            CreatedByUserId = creator.Id, AssignedToUserId = assignee.Id, HouseholdId = h.Id,
            LastCompletedByUserId = lastBy?.Id, LastCompletedAt = lastAt, Streak = streak,
        };

    private static ChoreItem DoneChore(
        Household h, ApplicationUser creator, ApplicationUser assignee, string name, string frequency,
        DateTime nextDue, DateTime completedAt, ApplicationUser completedBy)
    {
        var c = Chore(h, creator, assignee, name, frequency, nextDue, completedBy, completedAt, streak: 5);
        c.IsCompletedThisCycle = true;
        return c;
    }

    private static Expense Expense(
        Household h, ApplicationUser paidBy, string participants, string description,
        decimal amount, string category, DateTime at) =>
        new()
        {
            Description = description, Amount = amount, Category = category,
            PaidByUserId = paidBy.Id, ParticipantIds = participants,
            HouseholdId = h.Id, CreatedAt = at,
        };

    private static Meal Meal(
        Household h, ApplicationUser creator, DateTime date, string slot, string title, string? ingredients) =>
        new()
        {
            Date = date.Date, Slot = slot, Title = title, Ingredients = ingredients,
            CreatedByUserId = creator.Id, HouseholdId = h.Id,
        };

    private static CalendarEvent Event(Household h, ApplicationUser creator, string title, DateTime start, string color, bool allDay = false) =>
        new() { Title = title, StartDate = start, Color = color, IsAllDay = allDay, CreatedByUserId = creator.Id, HouseholdId = h.Id };

    private static CalendarEvent MultiDay(Household h, ApplicationUser creator, string title, DateTime start, DateTime end, string color)
    {
        var e = Event(h, creator, title, start, color, allDay: true);
        e.EndDate = end;
        return e;
    }

    private static CalendarEvent Recurring(Household h, ApplicationUser creator, string title, DateTime start, string color, string recurrence, bool allDay = false)
    {
        var e = Event(h, creator, title, start, color, allDay);
        e.Recurrence = recurrence;
        return e;
    }
}
