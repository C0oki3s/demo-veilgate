import * as React from "react";
import { cn } from "../../lib/utils";

function Tabs({ className, ...props }) {
  return <div className={cn("ui-tabs", className)} {...props} />;
}

function TabsList({ className, ...props }) {
  return <div className={cn("ui-tabs-list", className)} role="tablist" {...props} />;
}

function TabsTrigger({ className, active, ...props }) {
  return <button className={cn("ui-tabs-trigger", active && "is-active", className)} role="tab" {...props} />;
}

export { Tabs, TabsList, TabsTrigger };
