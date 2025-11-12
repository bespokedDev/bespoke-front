import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../data-table";

interface Person {
  id: string;
  name: string;
  email: string;
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span>{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span>{row.original.email}</span>,
  },
];

const sampleData: Person[] = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com" },
  { id: "2", name: "Bob Smith", email: "bob@example.com" },
  { id: "3", name: "Belén Álvarez", email: "belen@example.com" },
];

describe("DataTable", () => {
  it("filters rows based on the global search input", async () => {
    const user = userEvent.setup();

    render(
      <DataTable<Person, string>
        columns={columns}
        data={sampleData}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search people..."
      />
    );

    const searchInput = screen.getByPlaceholderText("Search people...");
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, "Bob");

    expect(screen.queryByText("Alice Johnson")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
  });

  it("matches results ignoring accent marks", async () => {
    const user = userEvent.setup();

    render(
      <DataTable<Person, string>
        columns={columns}
        data={sampleData}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search people..."
      />
    );

    const searchInput = screen.getByPlaceholderText("Search people...");
    await user.clear(searchInput);
    await user.type(searchInput, "Belen");

    expect(screen.getByText("Belén Álvarez")).toBeInTheDocument();
  });
});

