'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  GraduationCap,
  Search,
  X,
  Download,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/*  Types  */
interface ClassStudent {
  name: string;
  email: string | null;
  address: string | null;
}

interface StaffMember {
  name: string;
  lastName: string;
  firstName: string;
  roles: string[];
  workphone: string | null;
  email: string | null;
  contactInfo: string | null;
  pictureUrl: string | null;
}

interface StaffSection {
  section: string;
  members: StaffMember[];
}

type Tab = 'students' | 'staff';

/*  Helpers  */
function nameInitials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

function avatarGradient(name: string) {
  // deterministic hue from name
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, oklch(0.60 0.18 ${hue} / 60%), oklch(0.50 0.22 ${(hue + 40) % 360} / 60%))`;
}

function exportCsv(filename: string, rows: Record<string, string | null>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? null)).join(',')),
  ];
  // Prepend UTF-8 BOM (\uFEFF) so Excel and other tools correctly read characters like ö, ä, å instead of falling back to Windows-1252.
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/*  Sub-components  */
function StudentCard({ student, index }: { student: ClassStudent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="border-border bg-card hover:border-border/80 hover:bg-card/80 group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback
          className="text-xs font-bold"
          style={{ background: avatarGradient(student.name), color: 'oklch(0.9 0.04 278)' }}
        >
          {nameInitials(student.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{student.name}</p>
        {student.email && (
          <a
            href={`mailto:${student.email}`}
            className="text-muted-foreground hover:text-primary block truncate text-[11px] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {student.email}
          </a>
        )}
      </div>
      {student.address && (
        <div className="text-muted-foreground hidden max-w-45 shrink-0 items-center gap-1 text-[11px] sm:flex">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{student.address.split('\n')[0]}</span>
        </div>
      )}
    </motion.div>
  );
}

function StaffCard({ member, index }: { member: StaffMember; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="border-border bg-card hover:border-border/80 overflow-hidden rounded-xl border transition-all"
    >
      <button
        className="group flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback
            className="text-xs font-bold"
            style={{ background: avatarGradient(member.name), color: 'oklch(0.9 0.04 278)' }}
          >
            {nameInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{member.name}</p>
          <p className="text-muted-foreground truncate text-[11px]">
            {member.roles.slice(0, 3).join(' · ')}
            {member.roles.length > 3 && ` +${member.roles.length - 3}`}
          </p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground shrink-0"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-border space-y-2 border-t px-4 pt-1 pb-4">
              {/* Roles */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {member.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="py-0 text-[10px]">
                    {r}
                  </Badge>
                ))}
              </div>
              <div className="space-y-1.5">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="text-muted-foreground hover:text-primary flex items-center gap-2 text-xs transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {member.email}
                  </a>
                )}
                {member.workphone && (
                  <a
                    href={`tel:${member.workphone}`}
                    className="text-muted-foreground hover:text-primary flex items-center gap-2 text-xs transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {member.workphone}
                  </a>
                )}
                {member.contactInfo && (
                  <p className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    {member.contactInfo}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/*  Main page  */
export default function ClassPage() {
  const [tab, setTab] = useState<Tab>('students');
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [sections, setSections] = useState<StaffSection[]>([]);
  const [staffFlat, setStaffFlat] = useState<StaffMember[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [errorStudents, setErrorStudents] = useState<string | null>(null);
  const [errorStaff, setErrorStaff] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('All');

  /*  Fetch  */
  const fetchStudents = async () => {
    setLoadingStudents(true);
    setErrorStudents(null);
    try {
      const res = await fetch('/api/people/class');
      const data = await res.json();
      if (data.success) setStudents(data.students);
      else setErrorStudents(data.error ?? 'Failed to load students.');
    } catch {
      setErrorStudents('Network error.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    setErrorStaff(null);
    try {
      const res = await fetch('/api/people/staff');
      const data = await res.json();
      if (data.success) {
        setSections(data.sections);
        setStaffFlat(data.staff);
      } else {
        setErrorStaff(data.error ?? 'Failed to load staff.');
      }
    } catch {
      setErrorStaff('Network error.');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchStaff();
  }, []);

  /*  Filtering  */
  const q = query.toLowerCase();

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q)
      ),
    [students, q]
  );

  const filteredSections = useMemo(() => {
    const secs =
      selectedSection === 'All' ? sections : sections.filter((s) => s.section === selectedSection);
    return secs
      .map((sec) => ({
        ...sec,
        members: sec.members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.roles.some((r) => r.toLowerCase().includes(q)) ||
            (m.email ?? '').toLowerCase().includes(q)
        ),
      }))
      .filter((sec) => sec.members.length > 0);
  }, [sections, selectedSection, q]);

  /*  CSV export  */
  const handleExport = () => {
    if (tab === 'students') {
      exportCsv(
        'students.csv',
        filteredStudents.map((s) => ({
          Name: s.name,
          Email: s.email,
          Address: s.address?.replace(/\n/g, ', ') ?? null,
        }))
      );
    } else {
      exportCsv(
        'staff.csv',
        filteredSections.flatMap((sec) =>
          sec.members.map((m) => ({
            Section: sec.section,
            Name: m.name,
            Roles: m.roles.join('; '),
            Email: m.email,
            Phone: m.workphone,
          }))
        )
      );
    }
  };

  const loading = tab === 'students' ? loadingStudents : loadingStaff;
  const error = tab === 'students' ? errorStudents : errorStaff;
  const sectionNames = ['All', ...sections.map((s) => s.section)];

  return (
    <div className="flex h-full flex-col">
      {/*  Header  */}
      <div className="shrink-0 space-y-4 px-6 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-xl font-bold tracking-tight">Class & Staff</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {tab === 'students'
                ? `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`
                : `${filteredSections.flatMap((s) => s.members).length} staff member${filteredSections.flatMap((s) => s.members).length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pr-10">
            <button
              onClick={() => (tab === 'students' ? fetchStudents() : fetchStaff())}
              disabled={loading}
              className="border-border text-muted-foreground hover:text-foreground hover:border-border/80 flex h-8 w-8 items-center justify-center rounded-lg border transition-all disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </button>
            <button
              onClick={handleExport}
              disabled={
                loading ||
                (tab === 'students' ? filteredStudents.length === 0 : filteredSections.length === 0)
              }
              className="border-border text-muted-foreground hover:text-foreground hover:border-border/80 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border-border bg-surface-2/40 flex gap-1 rounded-xl border p-1"
        >
          {(['students', 'staff'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setQuery('');
                setSelectedSection('All');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                tab === t
                  ? 'bg-surface-2 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              {t === 'students' ? (
                <Users className="h-4 w-4" />
              ) : (
                <GraduationCap className="h-4 w-4" />
              )}
              {t === 'students' ? 'Students' : 'Staff'}
            </button>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative"
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'students' ? 'Search students…' : 'Search staff or roles…'}
            className="placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-primary/20 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-9 pl-10 text-sm transition-all outline-none focus:ring-1"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>

        {/* Staff section filter */}
        <AnimatePresence>
          {tab === 'staff' && sections.length > 1 && (
            <motion.div
              key="section-filter"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-1.5 overflow-hidden"
            >
              {sectionNames.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSection(s)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-all',
                    selectedSection === s
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground border-white/10 hover:border-white/20'
                  )}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/*  Content  */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-20"
            >
              <Loader2 className="h-7 w-7 animate-spin opacity-40" />
              <p className="text-sm">Loading…</p>
            </motion.div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-20"
            >
              <p className="text-destructive text-sm">{error}</p>
              <button
                onClick={() => (tab === 'students' ? fetchStudents() : fetchStaff())}
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                Try again
              </button>
            </motion.div>
          )}

          {/* Students */}
          {!loading && !error && tab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {filteredStudents.length === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-sm">
                  No students found.
                </p>
              ) : (
                filteredStudents.map((s, i) => (
                  <StudentCard key={s.email ?? s.name} student={s} index={i} />
                ))
              )}
            </motion.div>
          )}

          {/* Staff */}
          {!loading && !error && tab === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {filteredSections.length === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-sm">No staff found.</p>
              ) : (
                filteredSections.map((sec) => (
                  <div key={sec.section}>
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                        {sec.section}
                      </p>
                      <span className="text-muted-foreground/50 text-[10px]">
                        ({sec.members.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sec.members.map((m, i) => (
                        <StaffCard key={m.email ?? m.name} member={m} index={i} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
