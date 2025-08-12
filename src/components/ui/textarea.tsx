import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-gray-300 placeholder:text-gray-600 text-gray-900 bg-white focus-visible:border-blue-500 focus-visible:ring-blue-500/20 aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40 aria-invalid:border-red-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-300 dark:border-gray-600 flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-sm transition-[color,box-shadow,border-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
