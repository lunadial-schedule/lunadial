"use client";

/**
 * 페이지네이션 컨트롤
 * 
 * @param currentPage 현재 페이지
 * @param totalPages 전체 페이지
 * @returns 페이지네이션 컨트롤
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
}: PaginationControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (totalPages <= 1) return null;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(createPageURL(page));
  };

  const generatePaginationNumbers = () => {
    const pages = [];
    const showMax = 5; // 한 번에 표시할 최대 페이지 수

    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = generatePaginationNumbers();

  return (
    <nav className="flex items-center justify-center space-x-2 mt-8">
      <Button
        variant="outline"
        size="icon"
        className="w-8 h-8 sm:w-9 sm:h-9"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center space-x-1 sm:space-x-2">
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <Button
                key={`ellipsis-${index}`}
                variant="ghost"
                size="icon"
                className="w-8 h-8 sm:w-9 sm:h-9 pointer-events-none"
                aria-hidden
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            );
          }

          const pageNum = page as number;
          const isActive = currentPage === pageNum;

          return (
            <Button
              key={pageNum}
              variant={isActive ? "default" : "outline"}
              size="icon"
              className={`w-8 h-8 sm:w-9 sm:h-9 ${
                isActive ? "pointer-events-none" : ""
              }`}
              onClick={() => handlePageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={isActive ? "page" : undefined}
            >
              {pageNum}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="w-8 h-8 sm:w-9 sm:h-9"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
