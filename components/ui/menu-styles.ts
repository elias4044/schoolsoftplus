export const menuSurfaceClassName =
  'bg-popover text-popover-foreground rounded-2xl p-1.5 shadow-xl shadow-black/20 outline-none';

export const menuItemClassName =
  'relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm leading-5 outline-none transition-colors select-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0';

export const menuIconButtonClassName =
  'text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex size-11 shrink-0 items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';

export const menuMotionClassName =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-150 motion-reduce:animate-none';
