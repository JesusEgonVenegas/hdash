using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddProportionalSplit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SplitMode",
                table: "Households",
                type: "TEXT",
                nullable: false,
                defaultValue: "equal");

            migrationBuilder.AddColumn<decimal>(
                name: "Income",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SplitMode",
                table: "Households");

            migrationBuilder.DropColumn(
                name: "Income",
                table: "AspNetUsers");
        }
    }
}
