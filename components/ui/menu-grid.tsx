import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export interface MenuItemProps {
  title: string;
  description?: string;
  icon: ReactNode;
  onClick?: () => void;
  colorScheme?: "blue" | "orange" | "green" | "purple" | "red" | "yellow" | "indigo" | "pink" | "gray";
}

const MenuItem: React.FC<MenuItemProps> = ({
  title,
  description,
  icon,
  onClick,
  colorScheme = "blue"
}) => {
  // Background gradient styles based on color scheme
  const gradientStyles = {
    blue: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
    orange: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
    green: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
    purple: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
    red: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
    yellow: "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200",
    indigo: "bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200",
    pink: "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200",
    gray: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"
  };

  // Icon colors based on color scheme
  const iconColors = {
    blue: "text-blue-500",
    orange: "text-orange-500",
    green: "text-green-500",
    purple: "text-purple-500",
    red: "text-red-500",
    yellow: "text-yellow-500",
    indigo: "text-indigo-500",
    pink: "text-pink-500",
    gray: "text-gray-500"
  };

  return (
    <Card 
      className={`border hover:shadow-md transition-all duration-200 cursor-pointer ${gradientStyles[colorScheme]}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-full bg-white bg-opacity-70 shadow-sm">
            <div className={`h-8 w-8 ${iconColors[colorScheme]}`}>
              {icon}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MenuGridProps {
  items: MenuItemProps[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
}

const MenuGrid: React.FC<MenuGridProps> = ({
  items,
  columns = 4
}) => {
  // Grid columns based on the columns prop
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-3 lg:grid-cols-6"
  };

  return (
    <div className={`grid ${gridColsClass[columns]} gap-6`}>
      {items.map((item, index) => (
        <MenuItem key={index} {...item} />
      ))}
    </div>
  );
};

export default MenuGrid;
