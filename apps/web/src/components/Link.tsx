"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { publicPath } from "../routing";
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} href={typeof props.href === "string" ? publicPath(props.href) : props.href} />;
}
