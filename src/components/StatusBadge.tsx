import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "Pending" | "Approved" | "Rejected";
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = {
    Pending: {
      icon: Clock,
      className: "bg-pending text-pending-foreground border border-pending",
    },
    Approved: {
      icon: CheckCircle2,
      className: "bg-success text-success-foreground border border-success",
    },
    Rejected: {
      icon: XCircle,
      className: "bg-destructive/20 text-destructive border border-destructive",
    },
  };

  const { icon: Icon, className } = config[status];

  return (
    <Badge className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
};
