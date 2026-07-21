import { Button } from "@/components/ui/button";
import type { Template } from "../../../backend/src/types";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2Icon } from "lucide-react";

interface TemplateProps {
  template: Template;
  onClick: () => void;
  onDelete: () => void;
  active: boolean;
}

export function TemplateCard({
  template,
  onClick,
  onDelete,
  active,
}: TemplateProps): React.JSX.Element {
  return (
    <Card
      size="sm"
      onClick={onClick}
      className={`w-87.5 transition-all duration-300  hover:shadow-md ${active ? "border-primary border-2" : ""}`}
    >
      <CardContent>
        <p>{template.name}</p>
      </CardContent>
      <Button variant="destructive" size="icon" onClick={onDelete}>
        <Trash2Icon />
      </Button>
    </Card>
  );
  //   return <>{template.name}</>;
}
