"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, School, LogOut, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";

export default function SettingsPage() {
  const { session, logout } = useAuth();
  const [school, setSchool] = useState(session?.school ?? "engelska");

  const save = async () => {
    // School is stored in the ssp_school cookie on the server.
    // To update it the user must log out and log back in with the new school.
    alert("To change your school, please sign out and log in again with the new school slug.");
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Settings
        </h1>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* School */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-white/7 bg-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">School</h2>
          </div>
          <Separator className="bg-white/7" />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              School slug
            </Label>
            <Input
              value={school}
              onChange={e => setSchool(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-primary/50"
              placeholder="engelska"
            />
            <p className="text-[10px] text-muted-foreground">
              This is the school identifier used in Schoolsoft URLs.
            </p>
          </div>
          <Button
            onClick={save}
            size="sm"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
          >
            Save changes
          </Button>
        </motion.div>

        {/* Account */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-white/7 bg-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Account</h2>
          </div>
          <Separator className="bg-white/7" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Username</p>
            <p className="text-sm font-medium">{session?.username ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{session?.name ?? "—"}</p>
          </div>
        </motion.div>

        {/* Danger */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">Sign out</h2>
          </div>
          <Separator className="bg-destructive/20" />
          <p className="text-xs text-muted-foreground">
            You will be redirected to the login page.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={logout}
            className="bg-destructive/20 text-destructive hover:bg-destructive hover:text-white border border-destructive/30"
          >
            Sign out
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
