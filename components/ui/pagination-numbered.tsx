import React from 'react';
import { 
  Pagination as PaginationRoot, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';

interface PaginationNumberedProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showSiblings?: number;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showSiblings = 1
}: PaginationNumberedProps) => {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pageNumbers = [];
    const totalPageNumbers = showSiblings * 2 + 3; // showSiblings on each side + current page + first/last page
    
    // If total pages is less than the total numbers we want to show, just show all pages
    if (totalPages <= totalPageNumbers) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of siblings
      const leftSiblingIndex = Math.max(currentPage - showSiblings, 1);
      const rightSiblingIndex = Math.min(currentPage + showSiblings, totalPages);
      
      // Should we show ellipsis or just pages
      const showLeftDots = leftSiblingIndex > 2;
      const showRightDots = rightSiblingIndex < totalPages - 1;
      
      if (showLeftDots && !showRightDots) {
        // Show more pages on the left side
        const leftItemCount = 3 + 2 * showSiblings;
        const leftRange = Array.from({ length: leftItemCount }, (_, i) => totalPages - leftItemCount + i + 1);
        pageNumbers.push(...leftRange);
      } else if (!showLeftDots && showRightDots) {
        // Show more pages on the right side
        const rightItemCount = 3 + 2 * showSiblings;
        const rightRange = Array.from({ length: rightItemCount - 1 }, (_, i) => i + 2);
        pageNumbers.push(...rightRange);
        pageNumbers.push(totalPages);
      } else if (showLeftDots && showRightDots) {
        // Show ellipsis on both sides
        const middleRange = Array.from(
          { length: rightSiblingIndex - leftSiblingIndex + 1 },
          (_, i) => leftSiblingIndex + i
        );
        
        pageNumbers.push('left-ellipsis');
        pageNumbers.push(...middleRange);
        pageNumbers.push('right-ellipsis');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <PaginationRoot className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) {
                onPageChange(currentPage - 1);
              }
            }}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        
        {getPageNumbers().map((pageNumber, i) => {
          if (pageNumber === 'left-ellipsis' || pageNumber === 'right-ellipsis') {
            return (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }
          
          return (
            <PaginationItem key={pageNumber}>
              <PaginationLink 
                href="#" 
                isActive={currentPage === pageNumber}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(pageNumber as number);
                }}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        
        <PaginationItem>
          <PaginationNext 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
              }
            }}
            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
};
