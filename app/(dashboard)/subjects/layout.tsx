import './subjects.css';

import { SubjectMotion } from '@/components/subjects/SubjectMotion';

export default function SubjectsLayout({ children }: { children: React.ReactNode }) {
  return <SubjectMotion>{children}</SubjectMotion>;
}
