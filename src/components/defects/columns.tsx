"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Define the Defect type
export interface Defect {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  applicableOperation: string | null;
  reworkable: boolean;
  machine: string | null;
  isActive: boolean;
}

export const columns: ColumnDef<Defect>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("category") || "N/A",
  },
  {
    accessorKey: "applicableOperation",
    header: "Operation",
    cell: ({ row }) => row.getValue("applicableOperation") || "N/A",
  },
  {
    accessorKey: "machine",
    header: "Machine",
    cell: ({ row }) => row.getValue("machine") || "N/A",
  },
  {
    accessorKey: "reworkable",
    header: "Reworkable",
    cell: ({ row }) => (row.getValue("reworkable") ? "Yes" : "No"),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive")
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const defect = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = `/defects/edit/${defect.id}`}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                // You need to include the handleToggleDefectStatus function here
                // This would typically come from a context or be passed as a prop
                fetch(`/api/defects/${defect.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ isActive: !defect.isActive }),
                }).then(() => {
                  window.location.reload();
                });
              }}
              className={defect.isActive ? "text-red-600" : "text-green-600"}
            >
              {defect.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 