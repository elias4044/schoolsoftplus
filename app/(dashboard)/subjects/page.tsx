"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import Link from "next/link";

interface Teacher {
  firstName: string;
  lastName: string;
}

interface Subject {
  id: string | number;
  subject: string;
  teachers: Teacher[];
  unreadEntities?: number;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ success: boolean; subjects: Subject[] }>("/api/subjects")
      .then(d => {
        if (d && d.success && Array.isArray(d.subjects)) {
          setSubjects(d.subjects);
        } else {
          setSubjects([]);
        }
      })
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Subjects
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subjects.length} subjects</p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 rounded-xl bg-card border border-white/7 animate-pulse" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No subjects found.</div>
      ) : (
        <motion.div
          variants={staggerContainer} 
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {subjects.map((subject) => (
            <motion.div
              key={subject.id}
              variants={fadeUp}
              className="flex items-center justify-between rounded-xl border border-white/7 bg-card px-4 py-3.5 hover:border-primary/30 hover:bg-brand-dim transition-all group"
            >
              <Link href={`/subjects/${subject.id}`} className="w-full">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {subject.subject}
                </p>
                {subject.teachers[0] && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subject.teachers[0].firstName + " " + subject.teachers[0].lastName}</p>
                )}
              </Link>
              <div className="flex items-center gap-2">
                {subject.unreadEntities != null && subject.unreadEntities > 0 && (
                  <Badge
                    className="text-[10px]"
                    style={{
                      background: "oklch(0.65 0.22 278 / 20%)",
                      color: "oklch(0.75 0.15 278)",
                      border: "1px solid oklch(0.65 0.22 278 / 30%)",
                    }}
                  >
                    {subject.unreadEntities}
                  </Badge>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
