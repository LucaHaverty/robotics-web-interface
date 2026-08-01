import { Trash2Icon } from "lucide-react";
import type { Template } from "../../../backend/src/types";
import { Card, CardContent } from "@/components/ui/card";

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
      className={`ring-0 group relative flex w-fit min-w-36 cursor-pointer flex-row items-center gap-3 rounded-xl border bg-[#1C1922] px-4 py-3 transition-all duration-200 hover:border-[#aea3ba]/60 ${
        active ? "border-[#aea3ba]" : "border-[#34303F]"
      } shadow-none`}
    >
      <CardContent className="flex flex-1 items-center gap-2 p-0">
        <span
          className={`size-2 rounded-full transition-colors duration-200 ${
            active ? "bg-[#aea3ba]" : "bg-[#34303F]"
          }`}
        />
        <p className="text-sm">{template.name}</p>
      </CardContent>
      <button
        onClick={(e) => {
          e.stopPropagation(); // was missing — delete no longer also fires onClick/apply
          onDelete();
        }}
        className="text-[#8B85A0] opacity-0 transition-opacity duration-200 hover:text-[#FF5468] group-hover:opacity-100"
      >
        <Trash2Icon className="size-4" />
      </button>
    </Card>
  );
}
