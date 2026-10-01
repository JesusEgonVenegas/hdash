using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddChoreCompletionUndoSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PreviousAssigneeUserId",
                table: "ChoreCompletions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PreviousDueDate",
                table: "ChoreCompletions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PreviousStreak",
                table: "ChoreCompletions",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreviousAssigneeUserId",
                table: "ChoreCompletions");

            migrationBuilder.DropColumn(
                name: "PreviousDueDate",
                table: "ChoreCompletions");

            migrationBuilder.DropColumn(
                name: "PreviousStreak",
                table: "ChoreCompletions");
        }
    }
}
