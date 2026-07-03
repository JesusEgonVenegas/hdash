using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

/// <summary>
/// Seeds a lived-in demo household so a fresh login lands on a fully populated app.
/// Development only. Idempotent: gated on the demo household already existing.
/// </summary>
public static class DemoSeeder
{
    public const string AlexEmail = "admin@hdash.local";
    public const string SamEmail = "sam@hdash.local";
    public const string Password = "admin123";
    private const string HouseholdName = "The Nest";

    public static async Task SeedAsync(AppDbContext db, UserManager<ApplicationUser> userManager, ILogger logger)
    {
        // Get-or-create both members.
        var alex = await GetOrCreateUserAsync(userManager, AlexEmail, "Alex");
        var sam = await GetOrCreateUserAsync(userManager, SamEmail, "Sam");

        // If the demo household already exists, assume everything is seeded.
        if (await db.Households.AnyAsync(h => h.Name == HouseholdName))
        {
            logger.LogInformation("Demo household already present; skipping content seed.");
            return;
        }

        var today = DateTime.UtcNow.Date;

        // --- Household ---
        var household = new Household
        {
            Name = HouseholdName,
            OwnerId = alex.Id,
            InviteCode = "NEST24",
        };
        db.Households.Add(household);

        alex.HouseholdId = household.Id;
        sam.HouseholdId = household.Id;
        await userManager.UpdateAsync(alex);
        await userManager.UpdateAsync(sam);

        // --- Debts (per-user) with payment history ---
        var visa = new Debt
        {
            Name = "Chase Visa", StartingAmount = 3200m, InterestRate = 22.9m,
            MinPayment = 90m, DueDay = 15, UserId = alex.Id, CreatedAt = today.AddDays(-100),
            Payments =
            {
                new Payment { Amount = 150m, PaidAt = today.AddDays(-75) },
                new Payment { Amount = 150m, PaidAt = today.AddDays(-45) },
                new Payment { Amount = 200m, PaidAt = today.AddDays(-14) },
            },
        };
        var carLoan = new Debt
        {
            Name = "Car Loan", StartingAmount = 12000m, InterestRate = 6.4m,
            MinPayment = 285m, DueDay = 1, UserId = alex.Id, CreatedAt = today.AddDays(-95),
            Payments =
            {
                new Payment { Amount = 285m, PaidAt = today.AddDays(-62) },
                new Payment { Amount = 285m, PaidAt = today.AddDays(-31) },
                new Payment { Amount = 285m, PaidAt = today.AddDays(-2) },
            },
        };
        var studentLoan = new Debt
        {
            Name = "Student Loan", StartingAmount = 18500m, InterestRate = 4.5m,
            MinPayment = 210m, DueDay = 28, UserId = sam.Id, CreatedAt = today.AddDays(-60),
            Payments =
            {
                new Payment { Amount = 210m, PaidAt = today.AddDays(-40) },
                new Payment { Amount = 210m, PaidAt = today.AddDays(-9) },
            },
        };
        db.Debts.AddRange(visa, carLoan, studentLoan);

        // --- Grocery list (shared, half shopped) ---
        db.GroceryItems.AddRange(
            Grocery(household, alex, "Oat milk", 2, "Dairy", checkedOff: true),
            Grocery(household, alex, "Eggs", 1, "Dairy", checkedOff: true),
            Grocery(household, sam, "Bananas", 6, "Produce", checkedOff: true),
            Grocery(household, sam, "Spinach", 1, "Produce", checkedOff: false),
            Grocery(household, alex, "Chicken thighs", 1, "Meat", checkedOff: false),
            Grocery(household, sam, "Pasta", 3, "Pantry", checkedOff: false),
            Grocery(household, sam, "Olive oil", 1, "Pantry", checkedOff: false),
            Grocery(household, alex, "Dish soap", 1, "Household", checkedOff: false),
            Grocery(household, alex, "Paper towels", 2, "Household", checkedOff: false)
        );

        // --- Todos (shared) ---
        db.TodoItems.AddRange(
            Todo(household, alex, "Call landlord about the leaky faucet", "high", today.AddDays(1), alex),
            Todo(household, sam, "Book dentist appointment", "medium", today.AddDays(6), sam),
            Todo(household, alex, "Renew car insurance", "high", today.AddDays(3), alex),
            Todo(household, sam, "Return Amazon package", "low", today.AddDays(2), sam),
            Todo(household, alex, "Water the plants", "low", null, sam),
            DoneTodo(household, sam, "Pay electricity bill", "high", alex)
        );

        // --- Chores (shared, mid-rotation) ---
        db.ChoreItems.AddRange(
            Chore(household, alex, sam, "Take out trash", "weekly", today.AddDays(-1)),      // overdue, Sam's turn
            Chore(household, alex, alex, "Vacuum living room", "weekly", today.AddDays(2)),
            Chore(household, sam, sam, "Clean bathroom", "biweekly", today.AddDays(5)),
            DoneChore(household, alex, alex, "Do the dishes", "daily", today.AddDays(1), today.AddDays(-1)),
            Chore(household, sam, alex, "Grocery run", "weekly", today.AddDays(3)),
            Chore(household, alex, sam, "Change bedsheets", "biweekly", today.AddDays(8))
        );

        // --- Calendar (this month) ---
        db.CalendarEvents.AddRange(
            Event(household, alex, "Rent due", today.AddDays(-today.Day + 1), "red", allDay: true),
            Event(household, sam, "Sam's mom visiting", today.AddDays(4), "purple", allDay: true),
            Event(household, alex, "Date night", today.AddDays(2).AddHours(19), "yellow"),
            Event(household, alex, "Dentist (Sam)", today.AddDays(6).AddHours(10), "blue"),
            Event(household, sam, "Farmers market", today.AddDays(5).AddHours(9), "green"),
            Event(household, alex, "Car service", today.AddDays(9).AddHours(14), "blue"),
            Event(household, sam, "Movie night", today.AddDays(-3).AddHours(20), "yellow"),
            Event(household, alex, "Trash pickup", today.AddDays(1).AddHours(8), "green")
        );

        // --- Pinboard notes ---
        db.HouseholdNotes.AddRange(
            new HouseholdNote { Content = "Landlord coming Thursday to fix the faucet — someone be home 2-4pm", Color = "pink", Pinned = true, CreatedByUserId = alex.Id, HouseholdId = household.Id, CreatedAt = today.AddDays(-1) },
            new HouseholdNote { Content = "We're out of coffee filters btw", Color = "yellow", CreatedByUserId = sam.Id, HouseholdId = household.Id, CreatedAt = today.AddDays(-2) },
            new HouseholdNote { Content = "Movie night Friday? I'll grab snacks 🍿", Color = "green", CreatedByUserId = sam.Id, HouseholdId = household.Id, CreatedAt = today }
        );

        // --- Shared expenses ---
        var both = $"{alex.Id},{sam.Id}";
        db.Expenses.AddRange(
            new Expense { Description = "Groceries", Amount = 60m, PaidByUserId = sam.Id, ParticipantIds = both, HouseholdId = household.Id, CreatedAt = today.AddDays(-3) },
            new Expense { Description = "Internet bill", Amount = 120m, PaidByUserId = alex.Id, ParticipantIds = both, HouseholdId = household.Id, CreatedAt = today.AddDays(-2) },
            new Expense { Description = "Dinner out", Amount = 45m, PaidByUserId = alex.Id, ParticipantIds = both, HouseholdId = household.Id, CreatedAt = today.AddDays(-1) }
        );

        // --- Meal plan (this week) ---
        db.Meals.AddRange(
            new Meal { Date = today, Slot = "dinner", Title = "Chicken stir-fry", Ingredients = "chicken thighs\nbell peppers\nsoy sauce\nrice", CreatedByUserId = alex.Id, HouseholdId = household.Id },
            new Meal { Date = today.AddDays(1), Slot = "dinner", Title = "Pasta night", Ingredients = "pasta\ntomatoes\ngarlic\nparmesan", CreatedByUserId = sam.Id, HouseholdId = household.Id },
            new Meal { Date = today.AddDays(2), Slot = "dinner", Title = "Taco Tuesday", Ingredients = "tortillas\nground beef\nlettuce\ncheese\nsalsa", CreatedByUserId = alex.Id, HouseholdId = household.Id }
        );

        await db.SaveChangesAsync();
        logger.LogInformation(
            "Seeded demo household '{Household}' (invite {Code}) with 2 members, 3 debts, 9 groceries, 6 todos, 6 chores, 8 events.",
            HouseholdName, household.InviteCode);
        logger.LogInformation("Demo logins: {Alex} and {Sam} (password: {Password})", AlexEmail, SamEmail, Password);
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

    private static GroceryItem Grocery(Household h, ApplicationUser u, string name, int qty, string category, bool checkedOff) =>
        new() { Name = name, Quantity = qty, Category = category, IsChecked = checkedOff, UserId = u.Id, HouseholdId = h.Id };

    private static TodoItem Todo(Household h, ApplicationUser creator, string title, string priority, DateTime? due, ApplicationUser assignee) =>
        new() { Title = title, Priority = priority, DueDate = due, CreatedByUserId = creator.Id, AssignedToUserId = assignee.Id, HouseholdId = h.Id };

    private static TodoItem DoneTodo(Household h, ApplicationUser creator, string title, string priority, ApplicationUser assignee)
    {
        var t = Todo(h, creator, title, priority, null, assignee);
        t.IsCompleted = true;
        return t;
    }

    private static ChoreItem Chore(Household h, ApplicationUser creator, ApplicationUser assignee, string name, string frequency, DateTime nextDue) =>
        new()
        {
            Name = name, Frequency = frequency, NextDueDate = nextDue,
            CreatedByUserId = creator.Id, AssignedToUserId = assignee.Id, HouseholdId = h.Id,
        };

    private static ChoreItem DoneChore(Household h, ApplicationUser creator, ApplicationUser assignee, string name, string frequency, DateTime nextDue, DateTime completedAt)
    {
        var c = Chore(h, creator, assignee, name, frequency, nextDue);
        c.IsCompletedThisCycle = true;
        c.LastCompletedAt = completedAt;
        return c;
    }

    private static CalendarEvent Event(Household h, ApplicationUser creator, string title, DateTime start, string color, bool allDay = false) =>
        new() { Title = title, StartDate = start, Color = color, IsAllDay = allDay, CreatedByUserId = creator.Id, HouseholdId = h.Id };
}
