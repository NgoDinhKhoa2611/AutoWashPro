using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingWorkflowFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "checkinat",
                table: "bookings",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "completedat",
                table: "bookings",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "fixeddurationminutes",
                table: "bookings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "noshowat",
                table: "bookings",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.InsertData(
                table: "services",
                columns: new[] { "serviceid", "baseprice", "category", "description", "estimatedminutes", "isactive", "isaddon", "isfeatured", "servicename" },
                values: new object[] { 999, 250000, 1, "Dịch vụ rửa xe tiêu chuẩn bao gồm: Rửa ngoại thất, vệ sinh bánh xe, hút bụi nội thất, lau kính, lau taplo, dưỡng nội thất cơ bản, kiểm tra cuối.", 60, true, false, true, "Standard Car Wash" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "services",
                keyColumn: "serviceid",
                keyValue: 999);

            migrationBuilder.DropColumn(
                name: "checkinat",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "completedat",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "fixeddurationminutes",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "noshowat",
                table: "bookings");
        }
    }
}
