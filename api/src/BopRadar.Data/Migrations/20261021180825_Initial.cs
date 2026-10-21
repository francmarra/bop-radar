using System;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BopRadar.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "bop_updates",
                columns: table => new
                {
                    version = table.Column<string>(type: "text", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bop_updates", x => x.version);
                });

            migrationBuilder.CreateTable(
                name: "car_update_notes",
                columns: table => new
                {
                    car_id = table.Column<string>(type: "text", nullable: false),
                    version = table.Column<string>(type: "text", nullable: false),
                    class_size = table.Column<int>(type: "integer", nullable: false),
                    summary = table.Column<string>(type: "text", nullable: false),
                    context = table.Column<JsonDocument>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_car_update_notes", x => new { x.car_id, x.version });
                });

            migrationBuilder.CreateTable(
                name: "cars",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    maker = table.Column<string>(type: "text", nullable: false),
                    drivetrain = table.Column<string>(type: "text", nullable: false),
                    group = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cars", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tracks",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    set = table.Column<string>(type: "text", nullable: false),
                    stats = table.Column<JsonDocument>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tracks", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "car_bop_entries",
                columns: table => new
                {
                    car_id = table.Column<string>(type: "text", nullable: false),
                    version = table.Column<string>(type: "text", nullable: false),
                    set = table.Column<string>(type: "text", nullable: false),
                    changed = table.Column<bool>(type: "boolean", nullable: false),
                    rank = table.Column<int>(type: "integer", nullable: false),
                    tier = table.Column<string>(type: "text", nullable: false),
                    pp = table.Column<double>(type: "double precision", nullable: false),
                    power_ps = table.Column<int>(type: "integer", nullable: false),
                    torque_kgfm = table.Column<double>(type: "double precision", nullable: false),
                    weight_kg = table.Column<int>(type: "integer", nullable: false),
                    ps_per_t = table.Column<double>(type: "double precision", nullable: true),
                    balance = table.Column<string>(type: "text", nullable: false),
                    acc100150 = table.Column<double>(type: "double precision", nullable: false),
                    rotg60 = table.Column<double>(type: "double precision", nullable: false),
                    rotg120 = table.Column<double>(type: "double precision", nullable: false),
                    rotg240 = table.Column<double>(type: "double precision", nullable: false),
                    stab_low = table.Column<double>(type: "double precision", nullable: false),
                    stab_high = table.Column<double>(type: "double precision", nullable: false),
                    stab_low_flag = table.Column<string>(type: "text", nullable: false),
                    stab_high_flag = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_car_bop_entries", x => new { x.car_id, x.version, x.set });
                    table.CheckConstraint("ck_car_bop_entries_set", "\"set\" IN ('h','m','l')");
                    table.ForeignKey(
                        name: "fk_car_bop_entries_bop_updates_version",
                        column: x => x.version,
                        principalTable: "bop_updates",
                        principalColumn: "version",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_car_bop_entries_cars_car_id",
                        column: x => x.car_id,
                        principalTable: "cars",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "update_changes",
                columns: table => new
                {
                    version = table.Column<string>(type: "text", nullable: false),
                    car_id = table.Column<string>(type: "text", nullable: false),
                    verdict = table.Column<string>(type: "text", nullable: false),
                    delta = table.Column<JsonDocument>(type: "jsonb", nullable: false),
                    rank = table.Column<int>(type: "integer", nullable: false),
                    summary = table.Column<string>(type: "text", nullable: false),
                    brief = table.Column<JsonDocument>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_update_changes", x => new { x.version, x.car_id });
                    table.ForeignKey(
                        name: "fk_update_changes_bop_updates_version",
                        column: x => x.version,
                        principalTable: "bop_updates",
                        principalColumn: "version",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_update_changes_cars_car_id",
                        column: x => x.car_id,
                        principalTable: "cars",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_car_bop_entries_car_id_set_version",
                table: "car_bop_entries",
                columns: new[] { "car_id", "set", "version" });

            migrationBuilder.CreateIndex(
                name: "ix_car_bop_entries_version",
                table: "car_bop_entries",
                column: "version");

            migrationBuilder.CreateIndex(
                name: "ix_cars_group",
                table: "cars",
                column: "group");

            migrationBuilder.CreateIndex(
                name: "ix_cars_maker",
                table: "cars",
                column: "maker");

            migrationBuilder.CreateIndex(
                name: "ix_update_changes_car_id",
                table: "update_changes",
                column: "car_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "car_bop_entries");

            migrationBuilder.DropTable(
                name: "car_update_notes");

            migrationBuilder.DropTable(
                name: "tracks");

            migrationBuilder.DropTable(
                name: "update_changes");

            migrationBuilder.DropTable(
                name: "bop_updates");

            migrationBuilder.DropTable(
                name: "cars");
        }
    }
}
