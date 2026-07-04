"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);

  if (!context) {
    throw new Error("DropdownMenu components must be used inside DropdownMenu");
  }

  return context;
}

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className="relative inline-flex">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
  className,
}: {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useDropdownMenu();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      aria-expanded={open}
      aria-haspopup="menu"
      className={className}
      onClick={() => setOpen((current) => !current)}
      type={asChild ? undefined : "button"}
    >
      {children}
    </Comp>
  );
}

export function DropdownMenuContent({
  children,
  align = "center",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const { open } = useDropdownMenu();

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-2 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className,
      )}
      role="menu"
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  asChild,
  children,
  className,
  onClick,
}: {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { setOpen } = useDropdownMenu();
  const Comp = asChild ? Slot : "button";

  function handleClick() {
    onClick?.();
    setOpen(false);
  }

  return (
    <Comp
      className={cn(
        "flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      onClick={handleClick}
      role="menuitem"
      type={asChild ? undefined : "button"}
    >
      {children}
    </Comp>
  );
}
