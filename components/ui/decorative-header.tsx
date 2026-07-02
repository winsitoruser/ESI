import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium opacity-80">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className="p-2 bg-white/20 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DecorativeHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  stats?: StatCardProps[];
  colorScheme?: "blue" | "orange" | "green" | "purple" | "red";
}

const DecorativeHeader: React.FC<DecorativeHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  stats = [],
  colorScheme = "blue"
}) => {
  // Gradient styles based on color scheme
  const gradientStyles = {
    blue: "bg-gradient-to-r from-blue-500 to-indigo-600",
    orange: "bg-gradient-to-r from-orange-500 to-amber-600",
    green: "bg-gradient-to-r from-emerald-500 to-green-600",
    purple: "bg-gradient-to-r from-purple-500 to-indigo-600",
    red: "bg-gradient-to-r from-red-500 to-pink-600"
  };

  // Accent colors based on color scheme
  const accentColors = {
    blue: "text-blue-200",
    orange: "text-amber-200",
    green: "text-emerald-200",
    purple: "text-purple-200",
    red: "text-red-200"
  };

  // Circle decorative elements colors
  const circleColors = {
    blue: "bg-blue-400",
    orange: "bg-orange-400",
    green: "bg-emerald-400",
    purple: "bg-purple-400",
    red: "bg-red-400"
  };

  const secondaryCircleColors = {
    blue: "bg-indigo-500",
    orange: "bg-amber-500",
    green: "bg-green-500",
    purple: "bg-indigo-500",
    red: "bg-pink-500"
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${gradientStyles[colorScheme]} p-8 text-white shadow-lg`}>
      {/* Decorative elements */}
      <div className={`absolute -top-24 -right-24 h-64 w-64 rounded-full ${circleColors[colorScheme]} opacity-20`}></div>
      <div className="absolute top-12 right-16 h-24 w-24 rounded-full bg-white opacity-10"></div>
      <div className={`absolute -bottom-8 -left-8 h-40 w-40 rounded-full ${secondaryCircleColors[colorScheme]} opacity-20`}></div>
      
      <div className="relative flex flex-col lg:flex-row justify-between lg:items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            {icon && <span className={`mr-3 ${accentColors[colorScheme]}`}>{icon}</span>} {title}
          </h1>
          {subtitle && (
            <p className="mt-2 opacity-80 max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
            {actions}
          </div>
        )}
      </div>
      
      {/* Stats cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DecorativeHeader;
