'use client';

import { useId } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useReducedMotion } from 'framer-motion';

import type { WidgetId, WidgetInstance, WidgetSize } from '@/lib/widgets/types';

import CountdownWidget from './CountdownWidget';
import HomeworkWidget from './HomeworkWidget';
import LunchWidget from './LunchWidget';
import MessagesWidget from './MessagesWidget';
import NewsWidget from './NewsWidget';
import NotesWidget from './NotesWidget';
import ScheduleWidget, { NextLessonWidget } from './ScheduleWidget';
import { BookingsWidget, ResultsWidget } from './SchoolUpdatesWidgets';
import ShortcutsWidget from './ShortcutsWidget';
import WeatherWidget from './WeatherWidget';
import { WidgetShell } from './WidgetShell';

const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType<{ size: WidgetSize }>> = {
  homework: HomeworkWidget,
  schedule: ScheduleWidget,
  notes: NotesWidget,
  lunch: LunchWidget,
  news: NewsWidget,
  weather: WeatherWidget,
  countdown: CountdownWidget,
  messages: MessagesWidget,
  'next-lesson': NextLessonWidget,
  results: ResultsWidget,
  bookings: BookingsWidget,
  shortcuts: ShortcutsWidget,
};

interface Props {
  widgets: WidgetInstance[];
  editing: boolean;
  onReorder: (widgets: WidgetInstance[]) => void;
  onResize: (instanceId: string, size: WidgetSize) => void;
  onRemove: (instanceId: string) => void;
  onToggleHighlight: (instanceId: string) => void;
}

export function DashboardGrid({
  widgets,
  editing,
  onReorder,
  onResize,
  onRemove,
  onToggleHighlight,
}: Props) {
  const id = useId();
  const reducedMotion = useReducedMotion() === true;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = widgets.findIndex((widget) => widget.instanceId === active.id);
    const to = widgets.findIndex((widget) => widget.instanceId === over.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(widgets, from, to));
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map((widget) => widget.instanceId)}
        strategy={rectSortingStrategy}
      >
        <div className="dashboardGrid">
          {widgets.map((instance, index) => {
            const Component = WIDGET_COMPONENTS[instance.widgetId];
            return (
              <WidgetShell
                key={instance.instanceId}
                instance={instance}
                editing={editing}
                first={index === 0}
                last={index === widgets.length - 1}
                reducedMotion={reducedMotion}
                onMoveFirst={() => onReorder(arrayMove(widgets, index, 0))}
                onMove={(offset) => onReorder(arrayMove(widgets, index, index + offset))}
                onResize={onResize}
                onRemove={onRemove}
                onToggleHighlight={onToggleHighlight}
              >
                <Component size={instance.size} />
              </WidgetShell>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
