"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const doneness = [
  "Rare",
  "Medium Rare",
  "Medium",
  "Well",
  "Well Done",
  "Burnt",
];
export function Mascot({
  level = 0,
  className,
  decorative = false,
}: {
  level?: number;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <div
      className={cn("mascot", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${doneness[level]} steak mascot`}
      style={{
        backgroundPosition: `${(level % 3) * 50}% ${Math.floor(level / 3) * 100}%`,
      }}
    />
  );
}

export function MascotGuide() {
  const [level, setLevel] = useState("0");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Meet your interviewer
        </Button>
      </DialogTrigger>
      <DialogContent className="mascot-dialog">
        <DialogHeader>
          <DialogTitle>A little character. Six levels of cooked.</DialogTitle>
          <DialogDescription>
            Mascot design preview — this does not change or assess your session.
          </DialogDescription>
        </DialogHeader>
        <Mascot level={Number(level)} className="guide-mascot" />
        <h3 className="text-center">{doneness[Number(level)]}</h3>
        <ToggleGroup
          type="single"
          value={level}
          onValueChange={(value) => value && setLevel(value)}
          className="doneness-options"
          aria-label="Preview doneness"
        >
          {doneness.map((label, index) => (
            <ToggleGroupItem
              key={label}
              value={String(index)}
              aria-label={label}
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="muted text-center">
          Rare to Burnt is a playful summary of demonstrated performance. A
          session needs a validated assessment before receiving a doneness
          level.
        </p>
      </DialogContent>
    </Dialog>
  );
}
