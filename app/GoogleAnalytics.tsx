"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/firebase";

export default function GoogleAnalytics() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return null;
}