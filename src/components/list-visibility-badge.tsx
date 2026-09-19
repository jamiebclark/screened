import { Globe, Lock, Users } from "lucide-react";
import {
  getListVisibilityOption,
  type ListVisibility,
  type ListVisibilityIcon,
} from "@/lib/list-visibility";
import { cn } from "@/lib/utils";

const ICONS: Record<ListVisibilityIcon, typeof Globe> = {
  globe: Globe,
  users: Users,
  lock: Lock,
};

export function ListVisibilityIconFor({
  visibility,
  className,
}: {
  visibility: ListVisibility;
  className?: string;
}) {
  const Icon = ICONS[getListVisibilityOption(visibility).icon];
  return <Icon className={className} aria-hidden="true" />;
}

/** Icon + label for a list's visibility tier, e.g. "Site members list". */
export function ListVisibilityBadge({
  visibility,
  suffix = "",
  className,
}: {
  visibility: ListVisibility;
  suffix?: string;
  className?: string;
}) {
  const option = getListVisibilityOption(visibility);
  return (
    <span
      data-testid="list-visibility-badge"
      data-visibility={visibility}
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <ListVisibilityIconFor visibility={visibility} className="h-3.5 w-3.5" />
      {option.label}
      {suffix}
    </span>
  );
}
