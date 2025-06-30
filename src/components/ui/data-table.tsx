// En: components/ui/data-table.tsx
"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// --- PROPS DEL COMPONENTE ---
interface DataTableProps<T> {
  data: T[];
  columns: ReadonlyArray<{
    accessorKey: keyof T;
    header: string;
    cell?: (item: T) => ReactNode;
  }>;
  // --- ¡CAMBIO AQUÍ! De una sola llave a un arreglo de llaves ---
  searchKeys: Array<keyof T>;
  searchPlaceholder?: string; // Placeholder opcional para la barra de búsqueda
}

// --- COMPONENTE PRINCIPAL ---
export function DataTable<T>({
  data,
  columns,
  searchKeys,
  searchPlaceholder,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return data;
    }
    return data.filter((item) => {
      // --- ¡LÓGICA MEJORADA AQUÍ! ---
      // La función 'some' revisa si al menos UNA de las llaves de búsqueda
      // coincide con el término de búsqueda.
      return searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    });
  }, [data, searchTerm, searchKeys]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda */}
      <div className="flex items-center">
        <Input
          placeholder={searchPlaceholder || `Search...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Tabla (sin cambios) */}
      <div className="rounded-md border border-light-border dark:border-dark-border">
        <Table>
          <TableHeader>
            <TableRow className="border-b-light-border dark:border-b-dark-border">
              {columns.map((column) => (
                <TableHead
                  key={String(column.accessorKey)}
                  className="text-light-subtext dark:text-dark-subtext"
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <TableRow
                  key={index}
                  className="text-light-text dark:text-dark-text"
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.accessorKey)}>
                      {column.cell
                        ? column.cell(item)
                        : String(item[column.accessorKey])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación (sin cambios) */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages > 0 ? totalPages : 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
